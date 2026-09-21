"""
workflow_engine.py — configurable multi-stage approval chains.

Generalizes what used to be hardcoded status transitions in letters.py /
appointment_orders.py / exit.py into a data-driven engine: a tenant's
workflow_definitions doc lists ordered stages (name, approver role,
self-approval rule), and each stage carries the *exact status string* the
old hardcoded code used to set (pending_status / resulting_status_on_*).
The engine writes that same status onto the entity, so every existing
piece of downstream code (letter_generator gates, frontend status filters,
email triggers) keeps working unchanged — only how many stages there are
and which role gates each one becomes configurable per tenant.

Usage in a route:
    from workflow_engine import start_workflow, advance_workflow

    instance, pending_status = start_workflow(
        db, g.tenant_id, 'offer_letter', 'letter', lid, g.caller, remarks='Submitted')
    db.letters.update_one({'_id': ObjectId(lid)}, {'$set': {'status': pending_status, ...}})

    instance = db.workflow_instances.find_one({'entity_type': 'letter', 'entity_id': lid, 'status': 'in_progress'})
    new_status = advance_workflow(db, g.tenant_id, instance, 'approve', g.caller, remarks=remarks)
    db.letters.update_one({'_id': ObjectId(lid)}, {'$set': {'status': new_status, ...}})
"""
from datetime import datetime

from bson import ObjectId

from roles_service import seed_system_roles

# Every process type this engine drives, its override permission (any
# holder can act at ANY stage regardless of that stage's specific
# approver_role — mirrors today's admin/hr_head reach across all flows),
# and the default single-stage chain that reproduces current hardcoded
# behavior so nothing changes for a tenant that never customizes it.
PROCESS_TYPES = {
    'offer_letter': {
        'override_permission': 'letters.approve',
        'default_stages': [
            {
                'stage_key': 'stage_1', 'name': 'HR Head Review', 'base_role': 'hr_head',
                'pending_status': 'pending_hr_head',
                'resulting_status_on_approve': 'approved',
                'resulting_status_on_reject': 'rejected',
                'allow_self_approval': True,
            },
        ],
    },
    'appointment_order': {
        'override_permission': 'appointment_orders.approve',
        'default_stages': [
            {
                'stage_key': 'stage_1', 'name': 'HR Head Review', 'base_role': 'hr_head',
                'pending_status': 'pending_hr_head',
                'resulting_status_on_approve': 'approved',
                'resulting_status_on_reject': 'rejected',
                'allow_self_approval': True,
            },
        ],
    },
    'exit_resignation': {
        'override_permission': 'exit.approve_resignation',
        'default_stages': [
            {
                'stage_key': 'stage_1', 'name': 'Manager Approval', 'base_role': 'manager',
                'pending_status': 'resignation_pending',
                'resulting_status_on_approve': 'notice_period',
                'resulting_status_on_reject': 'active',
                'allow_self_approval': False,
            },
        ],
    },
}


def _now_iso():
    return datetime.utcnow().isoformat()


def seed_default_definition(db, tenant_id, process_type):
    """Create the tenant's default workflow_definitions doc for a process
    type, resolving each stage's base_role to that tenant's system role id.
    Idempotent — no-ops if an active definition already exists."""
    existing = db.workflow_definitions.find_one({'tenant_id': tenant_id, 'process_type': process_type, 'is_active': True})
    if existing:
        return existing

    roles = seed_system_roles(db, tenant_id)
    now = datetime.utcnow()
    stages = []
    for tmpl in PROCESS_TYPES[process_type]['default_stages']:
        role = roles[tmpl['base_role']]
        stage = {k: v for k, v in tmpl.items() if k != 'base_role'}
        stage['approver_role_id'] = str(role['_id'])
        stages.append(stage)

    doc = {
        'tenant_id': tenant_id, 'process_type': process_type,
        'stages': stages, 'is_active': True,
        'created_at': now, 'updated_at': now,
    }
    result = db.workflow_definitions.insert_one(doc)
    doc['_id'] = result.inserted_id
    return doc


def get_active_definition(db, tenant_id, process_type):
    definition = db.workflow_definitions.find_one({'tenant_id': tenant_id, 'process_type': process_type, 'is_active': True})
    if not definition:
        definition = seed_default_definition(db, tenant_id, process_type)
    return definition


