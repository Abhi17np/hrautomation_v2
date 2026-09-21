"""
security_utils.py — password policy, token generation, and login-lockout
helpers shared by the credentialing routes in routes/auth.py.
"""
import re
import secrets
from datetime import datetime, timedelta

TOKEN_TTL_HOURS = 48
LOCKOUT_THRESHOLD = 5
LOCKOUT_MINUTES = 15


def generate_token():
    return secrets.token_urlsafe(32)


def token_expiry():
    return datetime.utcnow() + timedelta(hours=TOKEN_TTL_HOURS)


def validate_password_policy(password):
    """Returns an error string if the password fails policy, else None."""
    if not password or len(password) < 8:
        return 'Password must be at least 8 characters'
    if not re.search(r'[A-Za-z]', password):
        return 'Password must contain at least one letter'
    if not re.search(r'[0-9]', password):
        return 'Password must contain at least one digit'
    return None


def is_locked(user):
    locked_until = user.get('locked_until')
    return bool(locked_until and locked_until > datetime.utcnow())


def record_failed_login(db, user_id):
    """Increments the failed-attempt counter and locks the account for
    LOCKOUT_MINUTES once LOCKOUT_THRESHOLD is reached. `db` must be the
    raw (unscoped) app db — this runs before a tenant session exists."""
    user = db.users.find_one({'_id': user_id})
    attempts = (user.get('failed_login_attempts') or 0) + 1 if user else 1
    update = {'failed_login_attempts': attempts}
    if attempts >= LOCKOUT_THRESHOLD:
        update['locked_until'] = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
    db.users.update_one({'_id': user_id}, {'$set': update})


def reset_failed_login(db, user_id):
    db.users.update_one({'_id': user_id}, {'$set': {'failed_login_attempts': 0, 'locked_until': None}})
