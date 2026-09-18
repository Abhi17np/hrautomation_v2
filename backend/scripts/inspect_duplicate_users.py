"""
inspect_duplicate_users.py — for each duplicated (tenant_id, email) pair in
`users`, shows the linked employee record plus how much other data
(letters, payslips, leave_requests, documents) references that employee —
so you can tell which copy is the one actually in use before deleting the
other. Read-only — makes no changes.

Usage:
    cd backend
    python scripts/inspect_duplicate_users.py
"""
import os
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from bson import ObjectId  # noqa: E402
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


def describe_employee(db, emp_ref):
    if not emp_ref:
        return "  (no employee_ref on this user)"
    try:
        emp = db.employees.find_one({'_id': ObjectId(emp_ref)})
    except Exception:
        return f"  employee_ref={emp_ref!r} — not a valid ObjectId"
    if not emp:
        return f"  employee_ref={emp_ref!r} — NOT FOUND (dangling reference)"

    eid = str(emp['_id'])
    counts = {
        'letters':        db.letters.count_documents({'employee_id': eid}),
        'payslips':       db.payslips.count_documents({'employee_id': eid}),
        'leave_requests': db.leave_requests.count_documents({'employee_id': eid}),
        'documents':      db.documents.count_documents({'user_id': eid}),
        'appointment_orders': db.appointment_orders.count_documents({'employee_id': eid}),
    }
    lines = [
        f"  employee: name={emp.get('name')!r}  employee_id={emp.get('employee_id')!r}  "
        f"status={emp.get('status')!r}  designation={emp.get('designation')!r}",
        f"  linked data: " + ", ".join(f"{k}={v}" for k, v in counts.items()),
    ]
    return "\n".join(lines)


def main():
    db = get_db()
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
        print("\nNo duplicate (tenant_id, email) pairs found in users.\n")
        return

    for d in dupes:
        email = d['_id']['email']
        print("\n" + "=" * 70)
        print(f"  {email!r} — {d['count']} copies")
        print("=" * 70)
        for uid in d['ids']:
            u = db.users.find_one({'_id': uid})
            print(f"\nuser _id={u['_id']}  role={u.get('role')}  created_at={u.get('created_at')}")
            print(describe_employee(db, u.get('employee_ref')))
    print()


if __name__ == '__main__':
    sys.exit(main())
