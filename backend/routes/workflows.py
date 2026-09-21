"""
routes/workflows.py — Approval Workflow configuration.

Lets a tenant admin view and edit the stage chain for each configurable
process type (offer_letter, appointment_order, exit_resignation): reorder
stages, rename them, change which role approves each one, add/remove
stages, and toggle self-approval. See workflow_engine.py for how a chain
is walked at runtime.
"""
from datetime import datetime

from bson import ObjectId
from flask import Blueprint, g, jsonify, request

from auth_utils import require_permission, tenant_scoped
from tenant_scope import get_db
from workflow_engine import PROCESS_TYPES, get_active_definition, seed_default_definition
from audit import log_audit

workflows_bp = Blueprint('workflows', __name__)


def _serialize(definition, roles_by_id):
    definition = dict(definition)
    definition['_id'] = str(definition['_id'])
    for stage in definition['stages']:
        role = roles_by_id.get(stage.get('approver_role_id'))
        stage['approver_role_name'] = role['name'] if role else 'Unknown role'
    return definition


@workflows_bp.route('/', methods=['GET'])
@tenant_scoped
def list_workflows():
    db = get_db()
    roles_by_id = {str(r['_id']): r for r in db.roles.find({})}
    tenant_id = _tenant_id_of(db)
    out = [_serialize(get_active_definition(db, tenant_id, pt), roles_by_id) for pt in PROCESS_TYPES]
    return jsonify(out)


def _tenant_id_of(db):
    # get_db() returns a TenantScopedDB; its tenant_id is private but every
    # collection proxy carries it as _tid.
    return db.roles._tid


@workflows_bp.route('/<process_type>', methods=['GET'])
@tenant_scoped
def get_workflow(process_type):
    db = get_db()
    if process_type not in PROCESS_TYPES:
        return jsonify({'error': f'Unknown process_type. Must be one of {list(PROCESS_TYPES)}'}), 400
    definition = get_active_definition(db, _tenant_id_of(db), process_type)
    roles_by_id = {str(r['_id']): r for r in db.roles.find({})}
    return jsonify(_serialize(definition, roles_by_id))


@workflows_bp.route('/<process_type>', methods=['PUT'])
@require_permission('workflows.manage')
def update_workflow(process_type):
    db = get_db()
    if process_type not in PROCESS_TYPES:
        return jsonify({'error': f'Unknown process_type. Must be one of {list(PROCESS_TYPES)}'}), 400

    data = request.json or {}
    stages = data.get('stages')
    if not stages or not isinstance(stages, list):
        return jsonify({'error': 'stages array is required and cannot be empty'}), 400

    if len(stages) > 1:
        from flask import current_app
        from feature_gating import company_features
        company = current_app.db.companies.find_one({'_id': ObjectId(g.tenant_id)})
        if 'feature.custom_workflows' not in company_features(current_app.db, company):
            return jsonify({'error': 'Multi-stage workflows are not available on this plan — upgrade to Pro or Enterprise. You can still rename or reassign the single default stage.'}), 403

    valid_role_ids = {str(r['_id']) for r in db.roles.find({})}
    seen_keys = set()
    cleaned = []
    for i, s in enumerate(stages):
        name = (s.get('name') or '').strip()
        role_id = s.get('approver_role_id')
        if not name:
            return jsonify({'error': f'Stage {i + 1}: name is required'}), 400
        if role_id not in valid_role_ids:
            return jsonify({'error': f'Stage {i + 1}: unknown approver_role_id'}), 400
        key = s.get('stage_key') or f'stage_{i + 1}'
        if key in seen_keys:
            return jsonify({'error': f'Duplicate stage_key: {key}'}), 400
        seen_keys.add(key)
        cleaned.append({
            'stage_key': key,
            'name': name,
            'approver_role_id': role_id,
            'allow_self_approval': bool(s.get('allow_self_approval', True)),
            'pending_status': s.get('pending_status') or f'pending_{key}',
            'resulting_status_on_approve': s.get('resulting_status_on_approve') or 'approved',
            'resulting_status_on_reject': s.get('resulting_status_on_reject') or 'rejected',
        })

    # Chain the pending_status of stage N+1 to be stage N's
    # resulting_status_on_approve, so an intermediate approval always
    # advances the entity into exactly the next stage's waiting state.
    for i in range(len(cleaned) - 1):
        cleaned[i]['resulting_status_on_approve'] = cleaned[i + 1]['pending_status']

    tenant_id = _tenant_id_of(db)
    # Ensures an active definition row exists (seeding the built-in default
    # on first touch) before we overwrite its stages with what was submitted.
    definition = get_active_definition(db, tenant_id, process_type)
    db.workflow_definitions.update_one(
        {'_id': definition['_id']},
        {'$set': {'stages': cleaned, 'updated_at': datetime.utcnow()}}
    )
    definition = db.workflow_definitions.find_one({'_id': definition['_id']})
    log_audit(db, tenant_id, g.caller, 'workflow.updated', entity_type='workflow_definition',
              entity_id=definition['_id'], details={'process_type': process_type, 'stage_count': len(cleaned)})

    roles_by_id = {str(r['_id']): r for r in db.roles.find({})}
    return jsonify(_serialize(definition, roles_by_id))


@workflows_bp.route('/<process_type>/reset', methods=['POST'])
@require_permission('workflows.manage')
def reset_workflow(process_type):
    db = get_db()
    if process_type not in PROCESS_TYPES:
        return jsonify({'error': f'Unknown process_type. Must be one of {list(PROCESS_TYPES)}'}), 400
    tenant_id = _tenant_id_of(db)
    db.workflow_definitions.delete_many({'tenant_id': tenant_id, 'process_type': process_type})
    definition = seed_default_definition(db, tenant_id, process_type)
    log_audit(db, tenant_id, g.caller, 'workflow.reset', entity_type='workflow_definition',
              entity_id=definition['_id'], details={'process_type': process_type})
    roles_by_id = {str(r['_id']): r for r in db.roles.find({})}
    return jsonify(_serialize(definition, roles_by_id))
