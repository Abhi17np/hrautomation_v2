"""
routes/roles.py — Roles & Permissions management.

Lets a tenant admin see the 5 auto-seeded system roles (admin, hr, hr_head,
manager, employee), edit their permission sets, and add custom roles (e.g.
"HR Associate") that behave as a chosen legacy `base_role` on routes still
gated by require_role, while carrying their own `permissions` array for
require_permission-gated routes (the workflow engine, and this module
itself).
"""
import re
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request

from auth_utils import require_permission, tenant_scoped
from permissions import ALL_PERMISSIONS, LEGACY_ROLE_KEYS, PERMISSION_CATALOG
from tenant_scope import get_db
from audit import log_audit

roles_bp = Blueprint('roles', __name__)

_KEY_RE = re.compile(r'^[a-z][a-z0-9_]{1,40}$')


def _serialize(role):
    role['_id'] = str(role['_id'])
    return role


@roles_bp.route('/permissions-catalog', methods=['GET'])
@tenant_scoped
def permissions_catalog():
    return jsonify({'catalog': PERMISSION_CATALOG, 'base_roles': list(LEGACY_ROLE_KEYS)})


@roles_bp.route('/', methods=['GET'])
@tenant_scoped
def list_roles():
    db = get_db()
    roles = list(db.roles.find({}).sort([('is_system', -1), ('name', 1)]))
    return jsonify([_serialize(r) for r in roles])


@roles_bp.route('/<rid>', methods=['GET'])
@tenant_scoped
def get_role(rid):
    db = get_db()
    try:
        role = db.roles.find_one({'_id': ObjectId(rid)})
    except InvalidId:
        return jsonify({'error': 'Invalid role id'}), 400
    if not role:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(_serialize(role))


@roles_bp.route('/', methods=['POST'])
@require_permission('roles.manage')
def create_role():
    db = get_db()
    data = request.json or {}

    name = (data.get('name') or '').strip()
    key = (data.get('key') or '').strip().lower().replace(' ', '_')
    base_role = data.get('base_role')
    perms = data.get('permissions') or []

    if not name:
        return jsonify({'error': 'name is required'}), 400
    if not key:
        key = re.sub(r'[^a-z0-9_]', '', name.lower().replace(' ', '_'))
    if not _KEY_RE.match(key):
        return jsonify({'error': 'key must be lowercase letters/digits/underscore, starting with a letter'}), 400
    if base_role not in LEGACY_ROLE_KEYS:
        return jsonify({'error': f'base_role must be one of {list(LEGACY_ROLE_KEYS)}'}), 400
    invalid_perms = [p for p in perms if p not in ALL_PERMISSIONS]
    if invalid_perms:
        return jsonify({'error': f'Unknown permission keys: {invalid_perms}'}), 400

    if db.roles.find_one({'key': key}):
        return jsonify({'error': f"A role with key '{key}' already exists"}), 400

    now = datetime.utcnow()
    doc = {
        'key': key, 'name': name, 'base_role': base_role,
        'permissions': sorted(set(perms)), 'is_system': False,
        'created_at': now, 'updated_at': now,
    }
    result = db.roles.insert_one(doc)
    doc['_id'] = result.inserted_id
    log_audit(db, g.tenant_id, g.caller, 'role.created', entity_type='role', entity_id=result.inserted_id,
              details={'key': key, 'base_role': base_role})
    return jsonify(_serialize(doc)), 201


@roles_bp.route('/<rid>', methods=['PUT'])
@require_permission('roles.manage')
def update_role(rid):
    db = get_db()
    try:
        role = db.roles.find_one({'_id': ObjectId(rid)})
    except InvalidId:
        return jsonify({'error': 'Invalid role id'}), 400
    if not role:
        return jsonify({'error': 'Not found'}), 404

    data = request.json or {}
    update = {}

    if 'name' in data:
        name = (data['name'] or '').strip()
        if not name:
            return jsonify({'error': 'name cannot be empty'}), 400
        update['name'] = name

    if 'permissions' in data:
        perms = data['permissions'] or []
        invalid_perms = [p for p in perms if p not in ALL_PERMISSIONS]
        if invalid_perms:
            return jsonify({'error': f'Unknown permission keys: {invalid_perms}'}), 400
        update['permissions'] = sorted(set(perms))

    # System roles' key/base_role are load-bearing for every require_role(...)
    # call site in the codebase — never editable, on system or custom roles,
    # once a role exists (changing it would silently change what every user
    # on that role can already do on unmigrated routes).
    if 'base_role' in data and data['base_role'] != role['base_role']:
        return jsonify({'error': 'base_role cannot be changed after creation — create a new role instead'}), 400
    if 'key' in data and data['key'] != role['key']:
        return jsonify({'error': 'key cannot be changed after creation'}), 400

    if not update:
        return jsonify({'error': 'Nothing to update'}), 400
    update['updated_at'] = datetime.utcnow()
    db.roles.update_one({'_id': ObjectId(rid)}, {'$set': update})
    log_audit(db, g.tenant_id, g.caller, 'role.updated', entity_type='role', entity_id=rid, details=update)
    return jsonify(_serialize(db.roles.find_one({'_id': ObjectId(rid)})))


@roles_bp.route('/<rid>', methods=['DELETE'])
@require_permission('roles.manage')
def delete_role(rid):
    db = get_db()
    try:
        role = db.roles.find_one({'_id': ObjectId(rid)})
    except InvalidId:
        return jsonify({'error': 'Invalid role id'}), 400
    if not role:
        return jsonify({'error': 'Not found'}), 404
    if role.get('is_system'):
        return jsonify({'error': 'System roles cannot be deleted'}), 400

    in_use = db.users.count_documents({'role_id': rid})
    if in_use:
        return jsonify({'error': f'{in_use} user(s) still have this role — reassign them first'}), 400

    db.roles.delete_one({'_id': ObjectId(rid)})
    log_audit(db, g.tenant_id, g.caller, 'role.deleted', entity_type='role', entity_id=rid, details={'key': role['key']})
    return jsonify({'message': 'Role deleted'})
