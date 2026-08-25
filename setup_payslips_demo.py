"""
setup_payslips_demo.py - Setup demo employees and link to users for payslip testing
"""
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

# Load environment
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/hr_offer_letters')
client = MongoClient(MONGO_URI)
db = client.hr_offer_letters

print("=" * 70)
print("  Payslip Module - Demo Setup")
print("=" * 70)

# Get existing users
users = {
    'admin': db.users.find_one({'email': 'admin@company.com'}),
    'hr': db.users.find_one({'email': 'hr@company.com'}),
    'manager': db.users.find_one({'email': 'manager@company.com'}),
    'hrhead': db.users.find_one({'email': 'hrhead@company.com'}),
}

print("\n📋 Existing users:")
for role, user in users.items():
    if user:
        emp_ref = user.get('employee_ref', 'NOT SET')
        print(f"  ✅ {role:10} ({user['email']:20}) -> employee_ref: {emp_ref}")
    else:
        print(f"  ❌ {role:10} - NOT FOUND")

# Check existing employees
emps = list(db.employees.find({}).limit(5))
print(f"\n📋 Existing employees (showing {len(emps)} of {db.employees.count_documents({})}):")
for emp in emps:
    print(f"  - {emp.get('name'):20} (ID: {emp['_id']}, Manager: {emp.get('manager_id', 'None')})")

print("\n" + "=" * 70)
print("  NEXT STEPS:")
print("=" * 70)
print("""
1. If users don't have employee_ref, create employees and link them:

   # You'll need to manually:
   - Create employees for each user role via the Employees page
   - Update users with employee_ref in MongoDB
   
2. Restart the backend:
   cd backend && python app.py
   
3. Refresh the frontend and try the payslips module:
   - Navigate to /payslip (employees)
   - Navigate to /payslip-management (HR/Managers)
   
4. Create a test payslip:
   - Login as HR or HR Head
   - Go to Payslip Management
   - Click "+ Create Payslip"
   - Select an employee
   - Enter salary details
   - Click "Create Payslip"

5. Approve and release:
   - Login as HR Head and approve the payslip
   - Login as HR and release it
   - Login as employee and view it

""")

print("=" * 70)
print("  Database Setup Summary:")
print("=" * 70)
print(f"  Payslips collection: {db.payslips.count_documents({})} documents")
print(f"  Employees: {db.employees.count_documents({})} total")
print(f"  Users: {db.users.count_documents({})} total")
print("=" * 70)
