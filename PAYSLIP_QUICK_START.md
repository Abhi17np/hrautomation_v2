# Payslip Module - Quick Setup Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Initialize Database
Run the database initialization script to create the payslip collection:

```bash
cd backend
python db_init.py
```

**What it does:**
- Creates `payslip` collection with schema validation
- Creates necessary indexes for performance
- Sets up monthly/employee lookup indexes

### Step 2: Restart Backend
If your backend is running, restart it to load the new routes:

```bash
# Kill existing process and restart
python app.py
```

The payslip API endpoints are now available at `/api/payslips/*`

### Step 3: Test in Frontend
Navigate to your frontend application:

1. **For Employees**: Sidebar → Payslips
2. **For HR/Managers**: Sidebar → Payslips (management view)

---

## 📊 Complete Workflow Example

### Scenario: Create and Release Payslip for January 2025

**1. HR Creates Payslip** (as HR user)
```
1. Login as HR
2. Navigate to "Payslips" (management view)
3. Click "+ Create Payslip"
4. Fill details:
   - Employee: Select from dropdown
   - Month: January
   - Year: 2025
   - Basic: 50,000
   - HRA: 15,000
   - DA: 5,000
   - Allowances: 5,000
   - PF: 1,800
   - ESI: 200
   - Income Tax: 5,000
   - Working Days: 22
   - Present Days: 20
5. Click "Create Payslip"
✓ Payslip created in DRAFT status
```

**2. HR Generates Payslip** (auto-calculated)
```
- Navigate back to Payslips list
- Find the newly created draft payslip
- Status automatically changes to GENERATED
- Click to view details - calculations are auto-filled
```

**3. HR Head Approves** (as HR Head user)
```
1. Login as HR Head
2. Navigate to Payslips
3. Filter Status: "Generated"
4. Find the payslip
5. Click "Approve" button
✓ Status changes to APPROVED
```

**4. HR Releases** (as HR user)
```
1. Login as HR
2. Navigate to Payslips
3. Filter Status: "Approved"
4. Find the approved payslip
5. Click "Release" button
✓ Status changes to RELEASED
✓ Employee can now view it
```

**5. Employee Views** (as Employee user)
```
1. Login as Employee
2. Navigate to "Payslips" from sidebar
3. Select Year: 2025
4. Click "View Details" on January card
5. See full breakdown:
   - Gross Salary: ₹75,000
   - Total Deductions: ₹7,000
   - Net Salary: ₹68,000
6. View earnings and deductions breakdown
```

---

## 🔧 Role-Based Navigation

### Employee View
After login, employee sees in sidebar:
```
Dashboard
My Offer Letters
Appointment Order
My Documents
Exit & Relieving
Leave Tracker
Attendance
📊 Payslips         ← NEW
```

### Manager View
After login, manager sees:
```
Dashboard
My Offer Letters
Appointment Order
My Documents
Exit & Relieving
Approvals
Leave Tracker
Attendance
📊 Payslips         ← NEW (Management + own)
```

### HR View
After login, HR sees:
```
Dashboard
Employees
Templates
Offer Letters
Appointment Orders
Approvals
Exit & Relieving
Leave Management
Attendance
📊 Payslips         ← NEW (Full Management)
```

---

## 💾 Sample Test Data

Use these credentials to test different roles:

### Employee Login
```
Email: employee@company.com (if exists)
Password: (from db_init.py setup)
```

### Manager Login
```
Email: manager@company.com
Password: manager123
```

### HR Login
```
Email: hr@company.com
Password: hr123
```

### HR Head/Admin Login
```
Email: hrhead@company.com or admin@company.com
Password: hrhead123 or admin123
```

---

## 🎯 Common Use Cases

### Use Case 1: Monthly Payroll Processing
```
1. HR creates payslips for all employees
2. HR reviews and verifies calculations
3. HR Head approves all payslips
4. HR releases payslips
5. Employees download from their dashboard
```

### Use Case 2: Manager Checks Team Salary
```
1. Manager logs in
2. Goes to Payslips section
3. Sees own payslips + team payslips
4. Can view details of reports' payslips
5. Cannot approve/release (requires HR permissions)
```

### Use Case 3: Employee Reviews Payslip
```
1. Employee logs in
2. Navigates to Payslips
3. Selects year (defaults to current)
4. Browses monthly cards
5. Clicks "View Details" on released payslip
6. Sees full breakdown of salary
```

