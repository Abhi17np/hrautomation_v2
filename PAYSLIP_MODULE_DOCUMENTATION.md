# Employee Payslip Module - Documentation

## Overview
A complete payslip management system with role-based access control for employees, managers, and HR personnel.

---

## Features

### For Employees
- ✅ View their own monthly payslips
- ✅ Year/month filtering and navigation
- ✅ Detailed salary breakdown (earnings & deductions)
- ✅ Net salary calculation
- ✅ Attendance records display
- ✅ Modal view with complete payslip details

### For Managers
- ✅ View their own payslips
- ✅ View direct reports' payslips
- ✅ Manage payslips for their team
- ✅ Access same features as HR for team payslips

### For HR Personnel
- ✅ Create new payslips for any employee
- ✅ View all payslips across organization
- ✅ Edit payslips (before approval)
- ✅ Generate payslips automatically
- ✅ Filter by employee, month, year, status
- ✅ Release payslips to employees

### For HR Head/Admin
- ✅ All HR features
- ✅ Approve payslips (after generation)
- ✅ Delete draft payslips
- ✅ Full workflow control

---

## Payslip Status Workflow

```
draft → generated → approved → released
 ↓        ↓           ↓         ↓
created  edited     approved  visible to
by HR    by HR      by       employee
         hr_head
```

### Status Descriptions:
- **Draft**: Initial creation, ready for editing
- **Generated**: Populated with salary data, ready for approval
- **Approved**: Reviewed by HR Head/Admin
- **Released**: Visible to employee, cannot be modified

---

## Database Schema

### Payslip Collection
```
{
  _id: ObjectId,
  employee_id: String,
  month: Int (1-12),
  year: Int (2024, 2025, etc),
  status: String (draft|generated|approved|released),
  
  // Earnings
  basic: Number,
  hra: Number,
  da: Number,
  allowances: Number,
  gross_salary: Number (auto-calculated),
  
  // Deductions
  pf_deduction: Number,
  esi_deduction: Number,
  income_tax: Number,
  other_deductions: Number,
  total_deductions: Number (auto-calculated),
  
  // Net Salary
  net_salary: Number (auto-calculated),
  
  // Attendance
  working_days: Int,
  present_days: Int,
  absent_days: Int,
  leave_days: Int,
  
  // Metadata
  remarks: String,
  generated_by: String (user ID),
  approved_by: String (user ID),
  approved_at: Date,
  released_by: String (user ID),
  released_at: Date,
  created_at: Date,
  updated_at: Date
}
```

### Indexes
- Employee + Year + Month (DESC)
- Employee + Status
- Status
- Year + Month
- Created Date (DESC)

---

## API Endpoints

### List Payslips
```
GET /api/payslips
Query Parameters:
  - employee_id: Filter by employee
  - year: Filter by year
  - month: Filter by month
  - status: Filter by status (draft|generated|approved|released)

Response: Array of payslip objects
```

### Get Payslip
```
GET /api/payslips/<payslip_id>

Response: Single payslip object with enriched employee details
```

### Create Payslip
```
POST /api/payslips
Required: employee_id, month, year
Optional: All salary and deduction fields

Response: Created payslip object with ID
```

### Update Payslip
```
PUT /api/payslips/<payslip_id>
Allowed fields: 
  - basic, hra, da, allowances
  - pf_deduction, esi_deduction, income_tax, other_deductions
  - working_days, present_days, absent_days, leave_days
  - remarks

Note: Can only update draft/generated payslips
Response: Updated payslip object
```

### Approve Payslip
```
POST /api/payslips/<payslip_id>/approve
Permission: HR Head, Admin only
Note: Payslip must be in 'generated' status

Response: Updated payslip object
```

### Release Payslip
```
POST /api/payslips/<payslip_id>/release
Permission: HR, HR Head, Admin
Note: Payslip must be in 'approved' status

Response: Updated payslip object
```

### Delete Payslip
```
DELETE /api/payslips/<payslip_id>
Permission: Admin, HR Head only
Note: Can only delete 'draft' payslips

Response: { message: 'Payslip deleted' }
```

### Get Employee Payslip Summary
```
GET /api/payslips/employee/<employee_id>/summary?year=2025
Permission: Can view own + reports (managers) or all (HR)

Response:
{
  employee_id: String,
  employee_name: String,
  year: Int,
  months: {
    1: { id, status, gross_salary, net_salary } | null,
    2: { ... } | null,
    ...
    12: { ... } | null
  },
  total_payslips: Int,
  released_payslips: Int
}
```

---

## Frontend Pages

### `/payslip` - Employee Payslip Viewer
**Route**: `/payslip`
**Access**: Employees, Managers (for self), HR

Features:
- Year selector
- Monthly payslip cards grid
- Status badges
- Quick view of gross/net/deductions
- Detailed modal with full breakdown
- Attendance information

### `/payslip-management` - HR/Manager Payslip Management
**Route**: `/payslip-management`
**Access**: HR, HR Head, Admin, Managers

