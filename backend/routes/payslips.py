"""
payslips.py — Employee Payslip Management
===========================================
Role-based payslip management:
  - Employees: view their own payslips
  - Managers: view their own + their direct reports' payslips
  - HR: view all payslips, manage payslips (create/edit/approve/release)
  - HR Head / Admin: full access including approval workflow
"""

from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from bson import ObjectId
import os, tempfile, logging

from services.notify import notify_employee
from services.payroll import compute_payslip_defaults
from services.payslip_generator import generate_payslip_docx
from services.letter_generator import generate_letter_pdf

payslips_bp = Blueprint('payslips', __name__)
log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def serialize_payslip(payslip):
    """Convert payslip doc to JSON-serializable dict"""
    payslip['_id'] = str(payslip['_id'])
    if payslip.get('employee_id'):
        payslip['employee_id'] = str(payslip['employee_id']) if isinstance(payslip['employee_id'], ObjectId) else payslip['employee_id']
    return payslip


def _get_caller(db, uid):
    """Fetch caller user and handle not found"""
    user = db.users.find_one({'_id': ObjectId(uid)})
    if not user:
        return None, (jsonify({'error': 'User not found'}), 404)
    return user, None


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
@jwt_required()
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
    db = current_app.db
    uid = get_jwt_identity()
    
    caller, err = _get_caller(db, uid)
    if err:
        return err
    
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
@jwt_required()
def get_payslip(payslip_id):
    """Get a specific payslip"""
    db = current_app.db
    uid = get_jwt_identity()
    
    caller, err = _get_caller(db, uid)
    if err:
        return err
    
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


@payslips_bp.route('/<payslip_id>/download', methods=['GET'])
@jwt_required()
def download_payslip(payslip_id):
    """Generate the payslip document on demand (docx or pdf) and stream it —
    generated fresh each time rather than cached, since a draft/generated
    payslip's numbers can still change before it's approved."""
    db = current_app.db
    uid = get_jwt_identity()
    fmt = request.args.get('format', 'pdf')

    caller, err = _get_caller(db, uid)
    if err:
        return err

    try:
        payslip = db.payslips.find_one({'_id': ObjectId(payslip_id)})
    except Exception:
        return jsonify({'error': 'Invalid payslip ID'}), 400
    if not payslip:
        return jsonify({'error': 'Payslip not found'}), 404

    if not _can_view_payslip(caller, payslip['employee_id'], db):
        return jsonify({'error': 'Access denied'}), 403

    emp = db.employees.find_one({'_id': ObjectId(payslip['employee_id'])})
    if emp:
        payslip['employee_name'] = emp.get('name')
        payslip['employee_code'] = emp.get('employee_id')
        payslip['designation'] = emp.get('designation')
        payslip['department'] = emp.get('department')

    tmp_dir = tempfile.mkdtemp()
    base_name = f"payslip_{payslip.get('employee_code') or payslip['employee_id']}_{payslip.get('month')}_{payslip.get('year')}"
    docx_path = os.path.join(tmp_dir, base_name + '.docx')
    try:
        generate_payslip_docx(payslip, docx_path)
    except Exception as e:
        # Without this, a bad field on the payslip document turns into an
        # unhandled 500 with an HTML body, which the frontend (expecting
        # JSON) can't parse — it just shows a blank "Download failed."
        log.error(f'Payslip DOCX generation failed for {payslip_id}: {e}')
        return jsonify({'error': f'Could not generate payslip document: {e}'}), 500

    if fmt == 'docx':
        return send_file(
            docx_path, as_attachment=True, download_name=base_name + '.docx',
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )

    pdf_path = os.path.join(tmp_dir, base_name + '.pdf')
    result = generate_letter_pdf(docx_path, pdf_path)
    if not result:
        return jsonify({'error': 'PDF conversion is unavailable on this server. Try format=docx instead.'}), 503

    return send_file(result, as_attachment=True, download_name=base_name + '.pdf', mimetype='application/pdf')


