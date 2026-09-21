"""
routes/audit.py — read-only view of the tenant's audit trail.
"""
from flask import Blueprint, jsonify, request

from auth_utils import require_permission
from tenant_scope import get_db

audit_bp = Blueprint('audit', __name__)


@audit_bp.route('/', methods=['GET'])
@require_permission('audit.view')
def list_audit_log():
    db = get_db()
    action = request.args.get('action')
    limit = min(int(request.args.get('limit', 100)), 500)
    query = {'action': action} if action else {}
    entries = list(db.audit_log.find(query).sort('created_at', -1).limit(limit))
    for e in entries:
        e['_id'] = str(e['_id'])
        e['created_at'] = e['created_at'].isoformat()
    return jsonify(entries)
