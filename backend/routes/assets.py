"""
assets.py — Organization > Assets: company equipment inventory and
employee assignment tracking.
"""
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request

from auth_utils import require_role, tenant_scoped
from tenant_scope import get_db

assets_bp = Blueprint('assets', __name__)

CATEGORIES = {'laptop', 'monitor', 'phone', 'peripheral', 'furniture', 'vehicle', 'other'}
STATUSES = {'available', 'assigned', 'maintenance', 'retired'}
MANAGE_ROLES = ('admin', 'hr', 'hr_head')


def _serialize(a):
    a['_id'] = str(a['_id'])
    for k in ('created_at', 'updated_at', 'assigned_date'):
        if a.get(k) and isinstance(a[k], datetime):
            a[k] = a[k].isoformat()
    return a


@assets_bp.route('/', methods=['GET'])
@tenant_scoped
def list_assets():
    db = get_db()
    query = {}
    status = request.args.get('status')
    if status:
        query['status'] = status
    assigned_to = request.args.get('assigned_to')
    if assigned_to:
        query['assigned_to'] = assigned_to

    assets = list(db.assets.find(query).sort('created_at', -1))
    emp_ids = list({a['assigned_to'] for a in assets if a.get('assigned_to')})
    emps = {}
    if emp_ids:
        try:
            emps = {str(e['_id']): e for e in db.employees.find({'_id': {'$in': [ObjectId(i) for i in emp_ids]}})}
        except InvalidId:
            emps = {}

    rows = []
    for a in assets:
        row = _serialize(a)
        emp = emps.get(row.get('assigned_to'))
        row['assigned_to_name'] = emp.get('name') if emp else None
        rows.append(row)
    return jsonify(rows)


@assets_bp.route('/', methods=['POST'])
@require_role(*MANAGE_ROLES)
def create_asset():
    db = get_db()
    data = request.json or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'name is required'}), 400
    category = data.get('category', 'other')
    if category not in CATEGORIES:
        return jsonify({'error': f"category must be one of {sorted(CATEGORIES)}"}), 400

    now = datetime.utcnow()
    doc = {
        'name': name,
        'category': category,
        'serial_number': data.get('serial_number', ''),
        'status': 'available',
        'assigned_to': None,
        'assigned_date': None,
        'purchase_date': data.get('purchase_date'),
        'notes': data.get('notes', ''),
        'created_by': str(g.caller['_id']),
        'created_at': now,
        'updated_at': now,
    }
    result = db.assets.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify(_serialize(doc)), 201


@assets_bp.route('/<asset_id>', methods=['PUT'])
@require_role(*MANAGE_ROLES)
def update_asset(asset_id):
    db = get_db()
    try:
        oid = ObjectId(asset_id)
    except InvalidId:
        return jsonify({'error': 'Invalid asset id'}), 400

    data = request.json or {}
    update = {}
    for field in ('name', 'serial_number', 'purchase_date', 'notes'):
        if field in data:
            update[field] = data[field]
    if 'category' in data:
        if data['category'] not in CATEGORIES:
            return jsonify({'error': f"category must be one of {sorted(CATEGORIES)}"}), 400
        update['category'] = data['category']
    if 'status' in data:
        if data['status'] not in STATUSES:
            return jsonify({'error': f"status must be one of {sorted(STATUSES)}"}), 400
        update['status'] = data['status']
    if not update:
        return jsonify({'error': 'Nothing to update'}), 400
    update['updated_at'] = datetime.utcnow()

    result = db.assets.update_one({'_id': oid}, {'$set': update})
    if result.matched_count == 0:
        return jsonify({'error': 'Asset not found'}), 404
    return jsonify(_serialize(db.assets.find_one({'_id': oid})))


@assets_bp.route('/<asset_id>/assign', methods=['POST'])
@require_role(*MANAGE_ROLES)
def assign_asset(asset_id):
    db = get_db()
    try:
        oid = ObjectId(asset_id)
    except InvalidId:
        return jsonify({'error': 'Invalid asset id'}), 400
    data = request.json or {}
    employee_id = data.get('employee_id')
    if not employee_id:
        return jsonify({'error': 'employee_id is required'}), 400
    if not db.employees.find_one({'_id': ObjectId(employee_id)}):
        return jsonify({'error': 'Employee not found'}), 404

    result = db.assets.update_one({'_id': oid}, {'$set': {
        'assigned_to': employee_id, 'assigned_date': datetime.utcnow(),
        'status': 'assigned', 'updated_at': datetime.utcnow(),
    }})
    if result.matched_count == 0:
        return jsonify({'error': 'Asset not found'}), 404
    return jsonify(_serialize(db.assets.find_one({'_id': oid})))


@assets_bp.route('/<asset_id>/unassign', methods=['POST'])
@require_role(*MANAGE_ROLES)
def unassign_asset(asset_id):
    db = get_db()
    try:
        oid = ObjectId(asset_id)
    except InvalidId:
        return jsonify({'error': 'Invalid asset id'}), 400

    result = db.assets.update_one({'_id': oid}, {'$set': {
        'assigned_to': None, 'assigned_date': None,
        'status': 'available', 'updated_at': datetime.utcnow(),
    }})
    if result.matched_count == 0:
        return jsonify({'error': 'Asset not found'}), 404
    return jsonify(_serialize(db.assets.find_one({'_id': oid})))


@assets_bp.route('/<asset_id>', methods=['DELETE'])
@require_role('admin', 'hr_head')
def delete_asset(asset_id):
    db = get_db()
    try:
        oid = ObjectId(asset_id)
    except InvalidId:
        return jsonify({'error': 'Invalid asset id'}), 400
    result = db.assets.delete_one({'_id': oid})
    if result.deleted_count == 0:
        return jsonify({'error': 'Asset not found'}), 404
    return jsonify({'message': 'Asset deleted'})
