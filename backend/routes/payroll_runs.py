"""
routes/payroll_runs.py — batch payroll processing: compute a payslip for
every active employee for a given month in one action, instead of
one-by-one manual entry (routes/payslips.py still supports that path for
corrections). Uses payroll_engine.py for the actual PF/ESI/PT/TDS/LOP
math — see its module docstring for the compliance notice.

Working-days approximation: LOP is computed against the full calendar
month (not the tenant's holiday calendar or weekly-off pattern) — a
known simplification; a run's numbers should be spot-checked before
finalizing, especially for months with more holidays than usual.
"""
import csv
import io
from datetime import datetime

from bson import ObjectId
from flask import Blueprint, Response, g, jsonify, request

from auth_utils import require_permission, tenant_scoped
from tenant_scope import get_db
from payroll_engine import compute_lop_days, compute_payslip_breakdown, default_payroll_config
from audit import log_audit

payroll_runs_bp = Blueprint('payroll_runs', __name__)


def _merged_payroll_config(company):
    config = (company or {}).get('payroll_config') or {}
    merged = default_payroll_config()
    for key in ('pf', 'esi', 'professional_tax', 'tds'):
        if config.get(key):
            merged[key] = {**merged[key], **config[key]}
    return merged


def _serialize(run):
    run['_id'] = str(run['_id'])
    for f in ('created_at', 'updated_at', 'finalized_at'):
        if run.get(f):
            run[f] = run[f].isoformat()
    return run


@payroll_runs_bp.route('/', methods=['GET'])
@tenant_scoped
def list_runs():
    db = get_db()
    runs = list(db.payroll_runs.find({}).sort([('year', -1), ('month', -1)]))
    return jsonify([_serialize(r) for r in runs])


@payroll_runs_bp.route('/<run_id>', methods=['GET'])
@tenant_scoped
def get_run(run_id):
    db = get_db()
    run = db.payroll_runs.find_one({'_id': ObjectId(run_id)})
    if not run:
        return jsonify({'error': 'Not found'}), 404
    payslips = list(db.payslips.find({'payroll_run_id': run_id}))
    for p in payslips:
        p['_id'] = str(p['_id'])
        emp = db.employees.find_one({'_id': ObjectId(p['employee_id'])})
        p['employee_name'] = emp.get('name') if emp else 'Unknown'
        p['employee_code'] = emp.get('employee_id') if emp else ''
    out = _serialize(run)
    out['payslips'] = payslips
    return jsonify(out)


@payroll_runs_bp.route('/', methods=['POST'])
@require_permission('payroll.run')
def create_run():
    db = get_db()
    data = request.json or {}
    try:
        month = int(data.get('month'))
        year = int(data.get('year'))
    except (TypeError, ValueError):
        return jsonify({'error': 'month and year are required integers'}), 400
    if not (1 <= month <= 12):
        return jsonify({'error': 'month must be 1-12'}), 400

    existing = db.payroll_runs.find_one({'month': month, 'year': year})
    if existing and existing.get('status') == 'finalized':
        return jsonify({'error': 'This month has already been finalized. Delete-and-rerun is not supported once finalized.'}), 400

    from flask import current_app
    from feature_gating import company_features
    company = current_app.db.companies.find_one({'_id': ObjectId(g.tenant_id)})
    if 'feature.payroll_runs' not in company_features(current_app.db, company):
        return jsonify({'error': 'Batch payroll runs are not available on this plan — upgrade to Pro or Enterprise.'}), 403
    payroll_config = _merged_payroll_config(company)

    employees = list(db.employees.find({'status': 'active'}))
    total_gross = 0.0
    total_net = 0.0
    now = datetime.utcnow()

    if existing:
        run_id = existing['_id']
        db.payslips.delete_many({'payroll_run_id': str(run_id), 'status': 'draft'})
    else:
        run_id = db.payroll_runs.insert_one({
            'month': month, 'year': year, 'status': 'draft',
            'created_by': str(g.caller['_id']), 'created_at': now, 'updated_at': now,
        }).inserted_id

    for emp in employees:
        emp_id = str(emp['_id'])
        if db.payslips.find_one({'employee_id': emp_id, 'month': month, 'year': year, 'status': {'$ne': 'draft'}}):
            continue  # a manually-created/approved payslip already covers this employee this month — don't clobber it

        lop = compute_lop_days(db, emp_id, month, year)
        breakdown = compute_payslip_breakdown(emp, payroll_config, lop_days=lop['lop_days'], working_days=lop['working_days'])

        payslip = {
            'employee_id': emp_id, 'month': month, 'year': year, 'status': 'draft',
            'payroll_run_id': str(run_id),
            'working_days': lop['working_days'], 'present_days': lop['present_days'],
            'leave_days': lop['approved_leave_days'], 'absent_days': lop['lop_days'],
            **breakdown,
            'generated_by': str(g.caller['_id']),
            'created_at': now, 'updated_at': now,
        }
        db.payslips.update_one(
            {'employee_id': emp_id, 'month': month, 'year': year},
            {'$set': payslip}, upsert=True,
        )
        total_gross += breakdown['gross_salary']
        total_net += breakdown['net_salary']

    db.payroll_runs.update_one({'_id': run_id}, {'$set': {
        'employee_count': len(employees), 'total_gross': round(total_gross), 'total_net': round(total_net),
        'updated_at': datetime.utcnow(),
    }})
    log_audit(db, g.tenant_id, g.caller, 'payroll.run_created', entity_type='payroll_run', entity_id=run_id,
              details={'month': month, 'year': year, 'employee_count': len(employees)})

    return jsonify(_serialize(db.payroll_runs.find_one({'_id': run_id}))), 201


