"""
expenses.py — Employee expense / reimbursement workflow.

Routing mirrors leaves.py: employee -> manager -> HR, with the same
manager-less fallback (routes straight to HR if the employee has no
manager_id). Receipt upload follows documents.py's inline-GridFS pattern.
"""

from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from bson import ObjectId
from io import BytesIO
import gridfs

from services.notify import notify, notify_employee

expenses_bp = Blueprint('expenses', __name__)

HR_ROLES = {'admin', 'hr', 'hr_head'}
CATEGORIES = {'Travel', 'Food', 'Accommodation', 'Office Supplies', 'Client Entertainment', 'Other'}
ALLOWED_EXT = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'}


def _get_fs():
    return gridfs.GridFS(current_app.db, collection='expenses_fs')


def _s(doc):
    doc['_id'] = str(doc['_id'])
    return doc


def _get_caller(db, uid):
    user = db.users.find_one({'_id': ObjectId(uid)})
    if not user:
        return None, (jsonify({'error': 'User not found'}), 404)
    return user, None


def _enrich(exp, db):
    emp = db.employees.find_one({'_id': ObjectId(exp['employee_id'])})
    if emp:
        exp['employee_name'] = emp.get('name', '')
        exp['employee_code'] = emp.get('employee_id', '')
        exp['department'] = emp.get('department', '')
    return exp


@expenses_bp.route('/', methods=['GET'])
@jwt_required()
def list_expenses():
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err

    role = caller.get('role')
    query = {}
    allowed_ids = None  # None = unrestricted (HR-tier)

    if role in HR_ROLES:
        pass  # all expenses
    elif role == 'manager':
        mgr_ref = caller.get('employee_ref', '')
        allowed_ids = [str(e['_id']) for e in db.employees.find({'manager_id': mgr_ref})]
        if mgr_ref:
            allowed_ids.append(mgr_ref)
        query['employee_id'] = {'$in': allowed_ids}
    else:
        emp_ref = caller.get('employee_ref')
        if not emp_ref:
            return jsonify({'error': 'No employee record linked to this account'}), 400
        allowed_ids = [emp_ref]
        query['employee_id'] = emp_ref

    employee_id = request.args.get('employee_id')
    if employee_id:
        if allowed_ids is not None and employee_id not in allowed_ids:
            return jsonify({'error': 'Access denied'}), 403
        query['employee_id'] = employee_id

    status = request.args.get('status')
    if status:
        query['status'] = status
    year = request.args.get('year')
    month = request.args.get('month')
    if year:
        query['expense_date'] = {'$regex': f"^{year}" + (f"-{int(month):02d}" if month else '')}

    expenses = list(db.expenses.find(query).sort('created_at', -1))
    return jsonify([_enrich(_s(e), db) for e in expenses])


@expenses_bp.route('/<expense_id>', methods=['GET'])
@jwt_required()
def get_expense(expense_id):
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err

    expense = db.expenses.find_one({'_id': ObjectId(expense_id)})
    if not expense:
        return jsonify({'error': 'Expense not found'}), 404

    role = caller.get('role')
    if role not in HR_ROLES:
        if role == 'manager':
            mgr_ref = caller.get('employee_ref', '')
            emp = db.employees.find_one({'_id': ObjectId(expense['employee_id'])})
            allowed = expense['employee_id'] == mgr_ref or (emp and emp.get('manager_id') == mgr_ref)
        else:
            allowed = expense['employee_id'] == caller.get('employee_ref')
        if not allowed:
            return jsonify({'error': 'Access denied'}), 403

    return jsonify(_enrich(_s(expense), db))


@expenses_bp.route('/<expense_id>/receipt', methods=['GET'])
@jwt_required()
def get_receipt(expense_id):
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err

    expense = db.expenses.find_one({'_id': ObjectId(expense_id)})
    if not expense or not expense.get('receipt_gridfs_id'):
        return jsonify({'error': 'Receipt not found'}), 404

    role = caller.get('role')
    if role not in HR_ROLES:
        if role == 'manager':
            mgr_ref = caller.get('employee_ref', '')
            emp = db.employees.find_one({'_id': ObjectId(expense['employee_id'])})
            allowed = expense['employee_id'] == mgr_ref or (emp and emp.get('manager_id') == mgr_ref)
        else:
            allowed = expense['employee_id'] == caller.get('employee_ref')
        if not allowed:
            return jsonify({'error': 'Access denied'}), 403

    fs = _get_fs()
    try:
        f = fs.get(ObjectId(expense['receipt_gridfs_id']))
    except Exception:
        return jsonify({'error': 'Receipt file missing'}), 404
    return send_file(BytesIO(f.read()), download_name=expense.get('receipt_filename', 'receipt'),
                      mimetype=f.content_type or 'application/octet-stream')


