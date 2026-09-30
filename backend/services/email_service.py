"""
services/email_service.py — transactional email (invites, password resets,
demo requests).

Two ways out, picked automatically:

  RESEND_API_KEY set  -> Resend's HTTPS API
  otherwise           -> SMTP, via the SMTP_* vars letters.py and exit.py use

The HTTPS path exists because most managed hosts block outbound SMTP to stop
spam abuse. Render is one: ports 25, 465 and 587 are refused, and a send that
works from a laptop fails there with "[Errno 101] Network is unreachable" no
matter how correct the credentials are. Port 443 is not blocked, so an API that
speaks HTTPS gets through where SMTP cannot.

SMTP stays the default so local development and any self-hosted deployment keep
working with no new account to sign up for.
"""
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

log = logging.getLogger(__name__)

RESEND_ENDPOINT = 'https://api.resend.com/emails'
# One request sends two messages (the visitor's confirmation and the team's
# heads-up), so the worst case is twice this. Kept to 10s so that even two dead
# sends come in under a 30s serverless function limit and the caller still gets
# its response — the lead is already stored by then either way.
SEND_TIMEOUT = 10


def _smtp_config():
    return {
        'host': os.getenv('SMTP_HOST') or os.getenv('SMTP_SERVER', ''),
        'user': os.getenv('SMTP_USER') or os.getenv('SMTP_EMAIL', ''),
        'pass': os.getenv('SMTP_PASS') or os.getenv('SMTP_PASSWORD', ''),
        'port': int(os.getenv('SMTP_PORT', 587)),
        'from': os.getenv('SMTP_FROM') or os.getenv('SMTP_EMAIL', ''),
    }


def _resend_key():
    return os.getenv('RESEND_API_KEY', '').strip()


def _from_address():
    """The address mail is sent as. Resend needs a domain you have verified
    with them; SMTP_FROM doubles as that address so there is one thing to set."""
    return (os.getenv('MAIL_FROM') or os.getenv('SMTP_FROM')
            or os.getenv('SMTP_USER') or os.getenv('SMTP_EMAIL', ''))


def is_configured():
    if _resend_key() and _from_address():
        return True
    cfg = _smtp_config()
    return bool(cfg['host'] and cfg['user'])


def _send_via_resend(to_email, subject, body_text, from_label):
    """One HTTPS POST. Returns True only on a 2xx; anything else is logged with
    the provider's own reason, which is usually specific (an unverified sending
    domain, a bad key) and worth reading."""
    import requests
    sender = _from_address()
    try:
        r = requests.post(
            RESEND_ENDPOINT,
            headers={'Authorization': f'Bearer {_resend_key()}',
                     'Content-Type': 'application/json'},
            json={'from': f'{from_label} <{sender}>',
                  'to': [to_email],
                  'subject': subject,
                  'text': body_text},
            timeout=SEND_TIMEOUT,
        )
        if r.status_code // 100 == 2:
            return True
        log.warning('Email send failed via Resend: %s -> %s (HTTP %s: %s)',
                    subject, to_email, r.status_code, r.text[:200])
        return False
    except Exception as e:
        log.warning('Email send failed via Resend: %s -> %s (%s)', subject, to_email, e)
        return False


def send_email(to_email, subject, body_text, from_label='HR Team'):
    """Returns True if sent, False if SMTP isn't configured or send failed
    (logged, never raised — a missing invite email shouldn't 500 the
    request that triggered it; the token/link is still valid and can be
    resent)."""
    if _resend_key():
        if not _from_address():
            log.warning('Email not sent (RESEND_API_KEY set but no MAIL_FROM/SMTP_FROM): '
                        '%s -> %s', subject, to_email)
            return False
        return _send_via_resend(to_email, subject, body_text, from_label)

    cfg = _smtp_config()
    if not cfg['host'] or not cfg['user']:
        log.warning('Email not sent (SMTP not configured): %s -> %s', subject, to_email)
        return False
    try:
        msg = MIMEMultipart()
        msg['From'] = f'{from_label} <{cfg["from"] or cfg["user"]}>'
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body_text, 'plain'))
        # A timeout is not optional: without one a mail server that accepts the
        # connection and then stalls blocks this call indefinitely. On a
        # persistent host that leaks a thread; on a serverless runtime it burns
        # the whole function duration and the request fails outright.
        with smtplib.SMTP(cfg['host'], cfg['port'], timeout=SEND_TIMEOUT) as s:
            s.ehlo(); s.starttls(); s.ehlo()
            s.login(cfg['user'], cfg['pass'])
            s.sendmail(cfg['from'] or cfg['user'], to_email, msg.as_string())
        return True
    except Exception as e:
        log.warning('Email send failed: %s -> %s (%s)', subject, to_email, e)
        return False


def send_invite_email(to_email, name, company_name, accept_url):
    subject = f'You’ve been invited to {company_name}'
    body = f"""Hi {name},

You've been added to {company_name}'s HR portal. Set your password to activate your account:

{accept_url}

This link expires in 48 hours. If you weren't expecting this, you can ignore this email.

Regards,
{company_name} HR Team
"""
    return send_email(to_email, subject, body, from_label=f'{company_name} HR Team')


def send_password_reset_email(to_email, name, company_name, reset_url):
    subject = f'Reset your {company_name} password'
    body = f"""Hi {name},

We received a request to reset your password. Click the link below to choose a new one:

{reset_url}

This link expires in 48 hours. If you didn't request this, you can ignore this email — your password won't change.

Regards,
{company_name} HR Team
"""
    return send_email(to_email, subject, body, from_label=f'{company_name} HR Team')
