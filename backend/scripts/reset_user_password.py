"""
reset_user_password.py — reset a tenant user's password directly in the
database. An in-app self-service "forgot password" flow now exists
(POST /api/auth/forgot-password) — prefer that. This script remains for
emergency ops use when email delivery itself is broken or SMTP isn't
configured for that tenant.

Usage:
    cd backend
    python scripts/reset_user_password.py --company infopace --email admin@company.com
    (prompts for the new password, hidden input; or pass --password, less
    secure since it lands in shell history)
"""
import argparse
import getpass
import os
import sys
from datetime import datetime

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

import bcrypt  # noqa: E402
from pymongo import MongoClient  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from security_utils import validate_password_policy  # noqa: E402

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/hr_offer_letters')


def get_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
    client.admin.command('ping')
    db_name = 'hr_offer_letters'
    if '/' in MONGO_URI:
        part = MONGO_URI.split('/')[-1].split('?')[0].strip()
        if part:
            db_name = part
    return client[db_name]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--company', required=True, help="Tenant slug (the company code used at login)")
    parser.add_argument('--email', required=True)
    parser.add_argument('--password', help='If omitted, you will be prompted (recommended).')
    args = parser.parse_args()

    db = get_db()

    company = db.companies.find_one({'slug': args.company})
    if not company:
        print(f"No company found with slug {args.company!r}.")
        return 1
    tenant_id = str(company['_id'])

    user = db.users.find_one({'tenant_id': tenant_id, 'email': args.email})
    if not user:
        print(f"No user {args.email!r} found under company {args.company!r}.")
        return 1

    password = args.password or getpass.getpass('New password: ')
    policy_error = validate_password_policy(password)
    if policy_error:
        print(policy_error)
        return 1

    new_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    db.users.update_one(
        {'_id': user['_id']},
        {'$set': {
            'password': new_hash, 'updated_at': datetime.utcnow(),
            'must_reset_password': False, 'failed_login_attempts': 0, 'locked_until': None,
            'invite_token': None, 'invite_expires_at': None,
        }},
    )
    print(f"Password reset for {args.email!r} (role={user.get('role')}) under company {args.company!r}.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
