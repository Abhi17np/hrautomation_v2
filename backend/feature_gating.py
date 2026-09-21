"""
feature_gating.py — subscription-plan scaffold: plan tiers, seat limits,
and feature flags. No payment gateway is wired (per product decision) —
this is the data model and enforcement mechanism a real billing
integration (Razorpay/Stripe) would plug into later.

Every tenant gets a `subscription` object (companies.subscription)
referencing a `plans` doc by tier key. `plans` is platform-level data
(seeded once, managed by platform admins in routes/platform.py).
"""
from datetime import datetime, timedelta

DEFAULT_PLANS = [
    {
        'key': 'starter', 'name': 'Starter', 'seat_limit': 25, 'price_monthly': 0,
        'features': [],
    },
    {
        'key': 'pro', 'name': 'Pro', 'seat_limit': 200, 'price_monthly': 4999,
        'features': ['feature.payroll_runs', 'feature.custom_workflows', 'feature.custom_roles'],
    },
    {
        'key': 'enterprise', 'name': 'Enterprise', 'seat_limit': None, 'price_monthly': None,
        'features': ['feature.payroll_runs', 'feature.custom_workflows', 'feature.custom_roles',
                     'feature.audit_log', 'feature.api_access'],
    },
]

TRIAL_DAYS = 14


def seed_default_plans(db):
    """`db` must be the raw/unscoped app db — plans aren't tenant data.
    Idempotent — only inserts plans that don't already exist by key."""
    now = datetime.utcnow()
    for plan in DEFAULT_PLANS:
        if db.plans.find_one({'key': plan['key']}):
            continue
        db.plans.insert_one({**plan, 'is_active': True, 'created_at': now, 'updated_at': now})


def default_subscription(tier='starter'):
    now = datetime.utcnow()
    return {
        'tier': tier, 'seat_limit': None, 'billing_status': 'trial',
        'trial_ends_at': now + timedelta(days=TRIAL_DAYS),
        'current_period_end': None, 'feature_overrides': [],
    }


def get_plan(db, tier_key):
    return db.plans.find_one({'key': tier_key})


def company_features(db, company):
    """`db` must be the raw/unscoped app db (plans aren't tenant-scoped).
    Returns the set of feature keys this company's plan unlocks."""
    sub = (company or {}).get('subscription') or {}
    plan = get_plan(db, sub.get('tier', 'starter'))
    features = set(plan.get('features', [])) if plan else set()
    features |= set(sub.get('feature_overrides') or [])
    return features


def seat_limit_for(db, company):
    sub = (company or {}).get('subscription') or {}
    if sub.get('seat_limit') is not None:
        return sub['seat_limit']
    plan = get_plan(db, sub.get('tier', 'starter'))
    return plan.get('seat_limit') if plan else None


def active_user_count(scoped_db):
    return scoped_db.users.count_documents({'is_active': {'$ne': False}})


class SeatLimitExceeded(ValueError):
    pass


class FeatureNotAvailable(ValueError):
    pass


def check_seat_limit(raw_db, scoped_db, tenant_id, company):
    limit = seat_limit_for(raw_db, company)
    if limit is None:
        return
    if active_user_count(scoped_db) >= limit:
        raise SeatLimitExceeded(
            f"This plan's seat limit ({limit} active users) has been reached. "
            "Deactivate an unused account or upgrade the plan to add more."
        )


def require_feature_key(raw_db, company, feature_key):
    if feature_key not in company_features(raw_db, company):
        raise FeatureNotAvailable(f"'{feature_key}' is not available on this plan.")
