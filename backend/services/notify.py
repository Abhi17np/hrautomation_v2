"""
notify.py — shared in-app notification helper.

Generalizes the pattern leaves.py used to roll on its own (db.leave_notifications,
role-broadcast only) into a per-user + per-role notification store any module
can write to. Call notify() from a route right after the state change that
should alert someone.
"""

from datetime import datetime


def notify(db, *, type, title, message, user_ids=None, roles=None, link='', related_id=None):
    """
    Insert one notification doc per resolved target.
      - user_ids: iterable of user _id strings to notify directly.
      - roles:    iterable of role names (e.g. ['hr', 'hr_head', 'admin']) —
                   every user currently holding one of these roles is notified.
    At least one of user_ids/roles must be given. Silently no-ops on an empty
    target list (e.g. an employee with no manager_id).
    """
    targets = set()
    if user_ids:
        targets.update(str(uid) for uid in user_ids if uid)
    if roles:
        role_list = list(roles)
        if role_list:
            for u in db.users.find({'role': {'$in': role_list}}, {'_id': 1}):
                targets.add(str(u['_id']))

    if not targets:
        return

    now = datetime.utcnow()
    docs = [{
        'user_id':    uid,
        'type':       type,
        'title':      title,
        'message':    message,
        'link':       link,
        'related_id': related_id,
        'read':       False,
        'created_at': now,
    } for uid in targets]

    db.notifications.insert_many(docs)


def notify_employee(db, employee_id, *, type, title, message, link='', related_id=None):
    """Convenience wrapper: resolve an employee_id to its linked user account
    (employees.py stores the login on db.users.employee_ref) and notify them.
    No-ops if the employee has no login account."""
    if not employee_id:
        return
    user = db.users.find_one({'employee_ref': employee_id})
    if not user:
        return
    notify(db, type=type, title=title, message=message,
           user_ids=[str(user['_id'])], link=link, related_id=related_id)
