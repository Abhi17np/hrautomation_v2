# Payslip Module - Troubleshooting & Setup Guide

## 🔴 Issue: "Failed to load payslips"

The frontend shows "Failed to load payslips" error on both employee and management pages.

### Root Causes & Solutions

---

## ✅ Solution 1: Backend Configuration (REQUIRED)

### A. Database Collection Created
✅ **Status**: The `payslips` collection has been created with all necessary indexes.

**Verify:**
```bash
cd backend
python -c "from pymongo import MongoClient; import os; from dotenv import load_dotenv; load_dotenv(); client = MongoClient(os.getenv('MONGO_URI')); db = client.hr_offer_letters; print('Payslips collection:', db.payslips.count_documents({}))"
```

### B. Backend Code Fixed
✅ **Status**: Fixed employee lookup logic to use `employee_ref` instead of `user_id`

**Changes Made:**
- `backend/routes/payslips.py` - Updated 2 critical functions:
  1. `_can_view_payslip()` - Now uses `caller.get('employee_ref')`
  2. `list_payslips()` - Now correctly retrieves employee ID from user record

**Why this matters:**
- The employees collection doesn't have a `user_id` field
- The users collection has an `employee_ref` field that links to employees
- The old code was searching for non-existent `user_id` field

### C. Restart Backend Server
⚠️ **ACTION REQUIRED**:

```bash
# Stop the running Flask backend
# (Press Ctrl+C in the terminal where it's running)

# Navigate to backend folder
cd backend

# Restart Flask with updated code
python app.py

# You should see output like:
# ✅ HR Automation API is running
# ✅ Port: 5050 (or configured port)
```

**Verify it's running:**
```bash
curl http://localhost:5050/
# Should return: {"status": "ok", "message": "HR Automation API is running", ...}
```

---

## ✅ Solution 2: Employee-User Linking (REQUIRED)

The payslips module requires that each user is linked to an employee record via the `employee_ref` field.

### Check Current Status

Run:
```bash
python setup_payslips_demo.py
```

This will show you:
- Which users have `employee_ref` set
- Which users are missing the link
- Current employees in the system

### Linking Employees to Users

You have two options:

#### **Option A: Via the Employee Dashboard (Recommended)**

1. **Login as HR or Admin**
2. **Go to Employees page**
3. **Create employee records** for each user (if not already created):
   - Name: Same as user name
   - Employee ID: Auto-generated (e.g., EMP001)
   - Designation: Department manager, HR, etc.
   - Department: HR, Engineering, etc.

4. **After creating employees**, link them to users manually in MongoDB:

```bash
# Connect to MongoDB and run these commands:
# OR use MongoDB Atlas UI

# For Admin User
db.users.updateOne(
  {email: "admin@company.com"},
  {$set: {employee_ref: "EMPLOYEE_OBJECT_ID"}}
)

# For HR User
db.users.updateOne(
  {email: "hr@company.com"},
  {$set: {employee_ref: "EMPLOYEE_OBJECT_ID"}}
)

# For HR Head User
db.users.updateOne(
  {email: "hrhead@company.com"},
  {$set: {employee_ref: "EMPLOYEE_OBJECT_ID"}}
)

# For Manager User
db.users.updateOne(
  {email: "manager@company.com"},
  {$set: {employee_ref: "EMPLOYEE_OBJECT_ID"}}
)
```

#### **Option B: Using a Setup Script**

Create a file called `link_employees_to_users.py`:

