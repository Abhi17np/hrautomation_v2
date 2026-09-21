"""
scripts/backfill_roles.py — one-time migration for tenants created before
the `roles` collection existed.

For every company:
  1. Seed the 5 system roles (idempotent — skips ones that already exist).
  2. For every user missing role_id, resolve it from their legacy `role`
     string and backfill role_id/role_key.

Purely additive — never touches `users.role`, `letters`, `appointment_orders`,
or `employees`. Safe to re-run.

Usage:
    cd backend
    python scripts/backfill_roles.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from pymongo import MongoClient

from roles_service import seed_system_roles, resolve_role

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/hr_offer_letters')


def run():
    client = MongoClient(MONGO_URI)
    db_name = "hr_offer_letters"
    if "/" in MONGO_URI:
        part = MONGO_URI.split("/")[-1].split("?")[0].strip()
        if part:
            db_name = part
    db = client[db_name]

    companies = list(db.companies.find({}))
    print(f"Found {len(companies)} companies.")

    for company in companies:
        tenant_id = str(company['_id'])
        print(f"\n[{company.get('name', tenant_id)}] seeding system roles...")
        seed_system_roles(db, tenant_id)

        users = list(db.users.find({'tenant_id': tenant_id, 'role_id': {'$exists': False}}))
        print(f"  {len(users)} user(s) missing role_id")
        for u in users:
            role = resolve_role(db, tenant_id, role_key=u.get('role'))
            if not role:
                print(f"  ⚠️  user {u.get('email')} has unrecognized role '{u.get('role')}' — skipped")
                continue
            db.users.update_one(
                {'_id': u['_id']},
                {'$set': {'role_id': str(role['_id']), 'role_key': role['key']}}
            )
        print(f"  ✅ done")

    print("\nBackfill complete.")


if __name__ == '__main__':
    run()
