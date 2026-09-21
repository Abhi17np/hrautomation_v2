"""
routes/public_api.py — small read-only public API for external
integrations (accounting/ERP exports, calendar sync), authenticated via
a tenant-issued API key (routes/api_keys.py) rather than a user JWT.
An Enterprise-plan feature (feature.api_access).
"""
import hashlib
from datetime import datetime

from bson import ObjectId
from flask import Blueprint, Response, current_app, g, jsonify, request

from auth_utils import require_api_key
from tenant_scope import get_db

public_api_bp = Blueprint('public_api', __name__)


def _check_feature():
    from feature_gating import company_features
    company = current_app.db.companies.find_one({'_id': ObjectId(g.tenant_id)})
    if 'feature.api_access' not in company_features(current_app.db, company):
        return jsonify({'error': 'The public API is an Enterprise-plan feature.'}), 403
    return None


@public_api_bp.route('/employees', methods=['GET'])
@require_api_key
def list_employees():
    gate = _check_feature()
    if gate:
        return gate
    db = get_db()
    fields = {'name': 1, 'employee_id': 1, 'designation': 1, 'department': 1, 'status': 1, 'joining_date': 1}
    employees = list(db.employees.find({}, fields))
    for e in employees:
        e['_id'] = str(e['_id'])
    return jsonify({'employees': employees})


@public_api_bp.route('/attendance', methods=['GET'])
@require_api_key
def attendance():
    gate = _check_feature()
    if gate:
        return gate
    db = get_db()
    start = request.args.get('from')
    end = request.args.get('to')
    if not start or not end:
        return jsonify({'error': 'from and to (YYYY-MM-DD) query params are required'}), 400
    records = list(db.attendance_daily.find({'date': {'$gte': start, '$lte': end}}))
    for r in records:
        r['_id'] = str(r['_id'])
    return jsonify({'attendance': records})


@public_api_bp.route('/calendar.ics', methods=['GET'])
def calendar_ics():
    """Calendar apps can't send custom headers, so this one endpoint
    authenticates via a ?key= query param instead of X-API-Key."""
    raw_key = request.args.get('key', '')
    if not raw_key:
        return jsonify({'error': 'key query param is required'}), 401
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_doc = current_app.db.api_keys.find_one({'key_hash': key_hash, 'is_active': True})
    if not key_doc:
        return jsonify({'error': 'Invalid or revoked API key'}), 401

    from feature_gating import company_features
    company = current_app.db.companies.find_one({'_id': ObjectId(key_doc['tenant_id'])})
    if 'feature.api_access' not in company_features(current_app.db, company):
        return jsonify({'error': 'The public API is an Enterprise-plan feature.'}), 403

    holidays = list(current_app.db.holidays.find({'tenant_id': key_doc['tenant_id']}))
    lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HR Automation//Holiday Calendar//EN']
    for h in holidays:
        d = (h.get('date') or '').replace('-', '')
        if len(d) != 8:
            continue
        lines += [
            'BEGIN:VEVENT',
            f'UID:{h["_id"]}@hr-automation',
            f'DTSTART;VALUE=DATE:{d}',
            f'SUMMARY:{h.get("name", "Holiday")}',
            'END:VEVENT',
        ]
    lines.append('END:VCALENDAR')
    return Response('\r\n'.join(lines), mimetype='text/calendar')
