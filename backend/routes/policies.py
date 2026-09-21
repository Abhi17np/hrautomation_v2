"""
routes/policies.py — policy library with employee acknowledgment
tracking (e.g. code of conduct, leave policy documents).
"""
import gridfs
from datetime import datetime

from bson import ObjectId
from flask import Blueprint, current_app, g, jsonify, request

from auth_utils import require_permission, tenant_scoped
from tenant_scope import get_db

policies_bp = Blueprint('policies', __name__)


def _fs():
    return gridfs.GridFS(current_app.db, collection='policies_fs')


def _serialize(policy, db, caller_id=None):
    policy['_id'] = str(policy['_id'])
    for f in ('created_at', 'updated_at'):
        if policy.get(f):
            policy[f] = policy[f].isoformat()
    if caller_id:
        policy['acknowledged'] = bool(db.policy_acknowledgments.find_one({
            'policy_id': policy['_id'], 'user_id': caller_id,
        }))
    return policy


@policies_bp.route('/', methods=['GET'])
@tenant_scoped
def list_policies():
    db = get_db()
    items = list(db.policies.find({'is_active': {'$ne': False}}).sort('created_at', -1))
    return jsonify([_serialize(p, db, str(g.caller['_id'])) for p in items])


@policies_bp.route('/', methods=['POST'])
@require_permission('policies.manage')
def create_policy():
    db = get_db()
    is_multipart = bool(request.files) or bool(request.form)
    src = request.form if is_multipart else (request.json or {})

    title = (src.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'title is required'}), 400

    file_gid = None
    filename = None
    if 'file' in request.files:
        f = request.files['file']
        file_gid = str(_fs().put(f.read(), filename=f.filename))
        filename = f.filename

    now = datetime.utcnow()
    doc = {
        'title': title, 'category': src.get('category'), 'body': src.get('body'),
        'file_gridfs_id': file_gid, 'filename': filename,
        'requires_acknowledgment': str(src.get('requires_acknowledgment', 'true')).lower() != 'false',
        'is_active': True, 'created_by': str(g.caller['_id']), 'created_at': now,
    }
    result = db.policies.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify(_serialize(doc, db)), 201


@policies_bp.route('/<pid>/file', methods=['GET'])
@tenant_scoped
def download_policy_file(pid):
    db = get_db()
    policy = db.policies.find_one({'_id': ObjectId(pid)})
    if not policy or not policy.get('file_gridfs_id'):
        return jsonify({'error': 'No file attached'}), 404
    from services.gridfs_storage import serve_from_gridfs
    return serve_from_gridfs(policy['file_gridfs_id'], policy.get('filename', 'policy'),
                              collection='policies_fs', as_attachment=False)


@policies_bp.route('/<pid>/acknowledge', methods=['POST'])
@tenant_scoped
def acknowledge_policy(pid):
    db = get_db()
    policy = db.policies.find_one({'_id': ObjectId(pid)})
    if not policy:
        return jsonify({'error': 'Not found'}), 404
    uid = str(g.caller['_id'])
    db.policy_acknowledgments.update_one(
        {'policy_id': pid, 'user_id': uid},
        {'$setOnInsert': {'acknowledged_at': datetime.utcnow()}},
        upsert=True,
    )
    return jsonify({'message': 'Acknowledged'})


@policies_bp.route('/<pid>/acknowledgments', methods=['GET'])
@require_permission('policies.view_acknowledgments')
def list_acknowledgments(pid):
    db = get_db()
    acks = list(db.policy_acknowledgments.find({'policy_id': pid}))
    ack_user_ids = {a['user_id'] for a in acks}
    all_users = list(db.users.find({'is_active': {'$ne': False}}, {'name': 1, 'email': 1}))
    out = []
    for u in all_users:
        out.append({
            'user_id': str(u['_id']), 'name': u.get('name'), 'email': u.get('email'),
            'acknowledged': str(u['_id']) in ack_user_ids,
        })
    return jsonify({
        'total': len(all_users), 'acknowledged_count': len(ack_user_ids), 'users': out,
    })


@policies_bp.route('/<pid>', methods=['DELETE'])
@require_permission('policies.manage')
def delete_policy(pid):
    db = get_db()
    result = db.policies.update_one({'_id': ObjectId(pid)}, {'$set': {'is_active': False, 'updated_at': datetime.utcnow()}})
    if result.matched_count == 0:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'message': 'Archived'})
