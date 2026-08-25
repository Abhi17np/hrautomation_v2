import os
from dotenv import load_dotenv
load_dotenv(os.path.join('backend', '.env'))
from pymongo import MongoClient

client = MongoClient(os.getenv('MONGO_URI'))
db = client.hr_offer_letters

# Check users with employee_ref
users = list(db.users.find({'employee_ref': {'$exists': True, '$ne': None}}))
print('✅ Users with employee_ref:')
for u in users:
    print(f"  - {u.get('email')}: {u.get('employee_ref')}")

if not users:
    print("  (none found)")

# Check total employees
emp_count = db.employees.count_documents({})
print(f'\n✅ Total employees: {emp_count}')

# Show a sample employee
emp = db.employees.find_one({})
if emp:
    print(f'\n✅ Sample employee:')
    print(f"  - Name: {emp.get('name')}")
    print(f"  - ID: {emp['_id']}")
    print(f"  - Employee Code: {emp.get('employee_id')}")
    print(f"  - Manager ID: {emp.get('manager_id')}")

# Check payslips
ps_count = db.payslips.count_documents({})
print(f'\n✅ Total payslips: {ps_count}')

print('\n✅ Database check complete!')
