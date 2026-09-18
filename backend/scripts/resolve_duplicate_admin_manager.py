"""
resolve_duplicate_admin_manager.py — ONE-OFF cleanup for this specific
duplicate-account situation found via find_duplicate_users.py /
inspect_duplicate_users.py:

  - admin@company.com:   keep the newer copy, delete the older (both empty)
  - manager@company.com: keep the newer copy (has a proper employee_id),
                          delete the older copy + its employee record +
                          the 1 leave_request that pointed at it

Prints exactly what it's about to delete and asks for confirmation before
touching anything. Safe to re-run — if the target docs are already gone it
just says so and does nothing.

Usage:
    cd backend
    python scripts/resolve_duplicate_admin_manager.py
"""
import os
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from bson import ObjectId  # noqa: E402
from pymongo import MongoClient  # noqa: E402

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/hr_offer_letters')

# Exact IDs identified from this session's diagnostic output — do not reuse
# this script for a different duplicate situation without editing these.
DELETE_USER_IDS = [
    ObjectId('6a05c25ec59b90f6f5eb39e9'),  # old admin@company.com
    ObjectId('6a05c25ec59b90f6f5eb39ec'),  # old manager@company.com
]
DELETE_EMPLOYEE_IDS = [
    ObjectId('6a86e4d0f43dc8375b12aaf0'),  # old admin's employee record
    ObjectId('6a58ca816db10738af2518bf'),  # old manager's employee record
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


def main():
    db = get_db()

    print("\nThis will permanently delete:\n")

    to_delete_users = []
    for uid in DELETE_USER_IDS:
        u = db.users.find_one({'_id': uid})
        if u:
            to_delete_users.append(u)
            print(f"  user: {u.get('email')} (role={u.get('role')}, _id={uid})")
        else:
            print(f"  user _id={uid} — already gone, skipping")

    to_delete_employees = []
    for eid in DELETE_EMPLOYEE_IDS:
        e = db.employees.find_one({'_id': eid})
        if e:
            to_delete_employees.append(e)
            print(f"  employee: {e.get('name')} ({e.get('employee_id')}, _id={eid})")
        else:
            print(f"  employee _id={eid} — already gone, skipping")

    orphan_leave_requests = list(db.leave_requests.find({
        'employee_id': {'$in': [str(eid) for eid in DELETE_EMPLOYEE_IDS]}
    }))
    for lr in orphan_leave_requests:
        print(f"  leave_request: {lr.get('leave_type')} {lr.get('from_date')}-{lr.get('to_date')} "
              f"(status={lr.get('status')}, _id={lr['_id']})")

    if not to_delete_users and not to_delete_employees and not orphan_leave_requests:
        print("\nNothing to delete — already cleaned up.\n")
        return 0

    answer = input("\nType 'yes' to delete all of the above, anything else to cancel: ").strip().lower()
    if answer != 'yes':
        print("Cancelled — nothing was deleted.")
        return 1

    if to_delete_users:
        result = db.users.delete_many({'_id': {'$in': [u['_id'] for u in to_delete_users]}})
        print(f"Deleted {result.deleted_count} user(s).")
    if to_delete_employees:
        result = db.employees.delete_many({'_id': {'$in': [e['_id'] for e in to_delete_employees]}})
        print(f"Deleted {result.deleted_count} employee(s).")
    if orphan_leave_requests:
        result = db.leave_requests.delete_many({'_id': {'$in': [lr['_id'] for lr in orphan_leave_requests]}})
        print(f"Deleted {result.deleted_count} leave_request(s).")

    print("\nDone. Now re-run: python scripts\\backfill_tenant.py --slug infopace --name \"infopace management \"\n")
    return 0


if __name__ == '__main__':
    sys.exit(main())