def start_workflow(db, tenant_id, process_type, entity_type, entity_id, actor, remarks=''):
    """Begins a workflow instance for an entity at stage 0. Returns
    (instance_doc, pending_status) — write pending_status onto the
    entity's own status field, same as the old hardcoded submit() did."""
    definition = get_active_definition(db, tenant_id, process_type)
    stage0 = definition['stages'][0]
    now = datetime.utcnow()
    instance = {
        'tenant_id': tenant_id, 'process_type': process_type,
        'definition_id': str(definition['_id']),
        'entity_type': entity_type, 'entity_id': str(entity_id),
        'current_stage_key': stage0['stage_key'], 'status': 'in_progress',
        'history': [{
            'stage_key': 'submit', 'user_id': str(actor['_id']), 'user_name': actor.get('name', ''),
            'action': 'submit', 'remarks': remarks, 'timestamp': _now_iso(),
        }],
        'created_at': now, 'updated_at': now,
    }
    result = db.workflow_instances.insert_one(instance)
    instance['_id'] = result.inserted_id
    return instance, stage0['pending_status']


def get_instance_for_entity(db, entity_type, entity_id, status='in_progress'):
    query = {'entity_type': entity_type, 'entity_id': str(entity_id)}
    if status:
        query['status'] = status
    return db.workflow_instances.find_one(query, sort=[('created_at', -1)])


def can_act_on_stage(caller_permissions, caller_role_id, stage, override_permission):
    if override_permission in (caller_permissions or set()):
        return True
    return caller_role_id and caller_role_id == stage.get('approver_role_id')


class WorkflowError(ValueError):
    """Raised for invalid transitions/permission failures — routes should
    catch this and return it as a 400/403 JSON error."""


def advance_workflow(db, tenant_id, instance, action, actor, caller_permissions,
                      caller_role_id, remarks='', subject_employee_ref=None):
    """Approves or rejects the instance's current stage. Returns the new
    status string to write onto the entity. Raises WorkflowError on an
    invalid action, a stage mismatch, or an authorization failure."""
    if instance['status'] != 'in_progress':
        raise WorkflowError(f"Workflow is already {instance['status']}")
    if action not in ('approve', 'reject'):
        raise WorkflowError("action must be 'approve' or 'reject'")

    definition = db.workflow_definitions.find_one({'_id': ObjectId(instance['definition_id'])})
    if not definition:
        raise WorkflowError('Workflow definition not found')

    stages = definition['stages']
    idx = next((i for i, s in enumerate(stages) if s['stage_key'] == instance['current_stage_key']), None)
    if idx is None:
        raise WorkflowError('Workflow instance is at an unknown stage')
    stage = stages[idx]

    process_cfg = PROCESS_TYPES[instance['process_type']]
    if not can_act_on_stage(caller_permissions, caller_role_id, stage, process_cfg['override_permission']):
        raise WorkflowError('Not authorized at this stage')

    if action == 'approve' and not stage.get('allow_self_approval', True):
        if subject_employee_ref and str(actor.get('employee_ref', '')) == str(subject_employee_ref):
            raise WorkflowError('You cannot approve your own submission at this stage')

    if action == 'reject' and not remarks:
        raise WorkflowError('Rejection reason is required')

    now = datetime.utcnow()
    entry = {
        'stage_key': stage['stage_key'], 'user_id': str(actor['_id']), 'user_name': actor.get('name', ''),
        'action': action, 'remarks': remarks, 'timestamp': _now_iso(),
    }

    if action == 'reject':
        new_entity_status = stage['resulting_status_on_reject']
        db.workflow_instances.update_one({'_id': instance['_id']}, {
            '$set': {'status': 'rejected', 'current_stage_key': 'rejected', 'updated_at': now},
            '$push': {'history': entry},
        })
        return new_entity_status

    # approve
    is_last = idx == len(stages) - 1
    if is_last:
        new_entity_status = stage['resulting_status_on_approve']
        db.workflow_instances.update_one({'_id': instance['_id']}, {
            '$set': {'status': 'approved', 'current_stage_key': 'approved', 'updated_at': now},
            '$push': {'history': entry},
        })
    else:
        next_stage = stages[idx + 1]
        new_entity_status = next_stage['pending_status']
        db.workflow_instances.update_one({'_id': instance['_id']}, {
            '$set': {'current_stage_key': next_stage['stage_key'], 'updated_at': now},
            '$push': {'history': entry},
        })
    return new_entity_status
