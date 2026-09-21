"""
observability.py — structured logging, request tracing, and an optional
error-tracking hook.

Sentry is intentionally optional: it needs a real DSN from a Sentry
project this codebase doesn't have, so it's feature-detected (only
initializes if both the `sentry-sdk` package and SENTRY_DSN env var are
present) rather than hard-wired. Everything else here (structured log
format, request-id, request timing/error logs) works with zero external
services, which is the gap this addresses — there was previously no
consistent log format and no per-request tracing at all.
"""
import logging
import os
import time
import uuid

from flask import g, request


def configure_logging():
    level = os.getenv('LOG_LEVEL', 'INFO').upper()
    logging.basicConfig(
        level=level,
        format='%(asctime)s %(levelname)s [%(name)s] request_id=%(request_id)s tenant_id=%(tenant_id)s — %(message)s',
    )

    class _ContextFilter(logging.Filter):
        def filter(self, record):
            try:
                record.request_id = getattr(g, 'request_id', '-')
                record.tenant_id = getattr(g, 'tenant_id', '-')
            except RuntimeError:
                # No app context at all (e.g. a log line during startup) —
                # g itself is unavailable outside one.
                record.request_id = '-'
                record.tenant_id = '-'
            return True

    logging.getLogger().addFilter(_ContextFilter())


def init_sentry(app):
    dsn = os.getenv('SENTRY_DSN')
    if not dsn:
        logging.getLogger(__name__).info('Sentry not configured (SENTRY_DSN unset) — error tracking is log-only')
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration
        sentry_sdk.init(
            dsn=dsn,
            integrations=[FlaskIntegration()],
            environment=os.getenv('FLASK_ENV', 'production'),
            traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.0')),
        )
        logging.getLogger(__name__).info('Sentry error tracking initialized')
    except ImportError:
        logging.getLogger(__name__).warning('SENTRY_DSN is set but sentry-sdk is not installed — add it to requirements.txt to enable')


def register_request_hooks(app):
    log = logging.getLogger('request')

    @app.before_request
    def _start_timer():
        g.request_id = request.headers.get('X-Request-Id') or uuid.uuid4().hex[:12]
        g._start_time = time.time()

    @app.after_request
    def _log_and_tag(response):
        response.headers['X-Request-Id'] = getattr(g, 'request_id', '-')
        duration_ms = (time.time() - getattr(g, '_start_time', time.time())) * 1000
        log.info('%s %s -> %s (%.1fms)', request.method, request.path, response.status_code, duration_ms)
        return response