Features:
- Create new payslip modal
- Filter by employee, month, year, status
- Editable payslip form with salary components
- Action buttons for approve/release
- Table view with status and amounts
- Real-time calculation of gross/net salaries

---

## Usage Guide

### Creating a Payslip (HR)

1. Navigate to **Payslips** > **Create Payslip**
2. Select employee
3. Choose month and year
4. Enter salary components:
   - Basic Salary
   - HRA (House Rent Allowance)
   - DA (Dearness Allowance)
   - Allowances
5. Enter deductions:
   - Provident Fund (PF)
   - ESI (Employee State Insurance)
   - Income Tax
   - Other Deductions
6. Enter attendance data (optional):
   - Working days
   - Present days
   - Absent days
   - Leave days
7. Add remarks if needed
8. Click "Create Payslip"

**Result**: Payslip created in "Draft" status

### Approving a Payslip (HR Head/Admin)

1. Navigate to **Payslips**
2. Filter by "Generated" status
3. Click **Approve** button on payslip row
4. Payslip moves to "Approved" status

### Releasing a Payslip (HR)

1. Navigate to **Payslips**
2. Filter by "Approved" status
3. Click **Release** button
4. Payslip moves to "Released" status and becomes visible to employee

### Viewing Payslips (Employee)

1. Navigate to **Payslips** from sidebar
2. Select year to view
3. Browse monthly cards
4. Click "View Details" to see full breakdown

---

## Salary Calculation

### Gross Salary
```
Gross Salary = Basic + HRA + DA + Allowances
```

### Total Deductions
```
Total Deductions = PF + ESI + Income Tax + Other Deductions
```

### Net Salary (Take Home)
```
Net Salary = Gross Salary - Total Deductions
```

All calculations are **automatic** - fields update in real-time as you edit the form.

---

## Role-Based Access Control

| Action | Employee | Manager | HR | HR Head | Admin |
|--------|----------|---------|-----|---------|-------|
| View own payslips | ✅ | ✅ | ✅ | ✅ | ✅ |
| View team payslips | ❌ | ✅ | ✅ | ✅ | ✅ |
| View all payslips | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create payslips | ❌ | ❌ | ✅ | ✅ | ✅ |
| Edit payslips | ❌ | ❌ | ✅ | ✅ | ✅ |
| Approve payslips | ❌ | ❌ | ❌ | ✅ | ✅ |
| Release payslips | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete payslips | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## Filtering & Search

The payslip management page includes multiple filters:

- **Employee**: Filter by specific employee
- **Status**: Draft, Generated, Approved, Released
- **Year**: Select year for viewing
- **Month**: Filter by specific month

Combine filters for precise searches, e.g.:
- All approved payslips for January 2025
- All draft payslips for specific employee
- All released payslips across organization

---

## Bulk Operations

Future enhancements could include:
- Bulk create payslips for all employees in a month
- Bulk approve payslips
- Bulk release payslips
- Export payslips to PDF/Excel

---

## Troubleshooting

### Payslip Not Visible to Employee
- Ensure payslip status is "Released"
- Check employee has correct role
- Verify employee_id is correct

### Cannot Approve Payslip
- Must have HR Head or Admin role
- Payslip must be in "Generated" status
- Try refreshing the page

### Calculations Not Updating
- Reload the page
- Check all fields have valid numbers
- Ensure not submitted yet

### Employee Locked to Only View Their Payslips
- By design - employees can only see their own
- Managers can see their reports
- HR can see all

---

## Files Modified/Created

### Backend
- ✅ `backend/db_init.py` - Added payslip schema + indexes
- ✅ `backend/app.py` - Registered payslips blueprint
- ✅ `backend/routes/payslips.py` - Complete API implementation

### Frontend
- ✅ `frontend/src/pages/PayslipPage.jsx` - Employee viewer
- ✅ `frontend/src/pages/PayslipManagementPage.jsx` - HR/Manager management
- ✅ `frontend/src/App.jsx` - Added routes
- ✅ `frontend/src/components/Layout.jsx` - Added navigation

---

## Next Steps

1. **Initialize Database**: Run `python db_init.py` to create collection
2. **Test Create**: Create a test payslip for an employee
3. **Test Workflow**: Go through full approval → release workflow
4. **Configure Salary Data**: Pre-populate employee salary info if not already done
5. **Setup Batch Processing**: Consider automated payslip generation

---

## Security Notes

- ✅ Role-based access control enforced at API level
- ✅ Employees can only view their own payslips
- ✅ Managers can only view their reports
- ✅ HR Head required for approval
- ✅ JWT authentication required for all endpoints
- ✅ No sensitive data in logs

---

## Performance Considerations

- Indexes on employee_id + year/month for fast filtering
- Pagination recommended for large payslip lists
- Status updates are atomic
- Employee details enriched on-the-fly from employee collection

---

## Support

For issues or feature requests related to the payslip module:
1. Check the troubleshooting section above
2. Review API responses for error messages
3. Verify role permissions
4. Check browser console for frontend errors

---

**Version**: 1.0.0
**Last Updated**: 2025-08-20
**Status**: Production Ready
