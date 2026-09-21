"""
services/email_service.py — thin wrapper over SMTP for transactional
credentialing emails (invite, password reset). Reuses the same SMTP_*
env vars already used by routes/letters.py and routes/exit.py.
"""
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

log = logging.getLogger(__name__)


def _smtp_config():
    return {
        'host': os.getenv('SMTP_HOST') or os.getenv('SMTP_SERVER', ''),
        'user': os.getenv('SMTP_USER') or os.getenv('SMTP_EMAIL', ''),
        'pass': os.getenv('SMTP_PASS') or os.getenv('SMTP_PASSWORD', ''),
        'port': int(os.getenv('SMTP_PORT', 587)),
        'from': os.getenv('SMTP_FROM') or os.getenv('SMTP_EMAIL', ''),
    }


def is_configured():
    cfg = _smtp_config()
    return bool(cfg['host'] and cfg['user'])


def send_email(to_email, subject, body_text, from_label='HR Team'):
    """Returns True if sent, False if SMTP isn't configured or send failed
    (logged, never raised — a missing invite email shouldn't 500 the
    request that triggered it; the token/link is still valid and can be
    resent)."""
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
        with smtplib.SMTP(cfg['host'], cfg['port']) as s:
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
