"""
create_platform_admin.py — bootstrap the first platform (super-admin) account.

There's no self-serve way to create the very first platform admin (that
would be a chicken-and-egg problem), so this is a one-off CLI script, same
pattern as db_init.py.

Usage:
    cd backend
    python scripts/create_platform_admin.py --email you@yourcompany.com --name "Your Name"
    (prompts for a password; or pass --password, less secure — shell history)
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
    parser.add_argument('--email', required=True)
    parser.add_argument('--name', required=True)
    parser.add_argument('--password', help='If omitted, you will be prompted (recommended).')
    args = parser.parse_args()

    password = args.password or getpass.getpass('Password: ')
    if len(password) < 8:
        print('Password must be at least 8 characters for a platform admin account.')
        return 1

    db = get_db()
    if db.platform_admins.find_one({'email': args.email}):
        print(f'A platform admin with email {args.email!r} already exists — nothing to do.')
        return 0

    db.platform_admins.insert_one({
        'name': args.name,
        'email': args.email,
        'password': bcrypt.hashpw(password.encode(), bcrypt.gensalt()),
        'created_at': datetime.utcnow(),
    })
    print(f'Platform admin {args.email!r} created. Log in at POST /api/platform/login.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
