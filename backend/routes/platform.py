"""
platform.py — super-admin surface for provisioning tenants.

Platform admins are NOT tenant users: they're stored in a separate
`platform_admins` collection (unscoped — not tenant data) and authenticate
via /api/platform/login, which mints a JWT carrying additional_claims
{'scope': 'platform'} instead of a tenant_id. auth_utils.platform_admin_required
guards every route below and never sets g.tenant_id, so a platform token can
never be used against a tenant-scoped route (and vice versa) — see
auth_utils.py and tenant_scope.py docstrings.

Self-serve signup is explicitly out of scope for now (per product decision):
this blueprint is the only way a new company gets created, and it's meant to
be used by the SaaS operator, not customers.
"""
import re
from datetime import datetime

import bcrypt
from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, current_app, g, jsonify, request
from flask_jwt_extended import create_access_token

from auth_utils import platform_admin_required
from extensions import limiter

platform_bp = Blueprint('platform', __name__)

_SLUG_RE = re.compile(r'^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$')


def _serialize_company(c):
    return {
        'id':           str(c['_id']),
        'name':         c.get('name'),
        'slug':         c.get('slug'),
        'status':       c.get('status'),
        'plan':         c.get('plan'),
        'contact_name':  c.get('contact_name'),
        'contact_email': c.get('contact_email'),
        'contact_phone': c.get('contact_phone'),
        'created_at':   c.get('created_at').isoformat() if c.get('created_at') else None,
    }


@platform_bp.route('/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    data = request.json or {}
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'email and password are required'}), 400
    db = current_app.db
    admin = db.platform_admins.find_one({'email': data['email']})
    if not admin or not bcrypt.checkpw(data['password'].encode(), admin['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    token = create_access_token(
        identity=str(admin['_id']),
        additional_claims={'scope': 'platform'},
    )
    return jsonify({
        'token': token,
        'admin': {'id': str(admin['_id']), 'email': admin['email'], 'name': admin.get('name')},
    })


@platform_bp.route('/companies', methods=['GET'])
@platform_admin_required
def list_companies():
    companies = current_app.db.companies.find({}).sort('created_at', -1)
    return jsonify([_serialize_company(c) for c in companies])


@platform_bp.route('/companies', methods=['POST'])
@platform_admin_required
def create_company():
    data = request.json or {}
    name           = (data.get('name') or '').strip()
    slug           = (data.get('slug') or '').strip().lower()
    admin_email    = (data.get('admin_email') or '').strip()
    admin_password = data.get('admin_password') or ''
    admin_name     = (data.get('admin_name') or '').strip()

    if not name or not slug or not admin_email or not admin_password or not admin_name:
        return jsonify({'error': 'name, slug, admin_name, admin_email and admin_password are required'}), 400
    if not _SLUG_RE.match(slug):
        return jsonify({'error': 'slug must be 3-32 lowercase letters/digits/hyphens, no leading/trailing hyphen'}), 400
    if len(admin_password) < 6:
        return jsonify({'error': 'admin_password must be at least 6 characters'}), 400

    db = current_app.db
    if db.companies.find_one({'slug': slug}):
        return jsonify({'error': 'A company with this slug already exists'}), 400

    now = datetime.utcnow()
    company_doc = {
        'name': name,
        'slug': slug,
        'status': 'active',
        'plan': data.get('plan', 'trial'),
        'contact_name':  data.get('contact_name'),
        'contact_email': data.get('contact_email'),
        'contact_phone': data.get('contact_phone'),
        'created_at': now,
        'updated_at': now,
    }
    company_id = db.companies.insert_one(company_doc).inserted_id
    tenant_id = str(company_id)

    # Pre-check must be tenant-scoped too — email uniqueness is per-tenant, not global.
    if db.users.find_one({'tenant_id': tenant_id, 'email': admin_email}):
        db.companies.delete_one({'_id': company_id})
        return jsonify({'error': 'Admin email already exists for this tenant'}), 400

    hashed = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt())
    db.users.insert_one({
        'tenant_id': tenant_id,
        'name': admin_name,
        'email': admin_email,
        'password': hashed,
        'role': 'admin',
        'is_active': True,
        'created_at': now,
    })

    company_doc['_id'] = company_id
    return jsonify({'company': _serialize_company(company_doc)}), 201


@platform_bp.route('/companies/<company_id>', methods=['PUT'])
@platform_admin_required
def update_company(company_id):
    try:
        oid = ObjectId(company_id)
    except InvalidId:
        return jsonify({'error': 'Invalid company id'}), 400

    data = request.json or {}
    update = {}
    if 'status' in data:
        if data['status'] not in ('active', 'suspended', 'trial'):
            return jsonify({'error': "status must be one of 'active', 'suspended', 'trial'"}), 400
        update['status'] = data['status']
    if 'plan' in data:
        update['plan'] = data['plan']
    if 'branding' in data and isinstance(data['branding'], dict):
        update['branding'] = data['branding']
    if not update:
        return jsonify({'error': 'Nothing to update'}), 400
    update['updated_at'] = datetime.utcnow()

    db = current_app.db
    result = db.companies.update_one({'_id': oid}, {'$set': update})
    if result.matched_count == 0:
        return jsonify({'error': 'Company not found'}), 404
    company = db.companies.find_one({'_id': oid})
    return jsonify({'company': _serialize_company(company)})