```python
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

load_dotenv(os.path.join('backend', '.env'))
client = MongoClient(os.getenv('MONGO_URI'))
db = client.hr_offer_letters

# Get or create employees for demo users
users_to_link = [
    ('admin@company.com', 'Admin User', 'HR Manager'),
    ('hr@company.com', 'HR Executive', 'HR'),
    ('hrhead@company.com', 'HR Manager', 'HR Head'),
    ('manager@company.com', 'Dept Manager', 'Manager'),
]

for email, name, designation in users_to_link:
    # Find or create employee
    emp = db.employees.find_one({'name': name})
    if not emp:
        # Create new employee
        emp_result = db.employees.insert_one({
            'name': name,
            'designation': designation,
            'department': 'HR',
            'email': email,
            'employee_id': f'EMP{str(db.counters.find_one_and_update({"_id": "employee"}, {"$inc": {"seq": 1}})["seq"]).zfill(3)}',
            'status': 'active',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        })
        emp = db.employees.find_one({'_id': emp_result.inserted_id})
    
    # Link user to employee
    db.users.update_one(
        {'email': email},
        {'$set': {'employee_ref': str(emp['_id'])}}
    )
    print(f"✅ Linked {email} to employee {emp['_id']}")
```

---

## ✅ Solution 3: Verify Frontend is Updated

The frontend pages have been created:
- ✅ `frontend/src/pages/PayslipPage.jsx` - Employee view
- ✅ `frontend/src/pages/PayslipManagementPage.jsx` - HR/Manager view
- ✅ `frontend/src/App.jsx` - Routes added
- ✅ `frontend/src/components/Layout.jsx` - Navigation added

**Verify in browser:**
1. Refresh the page
2. Sidebar should show "Payslips" menu item
3. Click it - should navigate to `/payslip` or `/payslip-management`

If not showing:
```bash
# Clear browser cache
# Ctrl+Shift+Delete (Windows/Linux)
# Cmd+Shift+Delete (Mac)

# Or restart frontend
cd frontend
npm start
```

---

## 📋 Complete Startup Checklist

- [ ] **Backend database**: Run `python db_init.py` - Creates payslips collection ✅ DONE
- [ ] **Backend code**: Reviewed and fixed in `routes/payslips.py` ✅ DONE
- [ ] **Restart backend**: Kill old Flask process and run `python app.py` ⏳ PENDING
- [ ] **Link employees**: Create employees and link to users ⏳ PENDING
- [ ] **Frontend refresh**: Clear cache and refresh browser ⏳ PENDING
- [ ] **Test create payslip**: Create a test payslip via UI ⏳ PENDING

---

## 🧪 Testing After Setup

### Test 1: Verify Database
```bash
python setup_payslips_demo.py
```
Expected output:
```
✅ Payslips collection: 0 documents
✅ Employees: 4+ total
✅ Users: 4+ total
```

### Test 2: List Payslips API
```bash
# First, get a JWT token by logging in via the UI
# Then use it here (replace TOKEN with actual token)

curl -X GET "http://localhost:5050/api/payslips" \
  -H "Authorization: Bearer TOKEN"
```

Expected response:
```json
[]
```
(Empty array is OK - no payslips created yet)

### Test 3: Create Payslip via UI

**Step 1: Login as HR**
- Email: `hr@company.com`
- Password: `hr123`

**Step 2: Navigate to Payslip Management**
- Sidebar → Payslips

**Step 3: Create Payslip**
- Click "+ Create Payslip"
- Select Employee: (should show employee list)
- Month: January
- Year: 2026
- Basic: 50000
- HRA: 15000
- DA: 5000
- PF: 1800
- Click "Create Payslip"

**Expected Result:**
- Success message
- Payslip appears in table
- Status: "Generated"

### Test 4: Approve Payslip

**Step 1: Login as HR Head**
- Email: `hrhead@company.com`
- Password: `hrhead123`

**Step 2: Approve**
- Sidebar → Payslips
- Find "Generated" payslip
- Click "Approve" button

**Expected Result:**
- Status changes to "Approved"

### Test 5: Release Payslip

**Step 1: Login as HR**
- Email: `hr@company.com`

**Step 2: Release**
- Sidebar → Payslips
- Find "Approved" payslip
- Click "Release" button

**Expected Result:**
- Status changes to "Released"

### Test 6: View as Employee

**Step 1: Login as Employee**
- Email: One of the demo employee emails
- Password: (whatever was set)

