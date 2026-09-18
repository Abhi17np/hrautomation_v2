"""
backfill_tenant.py — one-off migration: turn the current single-company
dataset into "tenant zero" of a multi-tenant deployment.

Run ONCE, after `python db_init.py` has created the `companies` collection:

    cd backend
    python scripts/backfill_tenant.py [--slug infopace] [--name "Infopace India"]

What it does:
    1. Creates (or reuses) one `companies` document for the existing data.
    2. Backfills tenant_id onto every document in every known collection
       that doesn't already have one.
    3. Migrates the legacy global employee-id counter doc (`_id: 'employee'`)
       to the new per-tenant shape (`name: 'employee_id', tenant_id: ...`).
    4. Drops the old *global* unique indexes on users.email and
       employees.employee_id, and creates their tenant-scoped compound
       replacements (idx_users_tenant_email_unique /
       idx_employees_tenant_empid_unique) — needed so a second tenant can
       reuse an email or the EMP001... sequence without colliding.

Idempotent: safe to re-run. Does NOT set tenant_id to required in the
schema validators (that happens later, after routes are converted and the
cross-tenant leak test passes — see plan §4/§8).
"""

import argparse
import os
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from pymongo import MongoClient  # noqa: E402
from datetime import datetime  # noqa: E402

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/hr_offer_letters')

# Every collection currently in use by the app (8 declared in db_init.py's
# original schema set + 6 runtime-only collections + 3 more used only by
# services/essl_sync.py) — all need tenant_id backfilled.
ALL_COLLECTIONS = [
    'users', 'employees', 'templates', 'letters', 'appointment_orders',
    'exit_records', 'documents', 'doc_submissions', 'payslips',
    'leave_requests', 'leave_balances', 'leave_notifications',
    'attendance_daily', 'holidays', 'counters',
    'scheduler_log', 'sync_state', 'attendance_punches',
]


def get_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
    client.admin.command('ping')
    db_name = 'hr_offer_letters'
    if '/' in MONGO_URI:
        part = MONGO_URI.split('/')[-1].split('?')[0].strip()
        if part:
            db_name = part
    return client[db_name]


def ensure_tenant_zero(db, slug, name):
    existing = db.companies.find_one({'slug': slug})
    if existing:
        print(f"   ⏭️  companies.slug={slug!r} already exists — reusing (_id={existing['_id']})")
        return str(existing['_id'])
    doc = {
        'name': name,
        'slug': slug,
        'status': 'active',
        'plan': 'legacy',
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }
    result = db.companies.insert_one(doc)
    print(f"   ✅ created companies.slug={slug!r} (_id={result.inserted_id})")
    return str(result.inserted_id)


def backfill_collections(db, tenant_id):
    print("\n📦 Backfilling tenant_id onto existing documents...")
    for name in ALL_COLLECTIONS:
        coll = db[name]
        result = coll.update_many(
            {'tenant_id': {'$exists': False}},
            {'$set': {'tenant_id': tenant_id}},
        )
        if result.modified_count:
            print(f"   ✅ {name:25s} — {result.modified_count} document(s) updated")
        else:
            print(f"   ⏭️  {name:25s} — nothing to update")


def migrate_employee_counter(db, tenant_id):
    print("\n🔢 Migrating employee-id counter to per-tenant shape...")
    legacy = db.counters.find_one({'_id': 'employee'})
    already = db.counters.find_one({'tenant_id': tenant_id, 'name': 'employee_id'})
    if already:
        print("   ⏭️  per-tenant counter already exists — skipped")
        return
    if legacy:
        db.counters.insert_one({
            'tenant_id': tenant_id,
            'name': 'employee_id',
            'seq': legacy.get('seq', 0),
        })
        db.counters.delete_one({'_id': 'employee'})
        print(f"   ✅ migrated legacy counter (seq={legacy.get('seq', 0)}) to tenant {tenant_id}")
        return
    # No legacy counter and no employees yet — nothing to migrate, _next_emp_id
    # will upsert a fresh one on first use.
    print("   ⏭️  no legacy counter found — nothing to migrate")


def convert_unique_indexes(db):
    print("\n🔍 Converting global unique indexes to tenant-scoped compound indexes...")
    conversions = [
        ('users', 'idx_users_email_unique',
         [('tenant_id', 1), ('email', 1)], 'idx_users_tenant_email_unique'),
        ('employees', 'idx_employees_emp_id_unique',
         [('tenant_id', 1), ('employee_id', 1)], 'idx_employees_tenant_empid_unique'),
        ('counters', 'idx_counters_name_unique',
         [('tenant_id', 1), ('name', 1)], 'idx_counters_tenant_name_unique'),
    ]
    for coll_name, old_name, new_keys, new_name in conversions:
        coll = db[coll_name]
        existing_names = {idx['name'] for idx in coll.list_indexes()}
        if old_name in existing_names:
            coll.drop_index(old_name)
            print(f"   ✅ {coll_name}.{old_name} — dropped (was global-unique)")
        else:
            print(f"   ⏭️  {coll_name}.{old_name} — not present, nothing to drop")
        if new_name not in existing_names:
            coll.create_index(new_keys, unique=True, name=new_name)
            print(f"   ✅ {coll_name}.{new_name} — created")
        else:
            print(f"   ⏭️  {coll_name}.{new_name} — already exists")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--slug', default='infopace', help="Tenant-zero company slug (used at login)")
    parser.add_argument('--name', default='Infopace India', help="Tenant-zero company display name")
    args = parser.parse_args()

    print("\n" + "=" * 60)
    print("  Tenant-Zero Backfill")
    print("=" * 60)

    db = get_db()

    print("\n🏢 Ensuring tenant-zero company document...")
    tenant_id = ensure_tenant_zero(db, args.slug, args.name)

    backfill_collections(db, tenant_id)
    migrate_employee_counter(db, tenant_id)
    convert_unique_indexes(db)

    print("\n" + "=" * 60)
    print("  ✅ Backfill complete")
    print("=" * 60)
    print(f"\n   Tenant zero: slug={args.slug!r}  tenant_id={tenant_id}")
    print("   Existing users can now log in with this company code.\n")


if __name__ == '__main__':
    sys.exit(main())