@payslips_bp.route('/', methods=['POST'])
@jwt_required()
def create_payslip():
    """Create a new payslip (HR only)"""
    db = current_app.db
    uid = get_jwt_identity()
    
    caller, err = _get_caller(db, uid)
    if err:
        return err
    
    # Only HR, HR Head, and Admin can create payslips
    if caller.get('role') not in ('hr', 'hr_head', 'admin'):
        return jsonify({'error': 'Access denied'}), 403
    
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

    # Salary structure (from the employee's CTC, same formula as offer
    # letters) + actual attendance for the period — HR no longer has to
    # retype numbers from memory. Any field HR does supply overrides this.
    defaults = compute_payslip_defaults(db, emp, int(data['year']), int(data['month']))

    def _val(key):
        v = data.get(key)
        return defaults[key] if v in (None, '') else v

    # Build payslip document
    payslip = {
        'employee_id': data['employee_id'],
        'month': data['month'],
        'year': data['year'],
        'status': 'draft',
        'basic': _val('basic'),
        'hra': _val('hra'),
        'da': _val('da'),
        'allowances': _val('allowances'),
        'pf_deduction': _val('pf_deduction'),
        'esi_deduction': _val('esi_deduction'),
        'income_tax': _val('income_tax'),
        'other_deductions': _val('other_deductions'),
        'working_days': _val('working_days'),
        'present_days': _val('present_days'),
        'absent_days': _val('absent_days'),
        'leave_days': _val('leave_days'),
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


@payslips_bp.route('/auto-fill', methods=['GET'])
@jwt_required()
def auto_fill_payslip():
    """
    Suggested earnings/attendance for one employee/month, computed from
    their salary structure + actual attendance — used by the "Create
    Payslip" form so HR reviews real numbers instead of starting blank.
    """
    db = current_app.db
    uid = get_jwt_identity()

    caller, err = _get_caller(db, uid)
    if err:
        return err
    if caller.get('role') not in ('hr', 'hr_head', 'admin'):
        return jsonify({'error': 'Access denied'}), 403

    employee_id = request.args.get('employee_id')
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    if not (employee_id and year and month):
        return jsonify({'error': 'employee_id, year and month are required'}), 400

    try:
        emp = db.employees.find_one({'_id': ObjectId(employee_id)})
    except Exception:
        return jsonify({'error': 'Invalid employee_id'}), 400
    if not emp:
        return jsonify({'error': 'Employee not found'}), 404

    return jsonify(compute_payslip_defaults(db, emp, year, month))


def _derive_totals(payslip):
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
    return payslip


@payslips_bp.route('/run', methods=['POST'])
@jwt_required()
def run_payroll():
    """
    Generate draft payslips for every active employee for one month in a
    single action — a real payroll cycle runs the whole company at once,
    not employee-by-employee. Employees who already have a payslip for
    that period (any status) are skipped, not overwritten.
    """
    db = current_app.db
    uid = get_jwt_identity()

    caller, err = _get_caller(db, uid)
    if err:
        return err
    if caller.get('role') not in ('hr', 'hr_head', 'admin'):
        return jsonify({'error': 'Access denied'}), 403

    data = request.json or {}
    year = data.get('year')
    month = data.get('month')
    if not year or not month:
        return jsonify({'error': 'year and month are required'}), 400
    year, month = int(year), int(month)

    employees = list(db.employees.find({'status': 'active'}))
    existing_ids = {
        ps['employee_id'] for ps in db.payslips.find(
            {'year': year, 'month': month}, {'employee_id': 1}
        )
    }

    created, skipped = [], 0
    for emp in employees:
        emp_id = str(emp['_id'])
        if emp_id in existing_ids:
            skipped += 1
            continue

        defaults = compute_payslip_defaults(db, emp, year, month)
        # UI-only hints for the create-payslip form (has_salary_source, the
        # unprorated CTC-derived figures, proration) aren't payslip fields —
        # drop them before they get persisted onto the stored document.
        for _k in ('has_salary_source', 'ctc_annual', 'basic_monthly_full', 'hra_monthly_full', 'da_monthly_full', 'proration'):
            defaults.pop(_k, None)
        payslip = {
            'employee_id': emp_id,
            'month': month,
            'year': year,
            'status': 'draft',
            'remarks': '',
            'generated_by': str(uid),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            **defaults,
        }
        _derive_totals(payslip)

        result = db.payslips.insert_one(payslip)
        created.append(str(result.inserted_id))

    return jsonify({
        'message': f'Payroll run complete for {month}/{year}: {len(created)} created, {skipped} already existed.',
        'created_count': len(created),
        'skipped_count': skipped,
    }), 201


@payslips_bp.route('/<payslip_id>', methods=['PUT'])
@jwt_required()
def update_payslip(payslip_id):
    """Update payslip details (HR only, before approval)"""
    db = current_app.db
    uid = get_jwt_identity()
    
    caller, err = _get_caller(db, uid)
    if err:
        return err
    
    # Only HR, HR Head, and Admin can update
    if caller.get('role') not in ('hr', 'hr_head', 'admin'):
        return jsonify({'error': 'Access denied'}), 403
    
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
@jwt_required()
def approve_payslip(payslip_id):
    """Approve payslip (HR Head / Admin only)"""
    db = current_app.db
    uid = get_jwt_identity()
    
    caller, err = _get_caller(db, uid)
    if err:
        return err
    
    # Only HR Head and Admin can approve
    if caller.get('role') not in ('hr_head', 'admin'):
        return jsonify({'error': 'Access denied'}), 403
    
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
@jwt_required()
def release_payslip(payslip_id):
    """Release payslip to employee (HR / HR Head / Admin)"""
    db = current_app.db
    uid = get_jwt_identity()
    
    caller, err = _get_caller(db, uid)
    if err:
        return err
    
    # Only HR, HR Head, and Admin can release
    if caller.get('role') not in ('hr', 'hr_head', 'admin'):
        return jsonify({'error': 'Access denied'}), 403
    
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

    month_name = datetime(int(payslip['year']), int(payslip['month']), 1).strftime('%B %Y')
    notify_employee(
        db, payslip['employee_id'], type='payslip', title='Payslip released',
        message=f'Your payslip for {month_name} has been released.',
        link='/payslip', related_id=payslip_id,
    )

    return jsonify(serialize_payslip(payslip))


@payslips_bp.route('/<payslip_id>', methods=['DELETE'])
@jwt_required()
def delete_payslip(payslip_id):
    """Delete payslip (Admin / HR Head only, draft status only)"""
    db = current_app.db
    uid = get_jwt_identity()
    
    caller, err = _get_caller(db, uid)
    if err:
        return err
    
    # Only Admin and HR Head can delete
    if caller.get('role') not in ('admin', 'hr_head'):
        return jsonify({'error': 'Access denied'}), 403
    
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
@jwt_required()
def get_employee_payslip_summary(employee_id):
    """Get payslip summary for an employee (year/month counts)"""
    db = current_app.db
    uid = get_jwt_identity()
    
    caller, err = _get_caller(db, uid)
    if err:
        return err
    
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
