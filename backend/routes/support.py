"""
support.py — HRM Support: an in-app helpdesk employees use to raise queries
to HR (payroll, IT, policy, leave/attendance, general) and HR tracks through
to resolution, instead of ad-hoc email/chat with no record.
"""
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request

from auth_utils import require_role, tenant_scoped
from tenant_scope import get_db

support_bp = Blueprint('support', __name__)

CATEGORIES = {'payroll', 'it', 'hr_policy', 'leave_attendance', 'general'}
STATUSES = {'open', 'in_progress', 'resolved', 'closed'}
PRIORITIES = {'low', 'medium', 'high'}
HR_ROLES = ('admin', 'hr', 'hr_head')


def _next_ticket_no(db):
    counter = db.counters.find_one_and_update(
        {'name': 'support_ticket'},
        {'$inc': {'seq': 1}},
        upsert=True,
        return_document=True,
    )
    return f"TCK-{str(counter['seq']).zfill(4)}"


def _serialize(t):
    t['_id'] = str(t['_id'])
    for k in ('created_at', 'updated_at', 'resolved_at'):
        if t.get(k) and isinstance(t[k], datetime):
            t[k] = t[k].isoformat()
    for c in t.get('comments', []):
        if c.get('created_at') and isinstance(c['created_at'], datetime):
            c['created_at'] = c['created_at'].isoformat()
    return t


def _oid(id_str):
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError):
        return None


def _is_owner_or_hr(db, ticket):
    caller = g.caller
    if caller.get('role') in HR_ROLES:
        return True
    return ticket.get('raised_by') == str(caller['_id'])


@support_bp.route('/tickets', methods=['GET'])
@tenant_scoped
def list_tickets():
    db = get_db()
    caller = g.caller
    query = {}

    if caller.get('role') in HR_ROLES:
        status = request.args.get('status')
        category = request.args.get('category')
        assigned_to = request.args.get('assigned_to')
        if status:
            query['status'] = status
        if category:
            query['category'] = category
        if assigned_to:
            query['assigned_to'] = assigned_to
    else:
        query['raised_by'] = str(caller['_id'])

    tickets = list(db.support_tickets.find(query).sort('created_at', -1))
    return jsonify([_serialize(t) for t in tickets])


@support_bp.route('/tickets/stats', methods=['GET'])
@require_role(*HR_ROLES)
def ticket_stats():
    db = get_db()
    counts = {s: db.support_tickets.count_documents({'status': s}) for s in STATUSES}
    counts['total'] = sum(counts.values())
    return jsonify(counts)


@support_bp.route('/tickets', methods=['POST'])
@tenant_scoped
def create_ticket():
    db = get_db()
    caller = g.caller
    data = request.json or {}

    subject = (data.get('subject') or '').strip()
    description = (data.get('description') or '').strip()
    if not subject or not description:
        return jsonify({'error': 'subject and description are required'}), 400

    category = data.get('category', 'general')
    if category not in CATEGORIES:
        return jsonify({'error': f'category must be one of {sorted(CATEGORIES)}'}), 400

    priority = data.get('priority', 'medium')
    if priority not in PRIORITIES:
        return jsonify({'error': f'priority must be one of {sorted(PRIORITIES)}'}), 400

    now = datetime.utcnow()
    doc = {
        'ticket_no': _next_ticket_no(db),
        'raised_by': str(caller['_id']),
        'raised_by_name': caller.get('name', ''),
        'employee_ref': caller.get('employee_ref'),
        'subject': subject,
        'description': description,
        'category': category,
        'priority': priority,
        'status': 'open',
        'assigned_to': None,
        'comments': [],
        'created_at': now,
        'updated_at': now,
        'resolved_at': None,
    }
    result = db.support_tickets.insert_one(doc)
    doc['_id'] = result.inserted_id
    return jsonify(_serialize(doc)), 201


@support_bp.route('/tickets/<ticket_id>', methods=['GET'])
@tenant_scoped
def get_ticket(ticket_id):
    db = get_db()
    oid = _oid(ticket_id)
    if not oid:
        return jsonify({'error': 'Invalid ticket id'}), 400
    ticket = db.support_tickets.find_one({'_id': oid})
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    if not _is_owner_or_hr(db, ticket):
        return jsonify({'error': 'Not authorized to view this ticket'}), 403
    return jsonify(_serialize(ticket))


@support_bp.route('/tickets/<ticket_id>', methods=['PUT'])
@require_role(*HR_ROLES)
def update_ticket(ticket_id):
    db = get_db()
    oid = _oid(ticket_id)
    if not oid:
        return jsonify({'error': 'Invalid ticket id'}), 400
    ticket = db.support_tickets.find_one({'_id': oid})
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404

    data = request.json or {}
    update = {}
    if 'status' in data:
        if data['status'] not in STATUSES:
            return jsonify({'error': f'status must be one of {sorted(STATUSES)}'}), 400
        update['status'] = data['status']
        if data['status'] in ('resolved', 'closed') and not ticket.get('resolved_at'):
            update['resolved_at'] = datetime.utcnow()
        elif data['status'] in ('open', 'in_progress'):
            update['resolved_at'] = None
    if 'priority' in data:
        if data['priority'] not in PRIORITIES:
            return jsonify({'error': f'priority must be one of {sorted(PRIORITIES)}'}), 400
        update['priority'] = data['priority']
    if 'category' in data:
        if data['category'] not in CATEGORIES:
            return jsonify({'error': f'category must be one of {sorted(CATEGORIES)}'}), 400
        update['category'] = data['category']
    if 'assigned_to' in data:
        assigned_to = data['assigned_to'] or None
        if assigned_to and not db.users.find_one({'_id': ObjectId(assigned_to), 'role': {'$in': list(HR_ROLES)}}):
            return jsonify({'error': 'assigned_to must be an existing HR/admin user'}), 400
        update['assigned_to'] = assigned_to

    if not update:
        return jsonify({'error': 'Nothing to update'}), 400
    update['updated_at'] = datetime.utcnow()

    db.support_tickets.update_one({'_id': oid}, {'$set': update})
    return jsonify(_serialize(db.support_tickets.find_one({'_id': oid})))


@support_bp.route('/tickets/<ticket_id>/comments', methods=['POST'])
@tenant_scoped
def add_comment(ticket_id):
    db = get_db()
    caller = g.caller
    oid = _oid(ticket_id)
    if not oid:
        return jsonify({'error': 'Invalid ticket id'}), 400
    ticket = db.support_tickets.find_one({'_id': oid})
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404
    if not _is_owner_or_hr(db, ticket):
        return jsonify({'error': 'Not authorized to comment on this ticket'}), 403

    message = ((request.json or {}).get('message') or '').strip()
    if not message:
        return jsonify({'error': 'message is required'}), 400

    comment = {
        'user_id': str(caller['_id']),
        'user_name': caller.get('name', ''),
        'role': caller.get('role', ''),
        'message': message,
        'created_at': datetime.utcnow(),
    }
    db.support_tickets.update_one(
        {'_id': oid},
        {'$push': {'comments': comment}, '$set': {'updated_at': datetime.utcnow()}},
    )
    return jsonify(_serialize(db.support_tickets.find_one({'_id': oid})))
