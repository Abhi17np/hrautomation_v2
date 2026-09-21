"""
notifications.py — unified in-app notification helpers. New modules
should push notifications through here rather than inventing their own
per-module shape (leave_notifications predates this and is left as-is).
"""
from datetime import datetime


def push_notification(db, user_id, title, message=None, link=None, ntype=None):
    db.notifications.insert_one({
        'user_id': str(user_id), 'title': title, 'message': message,
        'link': link, 'type': ntype, 'read': False, 'created_at': datetime.utcnow(),
    })


def push_notification_bulk(db, user_ids, title, message=None, link=None, ntype=None):
    if not user_ids:
        return
    now = datetime.utcnow()
    db.notifications.insert_many([
        {'user_id': str(uid), 'title': title, 'message': message,
         'link': link, 'type': ntype, 'read': False, 'created_at': now}
        for uid in user_ids
    ])
