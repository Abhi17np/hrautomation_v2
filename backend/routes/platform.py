"""
platform.py — super-admin surface for provisioning tenants.

Platform admins are NOT tenant users: they're stored in a separate
`platform_admins` collection (unscoped — not tenant data) and authenticate
via /api/platform/login, which mints a JWT carrying additional_claims
{'scope': 'platform'} instead of a tenant_id. auth_utils.platform_admin_required
guards every route below and never sets g.tenant_id, so a platform token can
never be used against a tenant-scoped route (and vice versa) — see
auth_utils.py and tenant_scope.py docstrings.

Self-serve signup is explicitly out of scope for now (per product decision):
this blueprint is the only way a new company gets created, and it's meant to
be used by the SaaS operator, not customers.
"""
import re
from datetime import datetime

import bcrypt
from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, current_app, g, jsonify, request
from flask_jwt_extended import create_access_token

from auth_utils import platform_admin_required
from extensions import limiter
from roles_service import seed_system_roles
from feature_gating import seed_default_plans, default_subscription, get_plan, active_user_count, seat_limit_for

platform_bp = Blueprint('platform', __name__)

_SLUG_RE = re.compile(r'^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$')


def _serialize_company(c):
    sub = c.get('subscription') or {}
    return {
        'id':           str(c['_id']),
        'name':         c.get('name'),
        'slug':         c.get('slug'),
        'status':       c.get('status'),
        'plan':         c.get('plan'),
        'subscription': {
            'tier': sub.get('tier'), 'seat_limit': sub.get('seat_limit'),
            'billing_status': sub.get('billing_status'),
            'trial_ends_at': sub['trial_ends_at'].isoformat() if sub.get('trial_ends_at') else None,
            'current_period_end': sub['current_period_end'].isoformat() if sub.get('current_period_end') else None,
        },
        'contact_name':  c.get('contact_name'),
        'contact_email': c.get('contact_email'),
        'contact_phone': c.get('contact_phone'),
        'created_at':   c.get('created_at').isoformat() if c.get('created_at') else None,
    }


@platform_bp.route('/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    data = request.json or {}
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'email and password are required'}), 400
    db = current_app.db
    admin = db.platform_admins.find_one({'email': data['email']})
    if not admin or not bcrypt.checkpw(data['password'].encode(), admin['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    token = create_access_token(
        identity=str(admin['_id']),
        additional_claims={'scope': 'platform'},
    )
    return jsonify({
        'token': token,
        'admin': {'id': str(admin['_id']), 'email': admin['email'], 'name': admin.get('name')},
    })


@platform_bp.route('/companies', methods=['GET'])
@platform_admin_required
def list_companies():
    companies = current_app.db.companies.find({}).sort('created_at', -1)
    return jsonify([_serialize_company(c) for c in companies])


@platform_bp.route('/companies', methods=['POST'])
@platform_admin_required
def create_company():
    data = request.json or {}
    name           = (data.get('name') or '').strip()
    slug           = (data.get('slug') or '').strip().lower()
    admin_email    = (data.get('admin_email') or '').strip()
    admin_password = data.get('admin_password') or ''
    admin_name     = (data.get('admin_name') or '').strip()

    if not name or not slug or not admin_email or not admin_password or not admin_name:
        return jsonify({'error': 'name, slug, admin_name, admin_email and admin_password are required'}), 400
    if not _SLUG_RE.match(slug):
        return jsonify({'error': 'slug must be 3-32 lowercase letters/digits/hyphens, no leading/trailing hyphen'}), 400
    if len(admin_password) < 6:
        return jsonify({'error': 'admin_password must be at least 6 characters'}), 400

    db = current_app.db
    if db.companies.find_one({'slug': slug}):
        return jsonify({'error': 'A company with this slug already exists'}), 400

    seed_default_plans(db)
    now = datetime.utcnow()
    company_doc = {
        'name': name,
        'slug': slug,
        'status': 'active',
        'plan': data.get('plan', 'trial'),
        'subscription': default_subscription(data.get('tier', 'starter')),
        'contact_name':  data.get('contact_name'),
        'contact_email': data.get('contact_email'),
        'contact_phone': data.get('contact_phone'),
        'created_at': now,
        'updated_at': now,
    }
    company_id = db.companies.insert_one(company_doc).inserted_id
    tenant_id = str(company_id)

    # Pre-check must be tenant-scoped too — email uniqueness is per-tenant, not global.
    if db.users.find_one({'tenant_id': tenant_id, 'email': admin_email}):
        db.companies.delete_one({'_id': company_id})
        return jsonify({'error': 'Admin email already exists for this tenant'}), 400

    roles = seed_system_roles(db, tenant_id)
    admin_role = roles['admin']

    hashed = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt())
    db.users.insert_one({
        'tenant_id': tenant_id,
        'name': admin_name,
        'email': admin_email,
        'password': hashed,
        'role': 'admin',
        'role_id': str(admin_role['_id']),
        'role_key': admin_role['key'],
        'is_active': True,
        'created_at': now,
    })

    company_doc['_id'] = company_id
    return jsonify({'company': _serialize_company(company_doc)}), 201


