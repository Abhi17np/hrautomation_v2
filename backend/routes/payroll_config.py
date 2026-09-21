"""
routes/payroll_config.py — per-tenant statutory payroll settings (PF, ESI,
Professional Tax, TDS). See payroll_engine.py's module docstring for the
compliance notice on these values.
"""
from datetime import datetime

from bson import ObjectId
from flask import Blueprint, current_app, g, jsonify, request

from auth_utils import require_permission, tenant_scoped
from payroll_engine import PT_SLABS_BY_STATE, default_payroll_config

payroll_config_bp = Blueprint('payroll_config', __name__)


def _get_company():
    return current_app.db.companies.find_one({'_id': ObjectId(g.tenant_id)}) or {}


@payroll_config_bp.route('/', methods=['GET'])
@tenant_scoped
def get_config():
    company = _get_company()
    config = company.get('payroll_config') or {}
    merged = default_payroll_config()
    for key in ('pf', 'esi', 'professional_tax', 'tds'):
        if config.get(key):
            merged[key] = {**merged[key], **config[key]}
    merged['pay_cycle_start_day'] = config.get('pay_cycle_start_day', 1)
    return jsonify({'config': merged, 'available_pt_states': sorted(PT_SLABS_BY_STATE)})


@payroll_config_bp.route('/', methods=['PUT'])
@require_permission('payroll.configure')
def update_config():
    data = request.json or {}
    update = {}
    for key in ('pf', 'esi', 'professional_tax', 'tds'):
        if key in data and isinstance(data[key], dict):
            update[f'payroll_config.{key}'] = data[key]
    if not update:
        return jsonify({'error': 'No valid config sections provided (pf, esi, professional_tax, tds)'}), 400
    update['updated_at'] = datetime.utcnow()

    current_app.db.companies.update_one({'_id': ObjectId(g.tenant_id)}, {'$set': update})

    from audit import log_audit
    log_audit(current_app.db, g.tenant_id, g.caller, 'payroll.config_updated', details={'sections': list(data.keys())})

    return get_config()
