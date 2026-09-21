"""
scripts/backfill_workflows.py — one-time migration for the workflow engine.

For every company:
  1. Seed the default workflow_definitions (offer_letter, appointment_order,
     exit_resignation) — idempotent, matches today's hardcoded single-stage
     flow exactly, so nothing changes for a tenant that never customizes it.
  2. Wrap any already-in-flight letter / appointment order / employee exit
     (submitted before this migration ran) in a synthesized
     workflow_instances doc at the matching stage, so hr-action /
     approve-resignation keep working for them instead of 400ing with
     "no approval in progress".

Purely additive — never touches `letters`, `appointment_orders`, or
`employees`. Safe to re-run (skips entities that already have an
in_progress instance).

Usage:
    cd backend
    python scripts/backfill_workflows.py
"""
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from pymongo import MongoClient

from workflow_engine import PROCESS_TYPES, get_active_definition, get_instance_for_entity

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/hr_offer_letters')

# (collection, entity_type, process_type, pending_status_field_value_matcher)
IN_FLIGHT = [
    ('letters', 'letter', 'offer_letter', lambda doc: doc.get('letter_type') == 'offer' and doc.get('status') == 'pending_hr_head'),
    ('appointment_orders', 'appointment_order', 'appointment_order', lambda doc: doc.get('status') == 'pending_hr_head'),
    ('employees', 'employee_exit', 'exit_resignation', lambda doc: doc.get('status') == 'resignation_pending'),
]


def run():
    client = MongoClient(MONGO_URI)
    db_name = "hr_offer_letters"
    if "/" in MONGO_URI:
        part = MONGO_URI.split("/")[-1].split("?")[0].strip()
        if part:
            db_name = part
    db = client[db_name]

    companies = list(db.companies.find({}))
    print(f"Found {len(companies)} companies.")

    for company in companies:
        tenant_id = str(company['_id'])
        print(f"\n[{company.get('name', tenant_id)}]")

        definitions = {}
        for process_type in PROCESS_TYPES:
            definitions[process_type] = get_active_definition(db, tenant_id, process_type)
        print("  workflow_definitions seeded for:", list(definitions))

        for coll_name, entity_type, process_type, matches in IN_FLIGHT:
            coll = db[coll_name]
            docs = list(coll.find({'tenant_id': tenant_id}))
            in_flight_docs = [d for d in docs if matches(d)]
            wrapped = 0
            for doc in in_flight_docs:
                entity_id = str(doc['_id'])
                existing = get_instance_for_entity(db, entity_type, entity_id)
                if existing:
                    continue
                definition = definitions[process_type]
                stage0 = definition['stages'][0]
                now = datetime.utcnow()
                db.workflow_instances.insert_one({
                    'tenant_id': tenant_id, 'process_type': process_type,
                    'definition_id': str(definition['_id']),
                    'entity_type': entity_type, 'entity_id': entity_id,
                    'current_stage_key': stage0['stage_key'], 'status': 'in_progress',
                    'history': [{
                        'stage_key': 'submit', 'user_id': doc.get('created_by') or doc.get('generated_by') or '',
                        'user_name': '', 'action': 'submit',
                        'remarks': 'Backfilled from pre-existing in-flight status',
                        'timestamp': (doc.get('created_at') or now).isoformat() if hasattr(doc.get('created_at') or now, 'isoformat') else str(now),
                    }],
                    'created_at': now, 'updated_at': now,
                })
                wrapped += 1
            if in_flight_docs:
                print(f"  {coll_name}: {wrapped} in-flight doc(s) wrapped in a workflow_instances row")

    print("\nBackfill complete.")


if __name__ == '__main__':
    run()