@platform_bp.route('/companies/<company_id>', methods=['PUT'])
@platform_admin_required
def update_company(company_id):
    try:
        oid = ObjectId(company_id)
    except InvalidId:
        return jsonify({'error': 'Invalid company id'}), 400

    data = request.json or {}
    update = {}
    if 'status' in data:
        if data['status'] not in ('active', 'suspended', 'trial'):
            return jsonify({'error': "status must be one of 'active', 'suspended', 'trial'"}), 400
        update['status'] = data['status']
    if 'plan' in data:
        update['plan'] = data['plan']
    if 'branding' in data and isinstance(data['branding'], dict):
        update['branding'] = data['branding']
    if 'subscription_tier' in data:
        db = current_app.db
        if not get_plan(db, data['subscription_tier']):
            return jsonify({'error': f"Unknown plan tier '{data['subscription_tier']}'"}), 400
        update['subscription.tier'] = data['subscription_tier']
    if 'seat_limit' in data:
        update['subscription.seat_limit'] = data['seat_limit']
    if 'billing_status' in data:
        if data['billing_status'] not in ('trial', 'active', 'past_due', 'canceled'):
            return jsonify({'error': "billing_status must be one of trial/active/past_due/canceled"}), 400
        update['subscription.billing_status'] = data['billing_status']
    if not update:
        return jsonify({'error': 'Nothing to update'}), 400
    update['updated_at'] = datetime.utcnow()

    db = current_app.db
    result = db.companies.update_one({'_id': oid}, {'$set': update})
    if result.matched_count == 0:
        return jsonify({'error': 'Company not found'}), 404
    company = db.companies.find_one({'_id': oid})
    return jsonify({'company': _serialize_company(company)})


@platform_bp.route('/plans', methods=['GET'])
@platform_admin_required
def list_plans():
    db = current_app.db
    seed_default_plans(db)
    plans = list(db.plans.find({}).sort('price_monthly', 1))
    for p in plans:
        p['_id'] = str(p['_id'])
    return jsonify(plans)


@platform_bp.route('/companies/<company_id>/usage', methods=['GET'])
@platform_admin_required
def company_usage(company_id):
    try:
        oid = ObjectId(company_id)
    except InvalidId:
        return jsonify({'error': 'Invalid company id'}), 400
    db = current_app.db
    company = db.companies.find_one({'_id': oid})
    if not company:
        return jsonify({'error': 'Company not found'}), 404
    tenant_id = str(oid)

    from datetime import timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    return jsonify({
        'active_users': db.users.count_documents({'tenant_id': tenant_id, 'is_active': {'$ne': False}}),
        'seat_limit': seat_limit_for(db, company),
        'employee_count': db.employees.count_documents({'tenant_id': tenant_id}),
        'audit_events_last_30d': db.audit_log.count_documents({'tenant_id': tenant_id, 'created_at': {'$gte': thirty_days_ago}}),
        'letters_last_30d': db.letters.count_documents({'tenant_id': tenant_id, 'created_at': {'$gte': thirty_days_ago}}),
        'payroll_runs_last_30d': db.payroll_runs.count_documents({'tenant_id': tenant_id, 'created_at': {'$gte': thirty_days_ago}}),
    })


@platform_bp.route('/companies/<company_id>/impersonate', methods=['POST'])
@platform_admin_required
def impersonate_company(company_id):
    """Mints a tenant JWT for the company's first admin user, for support
    investigation. Logged in BOTH the platform admin's action context and
    the tenant's own audit log, so the tenant can always see this
    happened."""
    try:
        oid = ObjectId(company_id)
    except InvalidId:
        return jsonify({'error': 'Invalid company id'}), 400
    db = current_app.db
    company = db.companies.find_one({'_id': oid})
    if not company:
        return jsonify({'error': 'Company not found'}), 404
    tenant_id = str(oid)

    admin_user = db.users.find_one({'tenant_id': tenant_id, 'role': 'admin', 'is_active': {'$ne': False}})
    if not admin_user:
        return jsonify({'error': 'No active admin user found for this company'}), 404

    token = create_access_token(
        identity=str(admin_user['_id']),
        additional_claims={'tenant_id': tenant_id, 'role': admin_user['role'], 'impersonated_by': str(g.platform_admin['_id'])},
    )
    from audit import log_audit
    log_audit(db, tenant_id, None, 'platform.impersonation_started', entity_type='user', entity_id=admin_user['_id'],
              details={'platform_admin_email': g.platform_admin.get('email')})
    return jsonify({'token': token, 'user_email': admin_user['email']})


@platform_bp.route('/companies/<company_id>/export', methods=['GET'])
@platform_admin_required
def export_company(company_id):
    """A bounded JSON export of a tenant's core data — for offboarding or
    a data-access request. Not a full backup (skips generated documents/
    GridFS binaries); those are recoverable from the underlying files if
    ever needed."""
    try:
        oid = ObjectId(company_id)
    except InvalidId:
        return jsonify({'error': 'Invalid company id'}), 400
    db = current_app.db
    company = db.companies.find_one({'_id': oid})
    if not company:
        return jsonify({'error': 'Company not found'}), 404
    tenant_id = str(oid)

    def _dump(coll_name, projection=None):
        docs = list(db[coll_name].find({'tenant_id': tenant_id}, projection))
        for d in docs:
            d['_id'] = str(d['_id'])
        return docs

    export = {
        'company': _serialize_company(company),
        'users': _dump('users', {'password': 0}),
        'employees': _dump('employees'),
        'letters': _dump('letters', {'docx_path': 0, 'pdf_path': 0}),
        'payslips': _dump('payslips'),
        'leave_requests': _dump('leave_requests'),
    }
    from audit import log_audit
    log_audit(db, tenant_id, None, 'platform.data_exported', details={'platform_admin_email': g.platform_admin.get('email')})
    return jsonify(export)
