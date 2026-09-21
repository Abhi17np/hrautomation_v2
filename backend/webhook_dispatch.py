"""
webhook_dispatch.py — fires registered webhooks when a subscribed event
happens. Synchronous with a short timeout (there's no background job
queue in this codebase yet — see the infra-hardening backlog item);
delivery failures are logged, never raised, so a slow/broken subscriber
endpoint can't break the request that triggered the event.
"""
import hashlib
import hmac
import json
import logging
from datetime import datetime

import requests

log = logging.getLogger(__name__)

TIMEOUT_SECONDS = 4


def dispatch_event(db, event_type, payload):
    """`db` must be a TenantScopedDB (or equivalent already tenant-scoped
    accessor) so only this tenant's webhooks are found."""
    try:
        subscribers = list(db.webhooks.find({'events': event_type, 'is_active': True}))
    except Exception as e:
        log.warning('Webhook lookup failed for event=%s: %s', event_type, e)
        return

    for hook in subscribers:
        body = json.dumps({'event': event_type, 'data': payload, 'timestamp': datetime.utcnow().isoformat()})
        signature = hmac.new(hook['secret'].encode(), body.encode(), hashlib.sha256).hexdigest()
        status = None
        try:
            resp = requests.post(
                hook['url'], data=body, timeout=TIMEOUT_SECONDS,
                headers={'Content-Type': 'application/json', 'X-Webhook-Signature': signature, 'X-Webhook-Event': event_type},
            )
            status = resp.status_code
        except Exception as e:
            log.warning('Webhook delivery failed for %s (event=%s): %s', hook['url'], event_type, e)
        finally:
            try:
                db.webhooks.update_one({'_id': hook['_id']}, {'$set': {
                    'last_delivery_status': status, 'last_delivery_at': datetime.utcnow(),
                }})
            except Exception:
                pass