@expenses_bp.route('/', methods=['POST'])
@jwt_required()
def create_expense():
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err

    emp_ref = caller.get('employee_ref')
    if not emp_ref:
        return jsonify({'error': 'No employee record linked to this account'}), 400

    data = request.form if request.files else (request.json or {})
    category = (data.get('category') or '').strip()
    amount = data.get('amount')
    expense_date = (data.get('expense_date') or '').strip()
    description = (data.get('description') or '').strip()

    if category not in CATEGORIES:
        return jsonify({'error': f'category must be one of {sorted(CATEGORIES)}'}), 400
    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError()
    except (TypeError, ValueError):
        return jsonify({'error': 'amount must be a positive number'}), 400
    if not expense_date:
        return jsonify({'error': 'expense_date is required'}), 400

    emp = db.employees.find_one({'_id': ObjectId(emp_ref)})
    manager_id = emp.get('manager_id') if emp else None
    status = 'pending_manager' if manager_id else 'pending_hr'

    doc = {
        'employee_id': emp_ref, 'category': category, 'amount': amount,
        'currency': data.get('currency', 'INR'), 'expense_date': expense_date,
        'description': description, 'receipt_gridfs_id': None, 'receipt_filename': None,
        'status': status,
        'approval_history': [{'action': 'submitted', 'by': uid, 'timestamp': datetime.utcnow().isoformat()}],
        'created_at': datetime.utcnow(), 'updated_at': datetime.utcnow(),
    }

    file = request.files.get('receipt') if request.files else None
    if file and file.filename:
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
        if ext not in ALLOWED_EXT:
            return jsonify({'error': f'Receipt must be one of: {", ".join(sorted(ALLOWED_EXT))}'}), 400
        fs = _get_fs()
        gid = fs.put(file.read(), filename=file.filename, content_type=file.content_type,
                     user_id=uid, uploaded_at=datetime.utcnow())
        doc['receipt_gridfs_id'] = str(gid)
        doc['receipt_filename'] = file.filename

    result = db.expenses.insert_one(doc)

    emp_name = emp.get('name', 'An employee') if emp else 'An employee'
    if status == 'pending_manager':
        mgr_user = db.users.find_one({'employee_ref': manager_id})
        if mgr_user:
            notify(db, type='expense', title='Expense approval needed',
                   message=f"{emp_name} submitted a {category} expense of {doc['currency']} {amount} — awaiting your approval.",
                   user_ids=[str(mgr_user['_id'])], link='/expenses', related_id=str(result.inserted_id))
    else:
        notify(db, type='expense', title='Expense submitted',
               message=f"{emp_name} submitted a {category} expense of {doc['currency']} {amount}.",
               roles=['hr', 'hr_head', 'admin'], link='/expenses', related_id=str(result.inserted_id))

    doc['_id'] = str(result.inserted_id)
    return jsonify(doc), 201


def _decide(db, expense_id, expected_status):
    try:
        expense = db.expenses.find_one({'_id': ObjectId(expense_id)})
    except Exception:
        return None, (jsonify({'error': 'Invalid expense id'}), 400)
    if not expense:
        return None, (jsonify({'error': 'Expense not found'}), 404)
    if expense.get('status') != expected_status:
        return None, (jsonify({'error': f"Status is '{expense.get('status')}', expected {expected_status}"}), 400)
    return expense, None


