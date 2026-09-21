"""
routes/audit.py — read-only view of the tenant's audit trail. The audit
log itself is an Enterprise-plan feature (audit.view controls who on an
Enterprise tenant can see it; feature.audit_log controls whether the
tenant's plan includes it at all).
"""
from bson import ObjectId
from flask import Blueprint, current_app, g, jsonify, request

from auth_utils import require_permission
from tenant_scope import get_db

audit_bp = Blueprint('audit', __name__)


@audit_bp.route('/', methods=['GET'])
@require_permission('audit.view')
def list_audit_log():
    from feature_gating import company_features
    company = current_app.db.companies.find_one({'_id': ObjectId(g.tenant_id)})
    if 'feature.audit_log' not in company_features(current_app.db, company):
        return jsonify({'error': 'The audit log is an Enterprise-plan feature.'}), 403

    db = get_db()
    action = request.args.get('action')
    limit = min(int(request.args.get('limit', 100)), 500)
    query = {'action': action} if action else {}
    entries = list(db.audit_log.find(query).sort('created_at', -1).limit(limit))
    for e in entries:
        e['_id'] = str(e['_id'])
        e['created_at'] = e['created_at'].isoformat()
    return jsonify(entries)
