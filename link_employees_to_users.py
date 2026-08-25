"""
Link employees to users via employee_ref field
This script finds employees and their corresponding users, then links them.
"""
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

load_dotenv(os.path.join('backend', '.env'))

print("=" * 80)
print("  EMPLOYEE-USER LINKING SETUP")
print("=" * 80)

try:
    client = MongoClient(os.getenv('MONGO_URI'))
    db = client.hr_offer_letters
    
    # Get all employees
    employees = list(db.employees.find({}))
    print(f"\nFound {len(employees)} employees in database")
    
    # Get all users
    users = list(db.users.find({}))
    print(f"Found {len(users)} users in database")
    
    # Strategy: Link by email matching
    # For each employee, try to find a user with matching email
    
    linked_count = 0
    already_linked = 0
    not_found = []
    
    print("\n" + "=" * 80)
    print("  LINKING EMPLOYEES TO USERS")
    print("=" * 80)
    
    for emp in employees:
        emp_id = emp.get('_id')
        emp_name = emp.get('name')
        emp_email = emp.get('email')
        
        # Check if employee already has a linked user
        user_with_ref = db.users.find_one({'employee_ref': emp_id})
        if user_with_ref:
            already_linked += 1
            print(f"✅ Already linked: {emp_name} ({emp_email}) → {user_with_ref.get('email')}")
            continue
        
        # Try to find user by email
        if emp_email:
            user = db.users.find_one({'email': emp_email})
            if user and not user.get('employee_ref'):
                # Link the user to this employee
                db.users.update_one(
                    {'_id': user['_id']},
                    {'$set': {'employee_ref': emp_id}}
                )
                linked_count += 1
                print(f"✅ Linked: {emp_name} ({emp_email}) → User {user.get('name', 'Unknown')}")
            elif user and user.get('employee_ref'):
                already_linked += 1
                print(f"✅ Already linked: {emp_name} ({emp_email})")
            else:
                not_found.append((emp_name, emp_email))
                print(f"⚠️  No user found for: {emp_name} ({emp_email})")
        else:
            not_found.append((emp_name, "no email"))
            print(f"⚠️  Employee has no email: {emp_name}")
    
    print("\n" + "=" * 80)
    print("  LINKING SUMMARY")
    print("=" * 80)
    print(f"\n✅ Newly linked: {linked_count}")
    print(f"✅ Already linked: {already_linked}")
    print(f"⚠️  Not found/No email: {len(not_found)}")
    
    # Verify final state
    total_linked = db.users.count_documents({'employee_ref': {'$exists': True, '$ne': None}})
    print(f"\n🔍 FINAL STATE: {total_linked} users linked to employees\n")
    
    if not_found:
        print("❌ Employees without matching users:")
        for name, email in not_found[:10]:  # Show first 10
            print(f"   - {name} ({email})")
        if len(not_found) > 10:
            print(f"   ... and {len(not_found) - 10} more")
    
    print("\n" + "=" * 80)
    
    if linked_count > 0:
        print(f"\n✅ SUCCESS: {linked_count} new employee-user links created!")
    
    if total_linked > 0:
        print(f"✅ Ready to use: {total_linked} users can now use payslip module")
    else:
        print("❌ WARNING: No users are linked to employees!")
        print("   Users need employee_ref set to use the payslip module")
        print("\n   Option 1: Create employees and users via UI")
        print("   Option 2: Manually link via MongoDB:")
        print('      db.users.updateOne({email:"user@company.com"}, {$set:{employee_ref:ObjectId("...")}})')
    
    print("\n" + "=" * 80)
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
