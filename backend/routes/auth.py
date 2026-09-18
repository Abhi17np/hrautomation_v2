from flask import Blueprint, request, jsonify, current_app, g
from flask_jwt_extended import create_access_token, get_jwt_identity
import bcrypt, os
from datetime import datetime
from bson import ObjectId

from auth_utils import tenant_scoped, require_role
from tenant_scope import get_db
from extensions import limiter

auth_bp = Blueprint('auth', __name__)

# FIX #8: dummy hash used to prevent timing attacks on login
_DUMMY_HASH = bcrypt.hashpw(b'dummy-timing-guard', bcrypt.gensalt())

def serialize_user(user):
    d = {
        'id':        str(user['_id']),
        'email':     user['email'],
        'name':      user['name'],
        'role':      user['role'],
        'tenant_id': user.get('tenant_id'),
    }
    if user.get('employee_ref'):
        d['employee_ref'] = user['employee_ref']
    if user.get('emp_code'):
        d['emp_code'] = user['emp_code']
    return d


@auth_bp.route('/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    # FIX #8: validate body before use
    data = request.json or {}
    if not data.get('company') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'company, email and password are required'}), 400

    # Login runs before any JWT/tenant context exists, so it resolves the
    # tenant explicitly from the company slug and queries the raw db
    # directly rather than through get_db() (see tenant_scope.py docstring).
    db = current_app.db
    company = db.companies.find_one({'slug': data['company'].strip().lower()})
    if not company or company.get('status') == 'suspended':
        return jsonify({'error': 'Invalid credentials'}), 401
    tenant_id = str(company['_id'])

    user = db.users.find_one({'tenant_id': tenant_id, 'email': data['email']})
    # FIX #8: always run checkpw to prevent email enumeration via timing
    pwd_bytes = data['password'].encode()
    check_hash = user['password'] if user else _DUMMY_HASH
    if not user or not bcrypt.checkpw(pwd_bytes, check_hash):
        return jsonify({'error': 'Invalid credentials'}), 401
    # Block deactivated accounts (exited employees)
    if user.get('is_active') == False:
        return jsonify({'error': 'Account deactivated. Please contact HR.'}), 403
    # Belt-and-suspenders: check employee record directly
    if user.get('employee_ref'):
        emp = db.employees.find_one({'_id': ObjectId(user['employee_ref']), 'tenant_id': tenant_id})
        if emp and emp.get('status') == 'exited':
            db.users.update_one({'_id': user['_id']}, {'$set': {'is_active': False}})
            return jsonify({'error': 'Account deactivated. Please contact HR.'}), 403

    token = create_access_token(
        identity=str(user['_id']),
        additional_claims={'tenant_id': tenant_id, 'role': user['role']},
    )
    return jsonify({'token': token, 'user': serialize_user(user)})


@auth_bp.route('/me', methods=['GET'])
@tenant_scoped
def me():
    db   = get_db()
    user = g.caller
    data = serialize_user(user)
    # Merge employee record fields so frontend always has them
    if user.get('employee_ref'):
        try:
            emp = db.employees.find_one({'_id': ObjectId(user['employee_ref'])})
            if emp:
                if emp.get('joining_date'): data['joining_date']  = emp['joining_date']
                if emp.get('designation'):  data['designation']   = emp['designation']
                if emp.get('department'):   data['department']    = emp['department']
                if emp.get('employee_id'):  data['employee_code'] = emp['employee_id']
                if emp.get('manager_id'):
                    mgr_emp = db.employees.find_one({'_id': ObjectId(emp['manager_id'])})
                    if mgr_emp: data['manager_name'] = mgr_emp.get('name', '')
        except Exception:
            pass
    # Also merge personal profile fields saved by the user
    for field in ('phone', 'personal_email', 'gender', 'blood_group',
                  'birthday', 'address', 'emergency_contact_name',
                  'emergency_contact_phone', 'emergency_contact_relation'):
        if user.get(field):
            data[field] = user[field]
    return jsonify(data)


