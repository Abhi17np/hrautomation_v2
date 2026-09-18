"""
find_duplicate_users.py — diagnostic: lists any (tenant_id, email) pairs in
`users` that appear more than once. Run this after a backfill_tenant.py run
fails with a DuplicateKeyError on idx_users_tenant_email_unique (or the
equivalent for employees.employee_id) to see exactly what needs cleaning up
before re-running the index conversion. Read-only — makes no changes.

Usage:
    cd backend
    python scripts/find_duplicate_users.py
"""
import os
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from pymongo import MongoClient  # noqa: E402

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/hr_offer_letters')


def get_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
    client.admin.command('ping')
    db_name = 'hr_offer_letters'
    if '/' in MONGO_URI:
        part = MONGO_URI.split('/')[-1].split('?')[0].strip()
        if part:
            db_name = part
    return client[db_name]


def main():
    db = get_db()

    print("\n" + "=" * 70)
    print("  Duplicate users (same tenant_id + email)")
    print("=" * 70)

    pipeline = [
        {'$group': {
            '_id': {'tenant_id': '$tenant_id', 'email': '$email'},
            'count': {'$sum': 1},
            'ids': {'$push': '$_id'},
        }},
        {'$match': {'count': {'$gt': 1}}},
    ]
    dupes = list(db.users.aggregate(pipeline))

    if not dupes:
        print("\n  No duplicate (tenant_id, email) pairs found in users.\n")
    else:
        for d in dupes:
            email = d['_id']['email']
            tenant_id = d['_id']['tenant_id']
            print(f"\n  {email!r}  (tenant_id={tenant_id!r})  — {d['count']} copies:")
            for uid in d['ids']:
                u = db.users.find_one({'_id': uid})
                print(f"    _id={u['_id']}  role={u.get('role')}  "
                      f"employee_ref={u.get('employee_ref')}  "
                      f"is_active={u.get('is_active')}  "
                      f"created_at={u.get('created_at')}")

    print("\n" + "=" * 70)
    print("  Duplicate employees (same tenant_id + employee_id)")
    print("=" * 70)

    pipeline2 = [
        {'$group': {
            '_id': {'tenant_id': '$tenant_id', 'employee_id': '$employee_id'},
            'count': {'$sum': 1},
            'ids': {'$push': '$_id'},
        }},
        {'$match': {'count': {'$gt': 1}}},
    ]
    dupes2 = list(db.employees.aggregate(pipeline2))

    if not dupes2:
        print("\n  No duplicate (tenant_id, employee_id) pairs found in employees.\n")
    else:
        for d in dupes2:
            emp_code = d['_id']['employee_id']
            tenant_id = d['_id']['tenant_id']
            print(f"\n  {emp_code!r}  (tenant_id={tenant_id!r})  — {d['count']} copies:")
            for eid in d['ids']:
                e = db.employees.find_one({'_id': eid})
                print(f"    _id={e['_id']}  name={e.get('name')}  "
                      f"status={e.get('status')}  created_at={e.get('created_at')}")

    print()


if __name__ == '__main__':
    sys.exit(main())
