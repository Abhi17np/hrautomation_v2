from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId

notifications_bp = Blueprint('notifications', __name__)


def _s(doc):
    doc['_id'] = str(doc['_id'])
    if doc.get('created_at'):
        doc['created_at'] = doc['created_at'].isoformat()
    return doc


@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def list_notifications():
    db  = current_app.db
    uid = get_jwt_identity()

    notes = list(
        db.notifications.find({'user_id': uid}).sort('created_at', -1).limit(50)
    )
    unread = db.notifications.count_documents({'user_id': uid, 'read': False})

    return jsonify({
        'notifications': [_s(n) for n in notes],
        'unread_count':  unread,
    })


@notifications_bp.route('/<note_id>/mark-read', methods=['POST'])
@jwt_required()
def mark_read(note_id):
    db  = current_app.db
    uid = get_jwt_identity()

    try:
        oid = ObjectId(note_id)
    except Exception:
        return jsonify({'error': 'Invalid notification id'}), 400

    result = db.notifications.update_one(
        {'_id': oid, 'user_id': uid},
        {'$set': {'read': True}}
    )
    if result.matched_count == 0:
        return jsonify({'error': 'Notification not found'}), 404

    return jsonify({'message': 'Marked as read'})


@notifications_bp.route('/mark-all-read', methods=['POST'])
@jwt_required()
def mark_all_read():
    db  = current_app.db
    uid = get_jwt_identity()

    db.notifications.update_many(
        {'user_id': uid, 'read': False},
        {'$set': {'read': True}}
    )
    return jsonify({'message': 'All notifications marked as read'})
