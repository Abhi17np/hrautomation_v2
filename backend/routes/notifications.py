"""
routes/notifications.py — the unified in-app notification center. Powers
the bell dropdown in the main app layout.
"""
from datetime import datetime

from bson import ObjectId
from flask import Blueprint, g, jsonify, request

from auth_utils import tenant_scoped
from tenant_scope import get_db

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/', methods=['GET'])
@tenant_scoped
def list_notifications():
    db = get_db()
    uid = str(g.caller['_id'])
    limit = min(int(request.args.get('limit', 30)), 100)
    notifs = list(db.notifications.find({'user_id': uid}).sort('created_at', -1).limit(limit))
    unread_count = db.notifications.count_documents({'user_id': uid, 'read': {'$ne': True}})
    for n in notifs:
        n['_id'] = str(n['_id'])
        n['created_at'] = n['created_at'].isoformat()
    return jsonify({'notifications': notifs, 'unread_count': unread_count})


@notifications_bp.route('/<nid>/read', methods=['POST'])
@tenant_scoped
def mark_read(nid):
    db = get_db()
    uid = str(g.caller['_id'])
    db.notifications.update_one({'_id': ObjectId(nid), 'user_id': uid}, {'$set': {'read': True}})
    return jsonify({'message': 'Marked read'})


@notifications_bp.route('/mark-all-read', methods=['POST'])
@tenant_scoped
def mark_all_read():
    db = get_db()
    uid = str(g.caller['_id'])
    db.notifications.update_many({'user_id': uid, 'read': {'$ne': True}}, {'$set': {'read': True}})
    return jsonify({'message': 'All marked read'})