@auth_bp.route('/users', methods=['GET'])
@require_role('admin', 'hr_head')
def list_users():
    db    = get_db()
    role  = request.args.get('role')
    query = {'role': role} if role else {}
    users = list(db.users.find(query, {'password': 0}))
    for u in users:
        u['_id'] = str(u['_id'])
    return jsonify(users)


@auth_bp.route('/users', methods=['POST'])
@require_role('admin')
def create_user():
    db   = get_db()
    data = request.json or {}
    if not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'error': 'name, email and password are required'}), 400
    if db.users.find_one({'email': data['email']}):
        return jsonify({'error': 'Email already exists'}), 400
    hashed = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt())
    user = {
        'name':       data['name'],
        'email':      data['email'],
        'password':   hashed,
        'role':       data.get('role', 'hr'),
        'created_at': datetime.utcnow(),
    }
    result = db.users.insert_one(user)
    return jsonify({'id': str(result.inserted_id), 'message': 'User created'}), 201


@auth_bp.route('/change-password', methods=['PUT'])
@tenant_scoped
def change_password():
    db   = get_db()
    data = request.json or {}

    current_password = data.get('current_password', '')
    new_password     = data.get('new_password', '')

    if not current_password or not new_password:
        return jsonify({'error': 'current_password and new_password are required'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400

    user = g.caller
    if not bcrypt.checkpw(current_password.encode(), user['password']):
        return jsonify({'error': 'Current password is incorrect'}), 400

    new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt())
    db.users.update_one({'_id': user['_id']}, {'$set': {'password': new_hash, 'updated_at': datetime.utcnow()}})

    return jsonify({'message': 'Password changed successfully'})


@auth_bp.route('/profile', methods=['GET'])
@tenant_scoped
def get_profile():
    user = dict(g.caller)
    db   = get_db()
    user.pop('password', None)
    user['_id'] = str(user['_id'])
    # Also pull employee record if linked
    if user.get('employee_ref'):
        emp = db.employees.find_one({'_id': ObjectId(user['employee_ref'])})
        if emp:
            # Only set if value actually exists — skip empty strings
            if emp.get('joining_date'): user['joining_date']  = emp['joining_date']
            if emp.get('designation'):  user['designation']   = emp['designation']
            if emp.get('department'):   user['department']    = emp['department']
            if emp.get('employee_id'):  user['employee_code'] = emp['employee_id']
            if emp.get('manager_id'):
                mgr_emp = db.employees.find_one({'_id': ObjectId(emp['manager_id'])})
                if mgr_emp: user['manager_name'] = mgr_emp.get('name', '')
    return jsonify(user)


@auth_bp.route('/profile', methods=['PUT'])
@tenant_scoped
def update_profile():
    db   = get_db()
    uid  = get_jwt_identity()
    data = request.json or {}

    allowed = {
        'name', 'phone', 'personal_email', 'address',
        'birthday', 'anniversary', 'emergency_contact_name',
        'emergency_contact_phone', 'emergency_contact_relation',
        'blood_group', 'gender',
    }
    update = { k: v for k, v in data.items() if k in allowed }
    update['updated_at'] = datetime.utcnow()

    db.users.update_one({'_id': ObjectId(uid)}, {'$set': update})

    # Also update name in employee record if linked
    if 'name' in update and data.get('employee_ref'):
        db.employees.update_one(
            {'_id': ObjectId(data['employee_ref'])},
            {'$set': {'name': update['name']}}
        )

    user = db.users.find_one({'_id': ObjectId(uid)}, {'password': 0})
    if not user:
        return jsonify({'error': 'User not found after update'}), 404
    user['_id'] = str(user['_id'])
    # Merge employee record so frontend user object stays complete
    if user.get('employee_ref'):
        try:
            emp = db.employees.find_one({'_id': ObjectId(user['employee_ref'])})
            if emp:
                user['joining_date']  = emp.get('joining_date',  '')
                user['designation']   = emp.get('designation',   '')
                user['department']    = emp.get('department',    '')
                user['employee_code'] = emp.get('employee_id',   '')
        except Exception:
            pass
    return jsonify({'message': 'Profile updated', 'user': user})
