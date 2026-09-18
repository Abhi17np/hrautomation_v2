"""
payslips.py — Employee Payslip Management
===========================================
Role-based payslip management:
  - Employees: view their own payslips
  - Managers: view their own + their direct reports' payslips
  - HR: view all payslips, manage payslips (create/edit/approve/release)
  - HR Head / Admin: full access including approval workflow
"""

from flask import Blueprint, request, jsonify, current_app, g
from flask_jwt_extended import get_jwt_identity
from datetime import datetime
from bson import ObjectId

from auth_utils import tenant_scoped, require_role
from tenant_scope import get_db

payslips_bp = Blueprint('payslips', __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def serialize_payslip(payslip):
    """Convert payslip doc to JSON-serializable dict"""
    payslip['_id'] = str(payslip['_id'])
    if payslip.get('employee_id'):
        payslip['employee_id'] = str(payslip['employee_id']) if isinstance(payslip['employee_id'], ObjectId) else payslip['employee_id']
    return payslip


def _get_employee_ref(db, uid):
    """Get employee record linked to this user"""
    try:
        emp = db.employees.find_one({'_id': ObjectId(uid)})
        return emp
    except:
        return None


def _can_view_payslip(caller, target_emp_id, db):
    """
    Check if caller can view a target employee's payslip.
    - Employees can only view their own
    - Managers can view their own + direct reports
    - HR can view all
    - Admin can view all
    """
    role = caller.get('role')

    # Admin and HR can view all
    if role in ('admin', 'hr', 'hr_head'):
        return True

    # Manager can view their own + direct reports
    if role == 'manager':
        # Get manager's employee record via employee_ref in user
        mgr_emp_id = caller.get('employee_ref')
        if not mgr_emp_id:
            return False
        mgr_emp = db.employees.find_one({'_id': ObjectId(mgr_emp_id)})
        if not mgr_emp:
            return False
        # Check if target is manager's direct report
        try:
            target_emp = db.employees.find_one({'_id': ObjectId(target_emp_id)})
            if target_emp and target_emp.get('manager_id') == str(mgr_emp['_id']):
                return True
        except:
            pass
        # Manager can view their own
        return target_emp_id == mgr_emp_id

    # Employee can only view their own
    if role == 'employee':
        emp_id = caller.get('employee_ref')
        if emp_id:
            return target_emp_id == emp_id

    return False


# ─────────────────────────────────────────────────────────────────────────────
# API Routes
# ─────────────────────────────────────────────────────────────────────────────

@payslips_bp.route('/', methods=['GET'])
@tenant_scoped
def list_payslips():
    """
    List payslips based on caller role:
    - Employees: their own payslips
    - Managers: their own + direct reports
    - HR: all payslips
    - Admin: all payslips

    Query params:
      - employee_id: filter by employee (HR/Admin/Manager only for reports)
      - year: filter by year
      - month: filter by month
      - status: filter by status (draft, generated, approved, released)
    """
    db = get_db()
    caller = g.caller

    role = caller.get('role')
    query = {}

    # Build query based on role
    if role == 'employee':
        # Employees can only see their own payslips
        emp_id = caller.get('employee_ref')
        if not emp_id:
            return jsonify({'error': 'No employee record found'}), 404
        query['employee_id'] = emp_id

    elif role == 'manager':
        # Managers can see their own + direct reports
        mgr_emp_id = caller.get('employee_ref')
        if mgr_emp_id:
            mgr_emp = db.employees.find_one({'_id': ObjectId(mgr_emp_id)})
            if mgr_emp:
                # Get all direct reports
                reports = db.employees.find({'manager_id': str(mgr_emp['_id'])})
                emp_ids = [str(emp['_id']) for emp in reports] + [str(mgr_emp['_id'])]
                query['employee_id'] = {'$in': emp_ids}
            else:
                return jsonify({'error': 'Employee record not found'}), 404
        else:
            return jsonify({'error': 'No employee record linked'}), 404

    elif role not in ('hr', 'hr_head', 'admin'):
        return jsonify({'error': 'Access denied'}), 403

    # Apply optional filters
    employee_id = request.args.get('employee_id')
    if employee_id:
        # Check permission if employee_id specified
        if role not in ('admin', 'hr', 'hr_head'):
            if not _can_view_payslip(caller, employee_id, db):
                return jsonify({'error': 'Access denied'}), 403
        query['employee_id'] = employee_id

    year = request.args.get('year', type=int)
    if year:
        query['year'] = year

    month = request.args.get('month', type=int)
    if month:
        query['month'] = month

    status = request.args.get('status')
    if status:
        query['status'] = status

    # Fetch payslips sorted by year/month descending
    payslips = list(db.payslips.find(query).sort([('year', -1), ('month', -1)]))

    # Enrich with employee details
    for ps in payslips:
        try:
            emp = db.employees.find_one({'_id': ObjectId(ps['employee_id'])})
            if emp:
                ps['employee_name'] = emp.get('name')
                ps['employee_code'] = emp.get('employee_id')
                ps['designation'] = emp.get('designation')
                ps['department'] = emp.get('department')
        except:
            pass

    return jsonify([serialize_payslip(ps) for ps in payslips])


@payslips_bp.route('/<payslip_id>', methods=['GET'])
@tenant_scoped
def get_payslip(payslip_id):
    """Get a specific payslip"""
    db = get_db()
    caller = g.caller

    try:
        payslip = db.payslips.find_one({'_id': ObjectId(payslip_id)})
    except:
        return jsonify({'error': 'Invalid payslip ID'}), 400

    if not payslip:
        return jsonify({'error': 'Payslip not found'}), 404

    # Check access
    if not _can_view_payslip(caller, payslip['employee_id'], db):
        return jsonify({'error': 'Access denied'}), 403

    # Enrich with employee details
    try:
        emp = db.employees.find_one({'_id': ObjectId(payslip['employee_id'])})
        if emp:
            payslip['employee_name'] = emp.get('name')
            payslip['employee_code'] = emp.get('employee_id')
            payslip['designation'] = emp.get('designation')
            payslip['department'] = emp.get('department')
            payslip['email'] = emp.get('email')
            payslip['joining_date'] = emp.get('joining_date')
    except:
        pass

    return jsonify(serialize_payslip(payslip))


@payslips_bp.route('/', methods=['POST'])
@require_role('hr', 'hr_head', 'admin')
def create_payslip():
    """Create a new payslip (HR only)"""
    db = get_db()
    uid = get_jwt_identity()

    data = request.json or {}

    # Validate required fields
    required = ['employee_id', 'month', 'year']
    for field in required:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    # Verify employee exists
    try:
        emp = db.employees.find_one({'_id': ObjectId(data['employee_id'])})
        if not emp:
            return jsonify({'error': 'Employee not found'}), 404
    except:
        return jsonify({'error': 'Invalid employee_id'}), 400

    # Check if payslip already exists for this month
    existing = db.payslips.find_one({
        'employee_id': data['employee_id'],
        'month': data['month'],
        'year': data['year']
    })
    if existing:
        return jsonify({'error': 'Payslip already exists for this month'}), 409

    # Build payslip document
    payslip = {
        'employee_id': data['employee_id'],
        'month': data['month'],
        'year': data['year'],
        'status': 'draft',
        'basic': data.get('basic', emp.get('basic')),
        'hra': data.get('hra', emp.get('hra')),
        'da': data.get('da', emp.get('da')),
        'allowances': data.get('allowances', 0),
        'pf_deduction': data.get('pf_deduction', 0),
        'esi_deduction': data.get('esi_deduction', 0),
        'income_tax': data.get('income_tax', 0),
        'other_deductions': data.get('other_deductions', 0),
        'working_days': data.get('working_days', 0),
        'present_days': data.get('present_days', 0),
        'absent_days': data.get('absent_days', 0),
        'leave_days': data.get('leave_days', 0),
        'remarks': data.get('remarks', ''),
        'generated_by': str(uid),
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }

    # Calculate derived fields
    basic = float(payslip['basic'] or 0)
    hra = float(payslip['hra'] or 0)
    da = float(payslip['da'] or 0)
    allowances = float(payslip['allowances'] or 0)
    payslip['gross_salary'] = basic + hra + da + allowances

    pf = float(payslip['pf_deduction'] or 0)
    esi = float(payslip['esi_deduction'] or 0)
    tax = float(payslip['income_tax'] or 0)
    other = float(payslip['other_deductions'] or 0)
    payslip['total_deductions'] = pf + esi + tax + other
    payslip['net_salary'] = payslip['gross_salary'] - payslip['total_deductions']

    result = db.payslips.insert_one(payslip)
    payslip['_id'] = str(result.inserted_id)

    return jsonify(serialize_payslip(payslip)), 201


@payslips_bp.route('/<payslip_id>', methods=['PUT'])
@require_role('hr', 'hr_head', 'admin')
def update_payslip(payslip_id):
    """Update payslip details (HR only, before approval)"""
    db = get_db()

    try:
        payslip = db.payslips.find_one({'_id': ObjectId(payslip_id)})
    except:
        return jsonify({'error': 'Invalid payslip ID'}), 400

    if not payslip:
        return jsonify({'error': 'Payslip not found'}), 404

    # Can only update if in draft or generated status
    if payslip['status'] not in ('draft', 'generated'):
        return jsonify({'error': 'Cannot update payslip in this status'}), 409

    data = request.json or {}

    # Update allowed fields
    allowed = [
        'basic', 'hra', 'da', 'allowances',
        'pf_deduction', 'esi_deduction', 'income_tax', 'other_deductions',
        'working_days', 'present_days', 'absent_days', 'leave_days', 'remarks'
    ]

    for field in allowed:
        if field in data:
            payslip[field] = data[field]

    # Recalculate derived fields
    basic = float(payslip['basic'] or 0)
    hra = float(payslip['hra'] or 0)
    da = float(payslip['da'] or 0)
    allowances = float(payslip['allowances'] or 0)
    payslip['gross_salary'] = basic + hra + da + allowances

    pf = float(payslip['pf_deduction'] or 0)
    esi = float(payslip['esi_deduction'] or 0)
    tax = float(payslip['income_tax'] or 0)
    other = float(payslip['other_deductions'] or 0)
    payslip['total_deductions'] = pf + esi + tax + other
    payslip['net_salary'] = payslip['gross_salary'] - payslip['total_deductions']

    payslip['updated_at'] = datetime.utcnow()

    if payslip['status'] == 'draft':
        payslip['status'] = 'generated'

    db.payslips.update_one({'_id': ObjectId(payslip_id)}, {'$set': payslip})

    return jsonify(serialize_payslip(payslip))


@payslips_bp.route('/<payslip_id>/approve', methods=['POST'])
@require_role('hr_head', 'admin')
def approve_payslip(payslip_id):
    """Approve payslip (HR Head / Admin only)"""
    db = get_db()
    uid = get_jwt_identity()

    try:
        payslip = db.payslips.find_one({'_id': ObjectId(payslip_id)})
    except:
        return jsonify({'error': 'Invalid payslip ID'}), 400

    if not payslip:
        return jsonify({'error': 'Payslip not found'}), 404

    if payslip['status'] != 'generated':
        return jsonify({'error': 'Payslip must be in generated status to approve'}), 409

    payslip['status'] = 'approved'
    payslip['approved_by'] = str(uid)
    payslip['approved_at'] = datetime.utcnow()
    payslip['updated_at'] = datetime.utcnow()

    db.payslips.update_one({'_id': ObjectId(payslip_id)}, {'$set': payslip})

    return jsonify(serialize_payslip(payslip))


@payslips_bp.route('/<payslip_id>/release', methods=['POST'])
@require_role('hr', 'hr_head', 'admin')
def release_payslip(payslip_id):
    """Release payslip to employee (HR / HR Head / Admin)"""
    db = get_db()
    uid = get_jwt_identity()

    try:
        payslip = db.payslips.find_one({'_id': ObjectId(payslip_id)})
    except:
        return jsonify({'error': 'Invalid payslip ID'}), 400

    if not payslip:
        return jsonify({'error': 'Payslip not found'}), 404

    if payslip['status'] != 'approved':
        return jsonify({'error': 'Payslip must be approved before release'}), 409

    payslip['status'] = 'released'
    payslip['released_by'] = str(uid)
    payslip['released_at'] = datetime.utcnow()
    payslip['updated_at'] = datetime.utcnow()

    db.payslips.update_one({'_id': ObjectId(payslip_id)}, {'$set': payslip})

    return jsonify(serialize_payslip(payslip))


@payslips_bp.route('/<payslip_id>', methods=['DELETE'])
@require_role('admin', 'hr_head')
def delete_payslip(payslip_id):
    """Delete payslip (Admin / HR Head only, draft status only)"""
    db = get_db()

    try:
        payslip = db.payslips.find_one({'_id': ObjectId(payslip_id)})
    except:
        return jsonify({'error': 'Invalid payslip ID'}), 400

    if not payslip:
        return jsonify({'error': 'Payslip not found'}), 404

    # Can only delete draft payslips
    if payslip['status'] != 'draft':
        return jsonify({'error': 'Can only delete draft payslips'}), 409

    db.payslips.delete_one({'_id': ObjectId(payslip_id)})

    return jsonify({'message': 'Payslip deleted'}), 200


@payslips_bp.route('/employee/<employee_id>/summary', methods=['GET'])
@tenant_scoped
def get_employee_payslip_summary(employee_id):
    """Get payslip summary for an employee (year/month counts)"""
    db = get_db()
    caller = g.caller

    # Check access
    if not _can_view_payslip(caller, employee_id, db):
        return jsonify({'error': 'Access denied'}), 403

    year = request.args.get('year', type=int)
    if not year:
        year = datetime.utcnow().year

    # Get payslips for the year
    payslips = list(db.payslips.find({
        'employee_id': employee_id,
        'year': year
    }).sort('month', 1))

    # Build monthly summary
    months = {i: None for i in range(1, 13)}
    for ps in payslips:
        months[ps['month']] = {
            'id': str(ps['_id']),
            'status': ps['status'],
            'gross_salary': ps.get('gross_salary'),
            'net_salary': ps.get('net_salary'),
        }

    # Get employee details
    emp = db.employees.find_one({'_id': ObjectId(employee_id)})

    return jsonify({
        'employee_id': employee_id,
        'employee_name': emp.get('name') if emp else None,
        'employee_code': emp.get('employee_id') if emp else None,
        'year': year,
        'months': months,
        'total_payslips': len(payslips),
        'released_payslips': sum(1 for ps in payslips if ps['status'] == 'released'),
    })