@payroll_runs_bp.route('/<run_id>/finalize', methods=['POST'])
@require_permission('payslips.approve')
def finalize_run(run_id):
    db = get_db()
    run = db.payroll_runs.find_one({'_id': ObjectId(run_id)})
    if not run:
        return jsonify({'error': 'Not found'}), 404
    if run['status'] == 'finalized':
        return jsonify({'error': 'Already finalized'}), 400

    now = datetime.utcnow()
    db.payslips.update_many(
        {'payroll_run_id': run_id, 'status': 'draft'},
        {'$set': {'status': 'approved', 'approved_by': str(g.caller['_id']), 'approved_at': now, 'updated_at': now}},
    )
    db.payroll_runs.update_one({'_id': ObjectId(run_id)}, {'$set': {
        'status': 'finalized', 'finalized_by': str(g.caller['_id']), 'finalized_at': now, 'updated_at': now,
    }})
    log_audit(db, g.tenant_id, g.caller, 'payroll.run_finalized', entity_type='payroll_run', entity_id=run_id)
    return jsonify(_serialize(db.payroll_runs.find_one({'_id': ObjectId(run_id)})))


@payroll_runs_bp.route('/<run_id>/bank-file', methods=['GET'])
@require_permission('payroll.run')
def bank_file(run_id):
    """Generic CSV export for salary disbursal — column layout is a
    reasonable default (employee code, name, bank name, account number,
    IFSC, net pay); reshape per your bank's actual bulk-upload template
    before use."""
    db = get_db()
    run = db.payroll_runs.find_one({'_id': ObjectId(run_id)})
    if not run:
        return jsonify({'error': 'Not found'}), 404

    payslips = list(db.payslips.find({'payroll_run_id': run_id}))
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(['employee_code', 'employee_name', 'bank_name', 'account_number', 'ifsc', 'net_salary'])
    missing_bank_details = 0
    for p in payslips:
        emp = db.employees.find_one({'_id': ObjectId(p['employee_id'])}) or {}
        if not emp.get('bank_account_number'):
            missing_bank_details += 1
        writer.writerow([
            emp.get('employee_id', ''), emp.get('name', ''),
            emp.get('bank_name', ''), emp.get('bank_account_number', ''), emp.get('bank_ifsc', ''),
            p.get('net_salary', 0),
        ])

    resp = Response(buf.getvalue(), mimetype='text/csv')
    resp.headers['Content-Disposition'] = f'attachment; filename=bank_transfer_{run["year"]}_{run["month"]:02d}.csv'
    resp.headers['X-Missing-Bank-Details'] = str(missing_bank_details)
    return resp
