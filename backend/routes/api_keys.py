"""
routes/api_keys.py — issue/revoke API keys for the read-only public API
(routes/public_api.py). An Enterprise-plan feature (feature.api_access).
"""
import hashlib
import secrets
from datetime import datetime

from bson import ObjectId
from flask import Blueprint, current_app, g, jsonify, request

from auth_utils import require_permission
from tenant_scope import get_db

api_keys_bp = Blueprint('api_keys', __name__)


def _serialize(k):
    k['_id'] = str(k['_id'])
    k.pop('key_hash', None)
    for f in ('created_at', 'last_used_at'):
        if k.get(f):
            k[f] = k[f].isoformat()
    return k


def _check_feature():
    from feature_gating import company_features
    company = current_app.db.companies.find_one({'_id': ObjectId(g.tenant_id)})
    if 'feature.api_access' not in company_features(current_app.db, company):
        return jsonify({'error': 'The public API is an Enterprise-plan feature.'}), 403
    return None


@api_keys_bp.route('/', methods=['GET'])
@require_permission('integrations.manage')
def list_keys():
    db = get_db()
    keys = list(db.api_keys.find({}))
    return jsonify([_serialize(k) for k in keys])


@api_keys_bp.route('/', methods=['POST'])
@require_permission('integrations.manage')
def create_key():
    gate = _check_feature()
    if gate:
        return gate
    db = get_db()
    data = request.json or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'name is required'}), 400

    raw_key = f"hra_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    doc = {
        'name': name, 'key_hash': key_hash, 'key_prefix': raw_key[:12],
        'is_active': True, 'created_by': str(g.caller['_id']), 'created_at': datetime.utcnow(),
    }
    result = db.api_keys.insert_one(doc)
    doc['_id'] = result.inserted_id

    out = _serialize(doc)
    out['key'] = raw_key  # shown once — never retrievable again
    return jsonify(out), 201


@api_keys_bp.route('/<key_id>', methods=['DELETE'])
@require_permission('integrations.manage')
def revoke_key(key_id):
    db = get_db()
    result = db.api_keys.update_one({'_id': ObjectId(key_id)}, {'$set': {'is_active': False}})
    if result.matched_count == 0:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'message': 'Revoked'})