@expenses_bp.route('/<expense_id>/manager-action', methods=['POST'])
@jwt_required()
def manager_action(expense_id):
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in ('manager', 'hr_head', 'admin'):
        return jsonify({'error': 'Access denied'}), 403

    expense, derr = _decide(db, expense_id, 'pending_manager')
    if derr: return derr

    if caller.get('role') == 'manager':
        mgr_ref = caller.get('employee_ref', '')
        emp = db.employees.find_one({'_id': ObjectId(expense['employee_id'])})
        if not emp or emp.get('manager_id') != mgr_ref:
            return jsonify({'error': "You can only act on your own team's expenses"}), 403
        if expense['employee_id'] == mgr_ref:
            return jsonify({'error': 'You cannot act on your own expense'}), 403

    data = request.json or {}
    act, remarks = data.get('action'), (data.get('remarks') or '').strip()
    if act not in ('approve', 'reject'):
        return jsonify({'error': "action must be 'approve' or 'reject'"}), 400
    if act == 'reject' and not remarks:
        return jsonify({'error': 'Rejection reason is required'}), 400

    new_status = 'pending_hr' if act == 'approve' else 'rejected'
    db.expenses.update_one({'_id': ObjectId(expense_id)}, {
        '$set': {'status': new_status, 'updated_at': datetime.utcnow()},
        '$push': {'approval_history': {'action': act, 'by': uid, 'remarks': remarks, 'timestamp': datetime.utcnow().isoformat()}},
    })

    if act == 'approve':
        notify(db, type='expense', title='Expense approval needed',
               message=f"An expense forwarded by {caller.get('name', 'a manager')} needs HR approval.",
               roles=['hr', 'hr_head', 'admin'], link='/expenses', related_id=expense_id)
    else:
        notify_employee(db, expense['employee_id'], type='expense', title='Expense rejected',
                         message=f"Your {expense.get('category')} expense was rejected by your manager — {remarks}",
                         link='/expenses', related_id=expense_id)

    return jsonify({'message': f'Expense {act}d', 'new_status': new_status})


@expenses_bp.route('/<expense_id>/hr-action', methods=['POST'])
@jwt_required()
def hr_action(expense_id):
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Access denied'}), 403

    expense, derr = _decide(db, expense_id, 'pending_hr')
    if derr: return derr

    data = request.json or {}
    act, remarks = data.get('action'), (data.get('remarks') or '').strip()
    if act not in ('approve', 'reject'):
        return jsonify({'error': "action must be 'approve' or 'reject'"}), 400
    if act == 'reject' and not remarks:
        return jsonify({'error': 'Rejection reason is required'}), 400

    new_status = 'approved' if act == 'approve' else 'rejected'
    db.expenses.update_one({'_id': ObjectId(expense_id)}, {
        '$set': {'status': new_status, 'updated_at': datetime.utcnow()},
        '$push': {'approval_history': {'action': act, 'by': uid, 'remarks': remarks, 'timestamp': datetime.utcnow().isoformat()}},
    })

    notify_employee(db, expense['employee_id'], type='expense', title=f'Expense {new_status}',
                     message=f"Your {expense.get('category')} expense of {expense.get('currency')} {expense.get('amount')} was {new_status}."
                             + (f' {remarks}' if act == 'reject' else ''),
                     link='/expenses', related_id=expense_id)

    return jsonify({'message': f'Expense {act}d', 'new_status': new_status})


@expenses_bp.route('/<expense_id>/mark-paid', methods=['POST'])
@jwt_required()
def mark_paid(expense_id):
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Access denied'}), 403

    expense, derr = _decide(db, expense_id, 'approved')
    if derr: return derr

    data = request.json or {}
    db.expenses.update_one({'_id': ObjectId(expense_id)}, {
        '$set': {
            'status': 'paid', 'paid_by': uid, 'paid_at': datetime.utcnow(),
            'payment_reference': data.get('payment_reference', ''), 'updated_at': datetime.utcnow(),
        },
        '$push': {'approval_history': {'action': 'paid', 'by': uid, 'timestamp': datetime.utcnow().isoformat()}},
    })

    notify_employee(db, expense['employee_id'], type='expense', title='Expense paid',
                     message=f"Your {expense.get('category')} expense of {expense.get('currency')} {expense.get('amount')} has been paid.",
                     link='/expenses', related_id=expense_id)

    return jsonify({'message': 'Expense marked as paid', 'new_status': 'paid'})


@expenses_bp.route('/<expense_id>', methods=['DELETE'])
@jwt_required()
def delete_expense(expense_id):
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err

    expense = db.expenses.find_one({'_id': ObjectId(expense_id)})
    if not expense:
        return jsonify({'error': 'Expense not found'}), 404
    if expense.get('employee_id') != caller.get('employee_ref'):
        return jsonify({'error': 'Access denied'}), 403
    if expense.get('status') != 'pending_manager':
        return jsonify({'error': 'Can only delete an expense while it is pending manager review'}), 400

    db.expenses.delete_one({'_id': ObjectId(expense_id)})
    return jsonify({'message': 'Expense deleted'})
