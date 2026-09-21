"""
routes/announcements.py — company notice board. Posting one also pushes a
unified notification (notifications.py) to every targeted user.
"""
from datetime import datetime

from bson import ObjectId
from flask import Blueprint, g, jsonify, request

from auth_utils import require_permission, tenant_scoped
from tenant_scope import get_db
from notifications import push_notification_bulk

announcements_bp = Blueprint('announcements', __name__)


def _serialize(a):
    a['_id'] = str(a['_id'])
    for f in ('created_at', 'updated_at', 'expires_at'):
        if a.get(f):
            a[f] = a[f].isoformat()
    return a


def _visible_to(caller):
    role = caller.get('role')
    role_key = caller.get('role_key') or role
    return {'$or': [
        {'target_roles': {'$in': [None, []]}},
        {'target_roles': {'$exists': False}},
        {'target_roles': {'$in': [role, role_key]}},
    ]}


@announcements_bp.route('/', methods=['GET'])
@tenant_scoped
def list_announcements():
    db = get_db()
    now = datetime.utcnow()
    query = {'$and': [
        _visible_to(g.caller),
        {'$or': [{'expires_at': None}, {'expires_at': {'$gte': now}}, {'expires_at': {'$exists': False}}]},
    ]}
    items = list(db.announcements.find(query).sort([('pinned', -1), ('created_at', -1)]))
    return jsonify([_serialize(a) for a in items])


@announcements_bp.route('/', methods=['POST'])
@require_permission('announcements.manage')
def create_announcement():
    db = get_db()
    data = request.json or {}
    title = (data.get('title') or '').strip()
    body = (data.get('body') or '').strip()
    if not title or not body:
        return jsonify({'error': 'title and body are required'}), 400

    target_roles = data.get('target_roles') or []
    now = datetime.utcnow()
    doc = {
        'title': title, 'body': body, 'target_roles': target_roles,
        'pinned': bool(data.get('pinned', False)),
        'created_by': str(g.caller['_id']), 'created_at': now,
    }
    if data.get('expires_at'):
        try:
            doc['expires_at'] = datetime.fromisoformat(data['expires_at'])
        except ValueError:
            return jsonify({'error': 'expires_at must be an ISO date'}), 400

    result = db.announcements.insert_one(doc)
    doc['_id'] = result.inserted_id

    if target_roles:
        target_users = db.users.find({'$or': [{'role': {'$in': target_roles}}, {'role_key': {'$in': target_roles}}]}, {'_id': 1})
    else:
        target_users = db.users.find({}, {'_id': 1})
    user_ids = [u['_id'] for u in target_users]
    push_notification_bulk(db, user_ids, title, message=body[:200], link='#/', ntype='announcement')

    return jsonify(_serialize(doc)), 201


@announcements_bp.route('/<aid>', methods=['DELETE'])
@require_permission('announcements.manage')
def delete_announcement(aid):
    db = get_db()
    result = db.announcements.delete_one({'_id': ObjectId(aid)})
    if result.deleted_count == 0:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'message': 'Deleted'})
