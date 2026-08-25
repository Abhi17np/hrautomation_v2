from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from bson import ObjectId

holidays_bp = Blueprint('holidays', __name__)

HR_ROLES = {'admin', 'hr_head', 'hr'}
VALID_TYPES = {'public', 'optional'}


def _s(doc):
    doc['_id'] = str(doc['_id'])
    return doc


def _get_caller(db, uid):
    user = db.users.find_one({'_id': ObjectId(uid)})
    if not user:
        return None, (jsonify({'error': 'User not found'}), 404)
    return user, None


@holidays_bp.route('/', methods=['GET'])
@jwt_required()
def list_holidays():
    db = current_app.db
    query = {}
    year = request.args.get('year')
    if year:
        query['date'] = {'$regex': f'^{year}'}
    holidays = list(db.holidays.find(query).sort('date', 1))
    return jsonify([_s(h) for h in holidays])


@holidays_bp.route('/', methods=['POST'])
@jwt_required()
def create_holiday():
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Only Admin, HR Head, or HR can manage holidays'}), 403

    data = request.json or {}
    name = (data.get('name') or '').strip()
    date = (data.get('date') or '').strip()
    htype = data.get('type', 'public')

    if not name or not date:
        return jsonify({'error': 'name and date are required'}), 400
    try:
        datetime.strptime(date, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'date must be in YYYY-MM-DD format'}), 400
    if htype not in VALID_TYPES:
        return jsonify({'error': f'type must be one of {sorted(VALID_TYPES)}'}), 400
    if db.holidays.find_one({'date': date}):
        return jsonify({'error': f'A holiday is already recorded for {date}'}), 409

    doc = {
        'name': name, 'date': date, 'type': htype,
        'created_by': uid, 'created_at': datetime.utcnow(),
    }
    result = db.holidays.insert_one(doc)
    doc['_id'] = str(result.inserted_id)
    return jsonify(doc), 201


@holidays_bp.route('/<hid>', methods=['PUT'])
@jwt_required()
def update_holiday(hid):
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Only Admin, HR Head, or HR can manage holidays'}), 403

    holiday = db.holidays.find_one({'_id': ObjectId(hid)})
    if not holiday:
        return jsonify({'error': 'Holiday not found'}), 404

    data = request.json or {}
    update = {}
    if 'name' in data:
        update['name'] = (data['name'] or '').strip()
    if 'date' in data:
        try:
            datetime.strptime(data['date'], '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'date must be in YYYY-MM-DD format'}), 400
        update['date'] = data['date']
    if 'type' in data:
        if data['type'] not in VALID_TYPES:
            return jsonify({'error': f'type must be one of {sorted(VALID_TYPES)}'}), 400
        update['type'] = data['type']

    if not update:
        return jsonify({'error': 'No valid fields provided'}), 400

    update['updated_at'] = datetime.utcnow()
    db.holidays.update_one({'_id': ObjectId(hid)}, {'$set': update})
    updated = db.holidays.find_one({'_id': ObjectId(hid)})
    return jsonify(_s(updated))


@holidays_bp.route('/<hid>', methods=['DELETE'])
@jwt_required()
def delete_holiday(hid):
    db  = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Only Admin, HR Head, or HR can manage holidays'}), 403

    result = db.holidays.delete_one({'_id': ObjectId(hid)})
    if result.deleted_count == 0:
        return jsonify({'error': 'Holiday not found'}), 404
    return jsonify({'message': 'Holiday deleted'})
