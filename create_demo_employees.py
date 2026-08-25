"""
Create demo employees for demo users and link them
"""
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import uuid

load_dotenv(os.path.join('backend', '.env'))

print("=" * 80)
print("  CREATE DEMO EMPLOYEES FOR TESTING")
print("=" * 80)

try:
    client = MongoClient(os.getenv('MONGO_URI'))
    db = client.hr_offer_letters
    
    # Get all users and their roles
    users = list(db.users.find({}))
    print(f"\nFound {len(users)} users:")
    for user in users:
        role = user.get('role', 'unknown')
        email = user.get('email', 'no-email')
        has_emp_ref = bool(user.get('employee_ref'))
        status = "✅ linked" if has_emp_ref else "⚠️  not linked"
        print(f"  {status} | {email:30} | Role: {role:10}")
    
    print("\n" + "=" * 80)
    print("  CREATING DEMO EMPLOYEES")
    print("=" * 80)
    
    # Create employee for each user that doesn't have one
    created_count = 0
    linked_count = 0
    
    for user in users:
        if user.get('employee_ref'):
            print(f"✅ Already linked: {user.get('email')}")
            continue
        
        # Create a new employee record for this user
        emp_data = {
            'name': user.get('name', 'Demo Employee'),
            'email': user.get('email'),
            'employee_id': f"EMP-{str(uuid.uuid4())[:8].upper()}",
            'phone': '9876543210',
            'designation': 'Senior ' + user.get('role', 'Employee').replace('_', ' ').title(),
            'department': 'IT',
            'status': 'active',
            'date_of_joining': datetime(2020, 1, 1),
            'manager_id': None,
            'is_manager': user.get('role') in ('manager', 'hr_head', 'hr', 'admin'),
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
        }
        
        # If user is manager/hr, set as manager for subordinates
        if user.get('role') in ('manager', 'hr_head', 'hr', 'admin'):
            emp_data['is_manager'] = True
        
        # Insert employee
        result = db.employees.insert_one(emp_data)
        emp_id = result.inserted_id
        
        # Link user to employee (employee_ref is stored as string in schema)
        db.users.update_one(
            {'_id': user['_id']},
            {'$set': {'employee_ref': str(emp_id)}}
        )
        
        created_count += 1
        linked_count += 1
        
        print(f"✅ Created & Linked: {user.get('email'):30} → {emp_data['employee_id']} ({emp_data['designation']})")
    
    print("\n" + "=" * 80)
    print("  SUMMARY")
    print("=" * 80)
    print(f"✅ Employees created: {created_count}")
    print(f"✅ Users linked: {linked_count}")
    
    # Verify final state
    total_linked = db.users.count_documents({'employee_ref': {'$exists': True, '$ne': None}})
    total_employees = db.employees.count_documents({})
    
    print(f"\n🔍 FINAL STATE:")
    print(f"   Total users: {db.users.count_documents({})}")
    print(f"   Total employees: {total_employees}")
    print(f"   Users linked to employees: {total_linked}")
    
    if total_linked == db.users.count_documents({}):
        print(f"\n✅ SUCCESS: ALL USERS ARE NOW LINKED AND READY TO USE PAYSLIPS!")
    
    print("\n" + "=" * 80)
    print("  NEXT STEPS")
    print("=" * 80)
    print("1. ✅ Backend is running")
    print("2. ✅ Employees created and linked to users")
    print("3. Go to browser and refresh: Ctrl+Shift+Delete (clear cache)")
    print("4. Navigate to Payslips → Create a test payslip")
    print("5. Approve it as HR Head")
    print("6. Release it as HR")
    print("7. View it as Employee")
    print("\n" + "=" * 80)
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
