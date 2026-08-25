from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from bson import ObjectId

from services.notify import notify_employee

assets_bp = Blueprint('assets', __name__)

HR_ROLES = {'admin', 'hr', 'hr_head'}
STATUSES = {'available', 'assigned', 'maintenance', 'retired'}


def _s(doc):
    doc['_id'] = str(doc['_id'])
    return doc


def _get_caller(db, uid):
    user = db.users.find_one({'_id': ObjectId(uid)})
    if not user:
        return None, (jsonify({'error': 'User not found'}), 404)
    return user, None


def _next_asset_tag(db):
    counter = db.counters.find_one_and_update(
        {'_id': 'asset'},
        {'$inc': {'seq': 1}},
        upsert=True,
        return_document=True,
    )
    return f"AST{str(counter['seq']).zfill(3)}"


def _enrich(asset, db):
    if asset.get('assigned_to'):
        emp = db.employees.find_one({'_id': ObjectId(asset['assigned_to'])})
        if emp:
            asset['assigned_to_name'] = emp.get('name', '')
            asset['assigned_to_code'] = emp.get('employee_id', '')
            asset['assigned_to_department'] = emp.get('department', '')
    return asset


@assets_bp.route('/', methods=['GET'])
@jwt_required()
def list_assets():
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err

    role = caller.get('role')
    query = {}

    if role in HR_ROLES:
        pass  # full register
    elif role == 'manager':
        mgr_ref = caller.get('employee_ref', '')
        team_ids = [str(e['_id']) for e in db.employees.find({'manager_id': mgr_ref})]
        if mgr_ref:
            team_ids.append(mgr_ref)
        query['assigned_to'] = {'$in': team_ids}
    else:
        return jsonify({'error': 'Access denied — use /api/assets/my for your own assets'}), 403

    status = request.args.get('status')
    if status:
        query['status'] = status
    category = request.args.get('category')
    if category:
        query['category'] = category

    assets = list(db.assets.find(query).sort('created_at', -1))
    return jsonify([_enrich(_s(a), db) for a in assets])


@assets_bp.route('/my', methods=['GET'])
@jwt_required()
def my_assets():
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err

    emp_ref = caller.get('employee_ref')
    if not emp_ref:
        return jsonify({'error': 'No employee record linked to this account'}), 400

    assets = list(db.assets.find({'assigned_to': emp_ref}).sort('assigned_date', -1))
    return jsonify([_enrich(_s(a), db) for a in assets])


@assets_bp.route('/employee/<emp_id>', methods=['GET'])
@jwt_required()
def assets_for_employee(emp_id):
    """Used by the exit-clearance screen to show what still needs returning."""
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err

    role = caller.get('role')
    if role not in HR_ROLES and caller.get('employee_ref') != emp_id:
        return jsonify({'error': 'Access denied'}), 403

    assets = list(db.assets.find({'assigned_to': emp_id}).sort('assigned_date', -1))
    return jsonify([_s(a) for a in assets])


@assets_bp.route('/<asset_id>', methods=['GET'])
@jwt_required()
def get_asset(asset_id):
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err

    asset = db.assets.find_one({'_id': ObjectId(asset_id)})
    if not asset:
        return jsonify({'error': 'Asset not found'}), 404

    role = caller.get('role')
    if role not in HR_ROLES and asset.get('assigned_to') != caller.get('employee_ref'):
        return jsonify({'error': 'Access denied'}), 403

    return jsonify(_enrich(_s(asset), db))


@assets_bp.route('/', methods=['POST'])
@jwt_required()
def create_asset():
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Only Admin, HR Head, or HR can add assets'}), 403

    data = request.json or {}
    category = (data.get('category') or '').strip()
    if not category:
        return jsonify({'error': 'category is required'}), 400

    asset = {
        'asset_tag':      data.get('asset_tag') or _next_asset_tag(db),
        'category':       category,
        'brand':          data.get('brand', ''),
        'model':          data.get('model', ''),
        'serial_number':  data.get('serial_number', ''),
        'purchase_date':  data.get('purchase_date', ''),
        'status':         'available',
        'condition':      data.get('condition', 'good'),
        'notes':          data.get('notes', ''),
        'assigned_to':    None,
        'assigned_date':  None,
        'returned_date':  None,
        'history': [{'action': 'created', 'by': uid, 'timestamp': datetime.utcnow().isoformat()}],
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }
    result = db.assets.insert_one(asset)
    asset['_id'] = str(result.inserted_id)
    return jsonify(asset), 201