### Use Case 4: HR Edits Before Approval
```
1. HR creates payslip
2. Reviews and notices calculation error
3. Clicks Edit (only works before approval)
4. Updates salary components
5. Auto-recalculates totals
6. Saves changes
7. Marks as approved
```

---

## 🔒 Security Features

✅ **Employees can only see their own payslips**
- Backend validates employee_id matches logged-in user

✅ **Managers can only see their team's payslips**
- Backend checks manager_id relationship

✅ **HR Head required for approval**
- Only hr_head and admin role can approve

✅ **HR controls release**
- Only hr, hr_head, admin can release

✅ **Draft payslips can only be deleted by admin**
- Prevents accidental loss of created data

✅ **JWT Authentication**
- All endpoints require valid JWT token

---

## 📈 Extending the Module

### Future Enhancements

**1. Bulk Operations**
```
- Bulk create payslips for all active employees
- Auto-generate from attendance records
- Bulk approve/release
```

**2. PDF Generation**
```
- Download payslip as PDF
- Custom PDF template
- Signature field for approval
```

**3. Integration with Attendance**
```
- Auto-calculate present/absent days
- Deduct from salary based on rules
- Auto-populate attendance data
```

**4. Email Notifications**
```
- Notify employee when payslip released
- Notify manager of team payslip release
- Approval workflow notifications
```

**5. Analytics & Reports**
```
- Salary analytics dashboard
- Department-wise payroll
- Deduction trends
- Cost center analysis
```

**6. Payroll History**
```
- Year-to-date summaries
- Tax calculation
- Benefits deduction tracking
```

---

## ❓ FAQ

### Q: Can employee edit their payslip?
**A:** No, employees can only view. HR must create/edit.

### Q: What if I need to change a released payslip?
**A:** Create a corrected payslip for next month or contact HR Head for reversal.

### Q: How is net salary calculated?
**A:** Net = (Basic + HRA + DA + Allowances) - (PF + ESI + Tax + Others)

### Q: Can multiple payslips exist for same employee/month?
**A:** No, system prevents duplicate payslips for same employee/month/year.

### Q: How are calculations auto-updated?
**A:** When you edit any salary field, totals automatically recalculate on save.

### Q: What happens if I delete a payslip?
**A:** Only draft payslips can be deleted. Deleted data cannot be recovered.

### Q: Can manager approve payslips?
**A:** No, only HR Head and Admin can approve. Managers can only view and manage.

### Q: Is there a payroll cutoff date?
**A:** No, you can create payslips for any month/year as needed.

---

## 📞 Support & Troubleshooting

### Payslip Not Showing for Employee
**Check:**
1. Payslip status is "Released" ✓
2. Employee is logged in with correct account ✓
3. Correct employee_id linked to user account ✓
4. Browser cache cleared ✓

### Create Button Disabled
**Check:**
1. Logged in as HR, HR Head, or Admin ✓
2. Not on employee payslip view page ✓
3. Refresh page if UI seems frozen ✓

### Calculations Look Wrong
**Check:**
1. All numbers entered correctly ✓
2. Save button clicked ✓
3. Page refreshed to see updates ✓
4. Verify formula: Gross - Deductions = Net ✓

### Permission Denied Error
**Check:**
1. Verify your user role ✓
2. Not attempting action for another user ✓
3. API token is valid (check browser console) ✓
4. Re-login if session expired ✓

---

## 🎓 API Testing with cURL

### List Payslips
```bash
curl -X GET "http://localhost:5050/api/payslips" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Payslip
```bash
curl -X POST "http://localhost:5050/api/payslips" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMPLOYEE_OBJECT_ID",
    "month": 1,
    "year": 2025,
    "basic": 50000,
    "hra": 15000,
    "da": 5000,
    "pf_deduction": 1800
  }'
```

### Approve Payslip
```bash
curl -X POST "http://localhost:5050/api/payslips/PAYSLIP_ID/approve" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Release Payslip
```bash
curl -X POST "http://localhost:5050/api/payslips/PAYSLIP_ID/release" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ✨ You're All Set!

Your payslip module is now fully integrated into your HR automation system. 

**Next Steps:**
1. ✅ Run db_init.py
2. ✅ Restart backend
3. ✅ Test with different user roles
4. ✅ Create sample payslips
5. ✅ Go through approval workflow
6. ✅ View as employee
7. ✅ Customize as needed

**Need Help?**
- Check PAYSLIP_MODULE_DOCUMENTATION.md for complete reference
- Review API responses for error details
- Check browser console for frontend errors
- Verify user roles and permissions

Happy payroll processing! 🎉
