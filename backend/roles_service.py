"""
roles_service.py — shared helpers for seeding and resolving tenant roles.

Used by:
  - routes/platform.py (seed system roles when a new company is provisioned)
  - routes/roles.py (the roles management API)
  - routes/auth.py (resolve a role at user-creation time)
  - scripts/backfill_roles.py (one-time migration for tenants that predate
    the roles collection)
"""
from datetime import datetime

from bson import ObjectId

from permissions import DEFAULT_ROLE_PERMISSIONS, LEGACY_ROLE_KEYS, SYSTEM_ROLE_NAMES


def seed_system_roles(db, tenant_id):
    """Insert the 5 system roles for a tenant that doesn't have them yet.
    Idempotent — safe to call on every company creation and from the
    backfill script. `db` may be a raw pymongo db or a TenantScopedDB."""
    now = datetime.utcnow()
    created = {}
    for key in LEGACY_ROLE_KEYS:
        existing = db.roles.find_one({'tenant_id': tenant_id, 'key': key})
        if existing:
            created[key] = existing
            continue
        doc = {
            'tenant_id':   tenant_id,
            'key':         key,
            'name':        SYSTEM_ROLE_NAMES[key],
            'base_role':   key,
            'permissions': list(DEFAULT_ROLE_PERMISSIONS[key]),
            'is_system':   True,
            'created_at':  now,
            'updated_at':  now,
        }
        result = db.roles.insert_one(doc)
        doc['_id'] = result.inserted_id
        created[key] = doc
    return created


def resolve_role(db, tenant_id, role_id=None, role_key=None):
    """Look up a role doc by id or key, tenant-scoped. Returns None if not found."""
    query = {'tenant_id': tenant_id}
    if role_id:
        try:
            query['_id'] = ObjectId(role_id)
        except Exception:
            return None
    elif role_key:
        query['key'] = role_key
    else:
        return None
    return db.roles.find_one(query)


def build_user_role_fields(db, tenant_id, role_key):
    """Resolve a role key (system or custom) to the fields a new `users`
    document needs: `role` (legacy base_role, for require_role routes),
    `role_id`, `role_key`. Falls back to treating role_key itself as a
    legacy bucket if no matching role doc exists yet (e.g. a tenant that
    predates the roles collection and hasn't been backfilled)."""
    role = resolve_role(db, tenant_id, role_key=role_key)
    if role:
        return {'role': role['base_role'], 'role_id': str(role['_id']), 'role_key': role['key']}
    return {'role': role_key, 'role_id': None, 'role_key': role_key}


def permissions_for_user(db, tenant_id, user):
    """Resolve a user's effective permission set. Falls back to the legacy
    enum's default permissions if the user predates role_id assignment
    (pre-migration data, or a race during rollout)."""
    role = None
    if user.get('role_id'):
        role = resolve_role(db, tenant_id, role_id=user['role_id'])
    if not role:
        role = resolve_role(db, tenant_id, role_key=user.get('role'))
    if role:
        return set(role.get('permissions', [])), role
    return set(DEFAULT_ROLE_PERMISSIONS.get(user.get('role', 'employee'), [])), None
