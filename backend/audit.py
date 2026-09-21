"""
audit.py — append-only audit trail for sensitive actions.

Call log_audit(...) from any route that changes access, credentials, or
workflow configuration. Never raises — a logging failure must not break
the action it's recording.
"""
import logging
from datetime import datetime

log = logging.getLogger(__name__)


def log_audit(db, tenant_id, actor, action, entity_type=None, entity_id=None, details=None, ip=None):
    try:
        db.audit_log.insert_one({
            'tenant_id': tenant_id,
            'actor_user_id': str(actor['_id']) if actor else None,
            'actor_name': actor.get('name') if actor else None,
            'action': action,
            'entity_type': entity_type,
            'entity_id': str(entity_id) if entity_id else None,
            'details': details or {},
            'ip': ip,
            'created_at': datetime.utcnow(),
        })
    except Exception as e:
        log.warning('Audit log write failed for action=%s: %s', action, e)
