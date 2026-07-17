"""
diagnose_manager_link.py
Run this from your backend/ folder (same place as app.py):

    python diagnose_manager_link.py

It prints out the manager_id linkage for every employee, and every manager's
employee_ref, so we can spot exactly where the mismatch is for puneeth ↔
Dept Manager. Read-only — makes no changes to your database.
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.environ.get('MONGO_URI'))
db = client.get_default_database()

print("=" * 70)
print("USERS with role='manager'")
print("=" * 70)
for u in db.users.find({'role': 'manager'}):
    print(f"  name={u.get('name')!r:20} username={u.get('username')!r:15} "
          f"employee_ref={u.get('employee_ref')!r} (type={type(u.get('employee_ref')).__name__})")

print()
print("=" * 70)
print("EMPLOYEES (name, _id, manager_id, manager_name)")
print("=" * 70)
for e in db.employees.find({}):
    print(f"  name={e.get('name')!r:20} _id={str(e['_id'])!r} "
          f"manager_id={e.get('manager_id')!r} (type={type(e.get('manager_id')).__name__}) "
          f"manager_name={e.get('manager_name')!r}")

print()
print("=" * 70)
print("PENDING leave_requests (employee_id, status)")
print("=" * 70)
for r in db.leave_requests.find({'status': 'pending_manager'}):
    emp = db.employees.find_one({'_id': __import__('bson').ObjectId(r['employee_id'])})
    mgr_id_display = emp.get('manager_id') if emp else 'EMPLOYEE NOT FOUND'
    print(f"  request employee_id={r['employee_id']!r} (type=str) "
          f"-> employee.manager_id={mgr_id_display!r}")

print()
print("If a manager's employee_ref (top block) does not EXACTLY match the")
print("manager_id on the employee who applied (bottom block) — same string,")
print("same type — that's the mismatch. Common causes: manager_id stored as")
print("an ObjectId instead of a string, or set to the manager's name/employee")
print("code instead of their _id, or simply pointing at a different manager")
print("account than the one you're testing with.")