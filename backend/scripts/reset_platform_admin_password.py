"""
reset_platform_admin_password.py — reset a platform admin's password (or
list existing platform admin emails if you've forgotten which one to
use). Platform admins are a separate collection from tenant users (see
routes/platform.py) with no self-service reset — this is the only way to
recover access if the password is lost.

Usage:
    cd backend
    python scripts/reset_platform_admin_password.py --list
    python scripts/reset_platform_admin_password.py --email you@yourcompany.com
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
    parser.add_argument('--list', action='store_true', help='List existing platform admin emails and exit.')
    parser.add_argument('--email')
    parser.add_argument('--password', help='If omitted, you will be prompted (recommended).')
    args = parser.parse_args()

    db = get_db()

    if args.list:
        admins = list(db.platform_admins.find({}, {'email': 1, 'name': 1, 'created_at': 1}))
        if not admins:
            print('No platform admins exist yet — run create_platform_admin.py to create the first one.')
            return 0
        print(f'{len(admins)} platform admin(s):')
        for a in admins:
            created = a.get('created_at').date().isoformat() if a.get('created_at') else '?'
            print(f"  {a['email']}  ({a.get('name', '')}, created {created})")
        return 0

    if not args.email:
        print('--email is required (or use --list to see existing accounts).')
        return 1

    admin = db.platform_admins.find_one({'email': args.email})
    if not admin:
        print(f"No platform admin found with email {args.email!r}. Use --list to see what exists.")
        return 1

    password = args.password or getpass.getpass('New password: ')
    policy_error = validate_password_policy(password)
    if policy_error:
        print(policy_error)
        return 1

    new_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    db.platform_admins.update_one(
        {'_id': admin['_id']},
        {'$set': {'password': new_hash, 'updated_at': datetime.utcnow()}},
    )
    print(f"Password reset for platform admin {args.email!r}.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
