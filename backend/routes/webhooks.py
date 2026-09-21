"""
routes/webhooks.py — manage outbound event subscriptions (see
webhook_dispatch.py for delivery). An Enterprise-plan feature
(feature.api_access covers webhooks too — both are "extend beyond the
product" capabilities).
"""
import secrets
from datetime import datetime

from bson import ObjectId
from flask import Blueprint, current_app, g, jsonify, request

from auth_utils import require_permission
from tenant_scope import get_db

webhooks_bp = Blueprint('webhooks', __name__)

# Event types currently wired to dispatch_event(...) calls — see exit.py
# (employee.exited) and expenses.py (expense.approved). Adding a new
# event elsewhere in the codebase is just another dispatch_event() call
# using one of these keys, or a new one added here.
AVAILABLE_EVENTS = ['employee.exited', 'expense.approved']


def _serialize(w):
    w['_id'] = str(w['_id'])
    w.pop('secret', None)
    for f in ('created_at', 'last_delivery_at'):
        if w.get(f):
            w[f] = w[f].isoformat()
    return w


@webhooks_bp.route('/', methods=['GET'])
@require_permission('integrations.manage')
def list_webhooks():
    db = get_db()
    return jsonify({'webhooks': [_serialize(w) for w in db.webhooks.find({})], 'available_events': AVAILABLE_EVENTS})


@webhooks_bp.route('/', methods=['POST'])
@require_permission('integrations.manage')
def create_webhook():
    from feature_gating import company_features
    company = current_app.db.companies.find_one({'_id': ObjectId(g.tenant_id)})
    if 'feature.api_access' not in company_features(current_app.db, company):
        return jsonify({'error': 'Webhooks are an Enterprise-plan feature.'}), 403

    db = get_db()
    data = request.json or {}
    url = (data.get('url') or '').strip()
    events = [e for e in (data.get('events') or []) if e in AVAILABLE_EVENTS]
    if not url.startswith(('http://', 'https://')):
        return jsonify({'error': 'url must be a valid http(s) URL'}), 400
    if not events:
        return jsonify({'error': f'events must include at least one of {AVAILABLE_EVENTS}'}), 400

    doc = {
        'url': url, 'events': events, 'secret': secrets.token_urlsafe(24),
        'is_active': True, 'created_by': str(g.caller['_id']), 'created_at': datetime.utcnow(),
    }
    result = db.webhooks.insert_one(doc)
    doc['_id'] = result.inserted_id
    out = _serialize(doc)
    out['secret'] = doc['secret']  # shown once — used to verify X-Webhook-Signature
    return jsonify(out), 201


@webhooks_bp.route('/<hook_id>', methods=['DELETE'])
@require_permission('integrations.manage')
def delete_webhook(hook_id):
    db = get_db()
    result = db.webhooks.delete_one({'_id': ObjectId(hook_id)})
    if result.deleted_count == 0:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'message': 'Deleted'})
