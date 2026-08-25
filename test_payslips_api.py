"""
Quick API Test - Verify payslip endpoints are working
Run this to test the backend without using the browser UI
"""
import os
import requests
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

load_dotenv(os.path.join('backend', '.env'))

print("=" * 80)
print("  PAYSLIP API TEST - BACKEND VERIFICATION")
print("=" * 80)

# Get a demo user and their token
BASE_URL = "http://localhost:5050"

# First, get the HR user for testing
client = MongoClient(os.getenv('MONGO_URI'))
db = client.hr_offer_letters

hr_user = db.users.find_one({'role': 'hr'})
if not hr_user:
    print("❌ No HR user found in database")
    exit(1)

print(f"\n📝 Testing with user: {hr_user.get('email')} (Role: {hr_user.get('role')})")
print(f"   Employee linked: {'✅' if hr_user.get('employee_ref') else '❌'}")

# Get auth token
print("\n1️⃣  Testing Authentication...")
try:
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        'email': hr_user.get('email'),
        'password': 'password123'  # Default demo password
    })
    
    if response.status_code == 200:
        token = response.json().get('access_token')
        print(f"   ✅ Login successful")
        print(f"   Token: {token[:50]}...")
    else:
        print(f"   ❌ Login failed: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        exit(1)
except Exception as e:
    print(f"   ❌ Error: {e}")
    exit(1)

headers = {'Authorization': f'Bearer {token}'}

# Test 1: Get profile
print("\n2️⃣  Testing GET /api/auth/profile...")
try:
    response = requests.get(f"{BASE_URL}/api/auth/profile", headers=headers)
    if response.status_code == 200:
        profile = response.json()
        print(f"   ✅ Profile retrieved")
        print(f"   Name: {profile.get('name')}")
        print(f"   Role: {profile.get('role')}")
        print(f"   Employee Ref: {profile.get('employee_ref')}")
    else:
        print(f"   ❌ Failed: {response.status_code}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 2: List payslips (empty initially)
print("\n3️⃣  Testing GET /api/payslips (list payslips)...")
try:
    response = requests.get(f"{BASE_URL}/api/payslips?year=2026", headers=headers)
    if response.status_code == 200:
        payslips = response.json()
        print(f"   ✅ Payslips list retrieved")
        print(f"   Count: {len(payslips)}")
        if payslips:
            print(f"   First payslip: {payslips[0].get('employee_name')} - {payslips[0].get('month')}/{payslips[0].get('year')}")
    else:
        print(f"   ❌ Failed: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 3: Get employees
print("\n4️⃣  Testing GET /api/employees...")
try:
    response = requests.get(f"{BASE_URL}/api/employees", headers=headers)
    if response.status_code == 200:
        employees = response.json()
        print(f"   ✅ Employees retrieved")
        print(f"   Count: {len(employees)}")
    else:
        print(f"   ❌ Failed: {response.status_code}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 4: Create payslip
print("\n5️⃣  Testing POST /api/payslips (create payslip)...")

# Get an employee to create payslip for
employee = db.employees.find_one({'_id': ObjectId(hr_user.get('employee_ref'))})
if not employee:
    # Get any employee
    employee = db.employees.find_one({})

if employee:
    try:
        payslip_data = {
            'employee_id': str(employee['_id']),
            'month': 8,
            'year': 2026,
            'salary_components': {
                'basic': 50000,
                'hra': 15000,
                'da': 5000
            },
            'deductions': {
                'pf': 1800,
                'esi': 800
            },
            'attendance': {
                'present_days': 20,
                'absent_days': 2,
                'holidays': 4,
                'weekends': 4
            },
            'remarks': 'Test payslip'
        }
        
        response = requests.post(f"{BASE_URL}/api/payslips", json=payslip_data, headers=headers)
        if response.status_code in (200, 201):
            payslip = response.json()
            print(f"   ✅ Payslip created")
            print(f"   ID: {payslip.get('_id')}")
            print(f"   Status: {payslip.get('status')}")
            print(f"   Gross: ₹{payslip.get('gross_salary', 0):,.2f}")
            print(f"   Deductions: ₹{payslip.get('total_deductions', 0):,.2f}")
            print(f"   Net: ₹{payslip.get('net_salary', 0):,.2f}")
            
            # Save payslip ID for next test
            payslip_id = payslip.get('_id')
            
            # Test 5: Approve payslip (if HR_HEAD)
            if hr_user.get('role') in ('hr_head', 'admin'):
                print("\n6️⃣  Testing POST /api/payslips/<id>/approve...")
                try:
                    response = requests.post(f"{BASE_URL}/api/payslips/{payslip_id}/approve", headers=headers)
                    if response.status_code == 200:
                        print(f"   ✅ Payslip approved")
                    else:
                        print(f"   ⚠️  Cannot approve (user role doesn't have permission)")
                except Exception as e:
                    print(f"   ❌ Error: {e}")
        else:
            print(f"   ❌ Failed: {response.status_code}")
            print(f"   Response: {response.text[:300]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
else:
    print(f"   ⚠️  No employee found to create payslip for")

print("\n" + "=" * 80)
print("  VERIFICATION COMPLETE")
print("=" * 80)
print("""
✅ If you see success messages above, the payslip module is working!

📋 NEXT STEPS:

1. Open browser and go to: http://localhost:3000
2. Login with demo credentials:
   - Email: hr@company.com (HR user)
   - Password: password123

3. Sidebar → Payslips
   - Should see empty list or recently created payslip

4. Create a new payslip:
   - Click "+ Create Payslip"
   - Select employee
   - Enter salary: Basic 50000, HRA 15000, DA 5000
   - Click "Create"

5. Approve it (as HR Head):
   - Go to Payslips page
   - Click "Approve" button
   - Status changes to "Approved"

6. Release it (as HR):
   - Click "Release" button
   - Status changes to "Released"

7. View as employee:
   - Logout and login as: justmeabhi17@gmail.com
   - Go to Payslips
   - Should see the released payslip

🎉 You've successfully tested the payslip module!
""")