@assets_bp.route('/<asset_id>', methods=['PUT'])
@jwt_required()
def update_asset(asset_id):
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Only Admin, HR Head, or HR can edit assets'}), 403

    asset = db.assets.find_one({'_id': ObjectId(asset_id)})
    if not asset:
        return jsonify({'error': 'Asset not found'}), 404

    data = request.json or {}
    allowed = ['category', 'brand', 'model', 'serial_number', 'purchase_date', 'condition', 'notes']
    update = {k: data[k] for k in allowed if k in data}
    if not update:
        return jsonify({'error': 'No valid fields provided'}), 400

    update['updated_at'] = datetime.utcnow()
    db.assets.update_one({'_id': ObjectId(asset_id)}, {'$set': update})
    updated = db.assets.find_one({'_id': ObjectId(asset_id)})
    return jsonify(_enrich(_s(updated), db))


@assets_bp.route('/<asset_id>/assign', methods=['POST'])
@jwt_required()
def assign_asset(asset_id):
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Only Admin, HR Head, or HR can assign assets'}), 403

    asset = db.assets.find_one({'_id': ObjectId(asset_id)})
    if not asset:
        return jsonify({'error': 'Asset not found'}), 404
    if asset.get('status') == 'assigned':
        return jsonify({'error': 'Asset is already assigned — return it first'}), 400

    data = request.json or {}
    employee_id = data.get('employee_id')
    if not employee_id:
        return jsonify({'error': 'employee_id is required'}), 400
    emp = db.employees.find_one({'_id': ObjectId(employee_id)})
    if not emp:
        return jsonify({'error': 'Employee not found'}), 404

    now = datetime.utcnow()
    db.assets.update_one({'_id': ObjectId(asset_id)}, {
        '$set': {
            'status': 'assigned', 'assigned_to': employee_id,
            'assigned_date': now.isoformat(), 'returned_date': None, 'updated_at': now,
        },
        '$push': {'history': {
            'action': 'assigned', 'employee_id': employee_id, 'by': uid, 'timestamp': now.isoformat(),
        }},
    })

    notify_employee(db, employee_id, type='asset', title='Asset assigned',
                     message=f"A {asset.get('category', 'asset')} ({asset.get('asset_tag')}) has been assigned to you.",
                     link='/assets', related_id=asset_id)

    updated = db.assets.find_one({'_id': ObjectId(asset_id)})
    return jsonify(_enrich(_s(updated), db))


@assets_bp.route('/<asset_id>/return', methods=['POST'])
@jwt_required()
def return_asset(asset_id):
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Only Admin, HR Head, or HR can process returns'}), 403

    asset = db.assets.find_one({'_id': ObjectId(asset_id)})
    if not asset:
        return jsonify({'error': 'Asset not found'}), 404
    if asset.get('status') != 'assigned':
        return jsonify({'error': 'Asset is not currently assigned'}), 400

    data = request.json or {}
    condition = data.get('condition', asset.get('condition', 'good'))
    notes = (data.get('notes') or '').strip()
    new_status = 'maintenance' if condition in ('damaged', 'needs_repair') else 'available'
    returned_from = asset.get('assigned_to')

    now = datetime.utcnow()
    db.assets.update_one({'_id': ObjectId(asset_id)}, {
        '$set': {
            'status': new_status, 'assigned_to': None,
            'returned_date': now.isoformat(), 'condition': condition, 'updated_at': now,
        },
        '$push': {'history': {
            'action': 'returned', 'employee_id': returned_from, 'condition': condition,
            'notes': notes, 'by': uid, 'timestamp': now.isoformat(),
        }},
    })

    updated = db.assets.find_one({'_id': ObjectId(asset_id)})
    return jsonify(_enrich(_s(updated), db))


@assets_bp.route('/<asset_id>', methods=['DELETE'])
@jwt_required()
def delete_asset(asset_id):
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in ('admin', 'hr_head'):
        return jsonify({'error': 'Only Admin or HR Head can delete assets'}), 403

    asset = db.assets.find_one({'_id': ObjectId(asset_id)})
    if not asset:
        return jsonify({'error': 'Asset not found'}), 404
    if asset.get('status') == 'assigned':
        return jsonify({'error': 'Cannot delete an asset that is currently assigned — return it first'}), 400

    db.assets.delete_one({'_id': ObjectId(asset_id)})
    return jsonify({'message': 'Asset deleted'})