**Step 2: View Payslip**
- Sidebar → Payslips
- Select Year: 2026
- Should see January payslip card
- Click "View Details"
- See full payslip breakdown

**Expected Result:**
- Payslip details display correctly
- Gross, Net, Deductions calculated
- Cannot edit or approve (read-only)

---

## 🔧 Troubleshooting Specific Issues

### Issue: "No employee record found" error

**Cause**: User is not linked to an employee

**Solution**:
1. Ensure employee exists: Go to Employees page and create one
2. Link user to employee:
   ```bash
   db.users.updateOne(
     {email: "user@example.com"},
     {$set: {employee_ref: ObjectId("EMPLOYEE_ID")}}
   )
   ```

### Issue: Can't see other employees' payslips as manager

**Cause**: Manager employee doesn't have direct reports

**Solution**:
1. Create employee records for team members
2. Set their `manager_id` to manager's employee ID:
   ```bash
   db.employees.updateOne(
     {_id: ObjectId("EMPLOYEE_ID")},
     {$set: {manager_id: ObjectId("MANAGER_EMPLOYEE_ID")}}
   )
   ```

### Issue: Backend returns 404 for payslips endpoint

**Cause**: Backend not restarted after changes

**Solution**:
1. Stop Flask (`Ctrl+C`)
2. Run `python app.py` again
3. Verify output shows blueprint registration

### Issue: Frontend shows blank page for payslips

**Cause**: Browser cache or routes not loaded

**Solution**:
1. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Restart frontend: `npm start`

### Issue: 401 Unauthorized error

**Cause**: JWT token expired or invalid

**Solution**:
1. Logout and login again
2. Check browser console for token errors
3. Verify `.env` JWT secret in backend matches

---

## 📊 Expected Data Flow

```
1. User Login
   ├─ Get JWT token
   └─ Token stored in localStorage

2. Navigate to Payslips
   ├─ Frontend calls GET /api/payslips (with JWT)
   ├─ Backend verifies JWT
   ├─ Backend gets user from database
   ├─ Backend checks user.employee_ref
   ├─ Backend queries payslips for that employee
   └─ Frontend displays results

3. Create Payslip (HR only)
   ├─ Frontend calls POST /api/payslips (with JWT)
   ├─ Backend verifies HR role
   ├─ Backend validates employee exists
   ├─ Backend checks no duplicate for month/year
   ├─ Backend creates payslip
   └─ Frontend displays success

4. Approve Payslip (HR Head only)
   ├─ Frontend calls POST /api/payslips/:id/approve
   ├─ Backend verifies HR Head role
   ├─ Backend updates status to "approved"
   └─ Frontend shows status change

5. Release Payslip (HR/HR Head/Admin)
   ├─ Frontend calls POST /api/payslips/:id/release
   ├─ Backend verifies permissions
   ├─ Backend updates status to "released"
   └─ Frontend shows status change

6. Employee Views Payslip
   ├─ Frontend calls GET /api/payslips/:id
   ├─ Backend verifies employee can access
   ├─ Backend enriches with employee details
   └─ Frontend displays full breakdown
```

---

## 📞 Quick Support

**Module Details:**
- ✅ Database collection: `payslips`
- ✅ API prefix: `/api/payslips/*`
- ✅ Frontend routes: `/payslip` (employee), `/payslip-management` (HR/Manager)
- ✅ Status workflow: draft → generated → approved → released

**Documentation:**
- See `PAYSLIP_MODULE_DOCUMENTATION.md` for complete API reference
- See `PAYSLIP_QUICK_START.md` for usage guide

---

## ✨ Next Steps

1. **Restart backend** - Most critical step
2. **Link employees to users** - Ensure employee_ref is set
3. **Test the workflow** - Follow the testing checklist above
4. **Create sample payslips** - Practice creating and approving
5. **Review documentation** - For production use

---

**Last Updated**: 2026-08-20
**Status**: Ready for Testing
**Requires**: Backend restart + Employee linking
