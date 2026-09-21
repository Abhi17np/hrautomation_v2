"""
auth_utils.py — single source of truth for "who is calling and what tenant
are they in", replacing the per-route-file _caller/_get_caller/_require_admin
helpers that used to be duplicated across all 11 route files.

Usage in a route:
    from auth_utils import tenant_scoped, require_role
    from tenant_scope import get_db

    @employees_bp.route('/', methods=['GET'])
    @tenant_scoped                      # any authenticated tenant member
    def list_employees():
        db = get_db()
        ...

    @employees_bp.route('/', methods=['POST'])
    @require_role('admin', 'hr', 'hr_head')   # only these roles
    def create_employee():
        db = get_db()
        ...

Both decorators populate Flask's `g.tenant_id` (string) and `g.caller`
(the full users document, including password hash — never serialize it
directly to a response) for the wrapped view function to use.
"""
from functools import wraps

from bson import ObjectId
from bson.errors import InvalidId
from flask import current_app, g, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request


def tenant_scoped(fn):
    """Verifies the JWT, resolves g.tenant_id from its claims, loads the
    calling user (tenant-scoped) into g.caller, and resolves their
    permission set (g.caller_permissions, g.caller_role) from the `roles`
    collection. Rejects platform-admin tokens (no tenant_id claim) and
    deactivated accounts."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        if not tenant_id:
            return jsonify({'error': 'Token has no tenant context'}), 401
        g.tenant_id = tenant_id

        from tenant_scope import get_db
        db = get_db()
        try:
            caller = db.users.find_one({'_id': ObjectId(get_jwt_identity())})
        except InvalidId:
            return jsonify({'error': 'Invalid token identity'}), 401
        if not caller:
            return jsonify({'error': 'User not found'}), 404
        if caller.get('is_active') is False:
            return jsonify({'error': 'Account deactivated. Please contact HR.'}), 403

        # A suspended tenant's already-issued JWTs must stop working
        # immediately, not just be blocked from new logins.
        company = current_app.db.companies.find_one({'_id': ObjectId(tenant_id)}, {'status': 1})
        if company and company.get('status') == 'suspended':
            return jsonify({'error': 'This account is suspended. Contact your platform administrator.'}), 403

        g.caller = caller

        from roles_service import permissions_for_user
        g.caller_permissions, g.caller_role = permissions_for_user(db, tenant_id, caller)

        return fn(*args, **kwargs)
    return wrapper


def require_role(*roles):
    """Stacks tenant_scoped, then requires g.caller['role'] to be one of
    `roles`. Usage: @require_role('admin', 'hr_head').

    `role` is kept in sync with the caller's role's `base_role`, so a
    custom role (e.g. 'HR Associate' based on 'hr') is still gated
    correctly here — this decorator is for routes not yet migrated to
    the finer-grained require_permission."""
    def decorator(fn):
        @wraps(fn)
        @tenant_scoped
        def wrapper(*args, **kwargs):
            if g.caller.get('role') not in roles:
                return jsonify({'error': 'Access denied'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def require_permission(*perms, mode='all'):
    """Stacks tenant_scoped, then requires the caller's resolved permission
    set (g.caller_permissions) to satisfy `perms`. mode='all' (default)
    requires every listed permission; mode='any' requires at least one.
    Usage: @require_permission('letters.approve')."""
    def decorator(fn):
        @wraps(fn)
        @tenant_scoped
        def wrapper(*args, **kwargs):
            granted = g.caller_permissions or set()
            ok = all(p in granted for p in perms) if mode == 'all' else any(p in granted for p in perms)
            if not ok:
                return jsonify({'error': 'Access denied'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def require_api_key(fn):
    """Guards routes/public_api.py — authenticates via the X-API-Key
    header (a tenant-issued key, see routes/api_keys.py) instead of a
    user JWT. Sets g.tenant_id so get_db() works normally; there is no
    g.caller for these routes since no user is involved."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        import hashlib
        raw_key = request.headers.get('X-API-Key', '')
        if not raw_key:
            return jsonify({'error': 'X-API-Key header is required'}), 401
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        key_doc = current_app.db.api_keys.find_one({'key_hash': key_hash, 'is_active': True})
        if not key_doc:
            return jsonify({'error': 'Invalid or revoked API key'}), 401

        from datetime import datetime
        current_app.db.api_keys.update_one({'_id': key_doc['_id']}, {'$set': {'last_used_at': datetime.utcnow()}})

        g.tenant_id = key_doc['tenant_id']
        g.api_key_doc = key_doc
        return fn(*args, **kwargs)
    return wrapper


def platform_admin_required(fn):
    """For backend/routes/platform.py only — verifies a platform-scoped JWT
    (claims.scope == 'platform', no tenant_id). Platform admins are stored
    separately from tenant users (db.platform_admins, unscoped) and this
    decorator never sets g.tenant_id, so tenant-scoped routes can never
    accept a platform-admin token."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get('scope') != 'platform':
            return jsonify({'error': 'Platform admin access required'}), 403
        try:
            admin = current_app.db.platform_admins.find_one({'_id': ObjectId(get_jwt_identity())})
        except InvalidId:
            return jsonify({'error': 'Invalid token identity'}), 401
        if not admin:
            return jsonify({'error': 'Platform admin not found'}), 404
        g.platform_admin = admin
        return fn(*args, **kwargs)
    return wrapper
