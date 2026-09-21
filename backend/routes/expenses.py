"""
routes/expenses.py — employee reimbursement/expense claims: submit with a
receipt, approve/reject, mark reimbursed once paid.
"""
import gridfs
from datetime import datetime

from bson import ObjectId
from flask import Blueprint, current_app, g, jsonify, request

from auth_utils import require_permission, tenant_scoped
from tenant_scope import get_db
from audit import log_audit

expenses_bp = Blueprint('expenses', __name__)

CATEGORIES = {'travel', 'food', 'accommodation', 'office_supplies', 'communication', 'other'}


def _fs():
    return gridfs.GridFS(current_app.db, collection='expenses_fs')


def _serialize(claim, db):
    claim['_id'] = str(claim['_id'])
    emp = db.employees.find_one({'_id': ObjectId(claim['employee_id'])})
    claim['employee_name'] = emp.get('name') if emp else 'Unknown'
    claim['employee_code'] = emp.get('employee_id') if emp else ''
    for f in ('created_at', 'updated_at', 'reviewed_at', 'reimbursed_at'):
        if claim.get(f):
            claim[f] = claim[f].isoformat()
    return claim


@expenses_bp.route('/', methods=['GET'])
@tenant_scoped
def list_claims():
    db = get_db()
    caller = g.caller
    query = {}
    if 'expenses.approve' not in (g.caller_permissions or set()):
        emp_ref = caller.get('employee_ref')
        if not emp_ref:
            return jsonify([])
        query['employee_id'] = emp_ref
    status = request.args.get('status')
    if status:
        query['status'] = status
    claims = list(db.expense_claims.find(query).sort('created_at', -1))
    return jsonify([_serialize(c, db) for c in claims])


@expenses_bp.route('/', methods=['POST'])
@tenant_scoped
def submit_claim():
    db = get_db()
    caller = g.caller
    emp_ref = caller.get('employee_ref')
    if not emp_ref:
        return jsonify({'error': 'No employee record linked to this account'}), 400

    is_multipart = bool(request.files) or bool(request.form)
    src = request.form if is_multipart else (request.json or {})
    category = src.get('category')
    amount_raw = src.get('amount')
    description = src.get('description', '')
    expense_date = src.get('expense_date')

    if category not in CATEGORIES:
        return jsonify({'error': f'category must be one of {sorted(CATEGORIES)}'}), 400
    try:
        amount = float(amount_raw)
    except (TypeError, ValueError):
        return jsonify({'error': 'amount is required and must be a number'}), 400
    if amount <= 0:
        return jsonify({'error': 'amount must be positive'}), 400

    receipt_gid = None
    if 'receipt' in request.files:
        f = request.files['receipt']
        receipt_gid = str(_fs().put(f.read(), filename=f.filename))

    now = datetime.utcnow()
    doc = {
        'employee_id': emp_ref, 'category': category, 'amount': amount,
        'description': description or '', 'expense_date': expense_date,
        'receipt_gridfs_id': receipt_gid, 'status': 'pending_approval',
        'created_at': now, 'updated_at': now,
    }
    result = db.expense_claims.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify(_serialize(doc, db)), 201


@expenses_bp.route('/<claim_id>/receipt', methods=['GET'])
@tenant_scoped
def download_receipt(claim_id):
    db = get_db()
    caller = g.caller
    claim = db.expense_claims.find_one({'_id': ObjectId(claim_id)})
    if not claim:
        return jsonify({'error': 'Not found'}), 404
    if 'expenses.approve' not in (g.caller_permissions or set()) and claim['employee_id'] != caller.get('employee_ref'):
        return jsonify({'error': 'Access denied'}), 403
    if not claim.get('receipt_gridfs_id'):
        return jsonify({'error': 'No receipt attached'}), 404
    from services.gridfs_storage import serve_from_gridfs
    return serve_from_gridfs(claim['receipt_gridfs_id'], 'receipt', collection='expenses_fs', as_attachment=False)


@expenses_bp.route('/<claim_id>/action', methods=['POST'])
@require_permission('expenses.approve')
def action(claim_id):
    db = get_db()
    caller = g.caller
    claim = db.expense_claims.find_one({'_id': ObjectId(claim_id)})
    if not claim:
        return jsonify({'error': 'Not found'}), 404
    if claim['status'] != 'pending_approval':
        return jsonify({'error': f"Cannot act on a '{claim['status']}' claim"}), 400

    data = request.json or {}
    act = data.get('action')
    remarks = data.get('remarks', '').strip()
    if act not in ('approve', 'reject'):
        return jsonify({'error': "action must be 'approve' or 'reject'"}), 400
    if act == 'reject' and not remarks:
        return jsonify({'error': 'Rejection reason is required'}), 400

    new_status = 'approved' if act == 'approve' else 'rejected'
    now = datetime.utcnow()
    db.expense_claims.update_one({'_id': ObjectId(claim_id)}, {'$set': {
        'status': new_status, 'remarks': remarks,
        'reviewed_by': str(caller['_id']), 'reviewed_at': now, 'updated_at': now,
    }})
    log_audit(db, g.tenant_id, caller, f'expense.{act}d', entity_type='expense_claim', entity_id=claim_id)
    return jsonify(_serialize(db.expense_claims.find_one({'_id': ObjectId(claim_id)}), db))


@expenses_bp.route('/<claim_id>/reimburse', methods=['POST'])
@require_permission('expenses.approve')
def reimburse(claim_id):
    db = get_db()
    claim = db.expense_claims.find_one({'_id': ObjectId(claim_id)})
    if not claim:
        return jsonify({'error': 'Not found'}), 404
    if claim['status'] != 'approved':
        return jsonify({'error': "Only approved claims can be marked reimbursed"}), 400

    now = datetime.utcnow()
    db.expense_claims.update_one({'_id': ObjectId(claim_id)}, {'$set': {
        'status': 'reimbursed', 'reimbursed_at': now, 'updated_at': now,
    }})
    return jsonify(_serialize(db.expense_claims.find_one({'_id': ObjectId(claim_id)}), db))
