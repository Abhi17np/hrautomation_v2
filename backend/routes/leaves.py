"""
leaves.py — Leave Tracker module (v2: monthly-cap model)
===========================================================
Design (per confirmed rules):

Leave types: CL, SL, LP, ML (ML is female-only).

Monthly free quota — checked PER MONTH, no annual running balance, no
carry-over (this is why there's no accrual job anymore — the cap simply
applies fresh each month):

    category        CL/SL pool (per month)   ML pool (per month)
    regular         2                        n/a
    probationary    1                        n/a
    female          2                        1

Day-level overflow: within a single request, each individual DAY is checked
against how many free days are left in *that day's* calendar month. Days
that fit the remaining free quota are recorded as the requested type
(CL/SL/ML); any day beyond the cap automatically becomes LP. A single
request can therefore be part-paid / part-LP (e.g. 2 days free left this
month + a 3-day request -> 2 days CL/SL + 1 day LP).

LP itself has no cap — it's just logged.

A live PREVIEW endpoint lets the frontend show the employee the paid/LP
split (and a warning) before they submit.

Approval routing is unchanged from v1:
  employee -> manager -> (HR notified)
  manager (own request) -> HR Head/Admin -> (HR notified)
  HR / HR Head: view everything + adjust balances, never approve.
  HR Head / Admin: additionally decide manager-routed requests.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from bson import ObjectId

from services.notify import notify, notify_employee

leaves_bp = Blueprint('leaves', __name__)

LEAVE_TYPES = {'CL', 'SL', 'LP', 'ML', 'MATERNITY', 'OD', 'CO', 'PERMISSION'}
POOLED_TYPES = {'CL', 'SL'}         # share the CL/SL monthly pool
ML_TYPE = 'ML'                      # its own monthly pool, female only
MATERNITY_TYPE = 'MATERNITY'        # female only, no cap, continuous block, no quota impact
OD_TYPE = 'OD'                      # not leave — marks attendance as Present, no balance impact
CO_TYPE = 'CO'                      # comp-off — standalone earned balance, not month-based
PERMISSION_TYPE = 'PERMISSION'      # half-day draws 0.5d from CL/SL pool; hourly tracked separately, no pool impact
FEMALE_ONLY_TYPES = {ML_TYPE, MATERNITY_TYPE}

CATEGORY_RULES = {
    'regular':      {'monthly_cap': 2, 'ml_monthly_cap': 0},
    'probationary': {'monthly_cap': 1, 'ml_monthly_cap': 0},
    'female':       {'monthly_cap': 2, 'ml_monthly_cap': 1},
}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _caller(db, uid):
    user = db.users.find_one({'_id': ObjectId(uid)})
    if not user:
        return None, (jsonify({'error': 'User not found'}), 404)
    return user, None


def _s(doc):
    doc['_id'] = str(doc['_id'])
    return doc


def _is_probationary(emp):
    joining = emp.get('joining_date')
    months = emp.get('probation_period', 6)
    if not joining:
        return False
    try:
        months = int(months)
    except (TypeError, ValueError):
        months = 6
    jd = None
    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y'):
        try:
            jd = datetime.strptime(str(joining).strip(), fmt)
            break
        except ValueError:
            continue
    if not jd:
        return False
    probation_end = jd + timedelta(days=30.44 * months)
    return datetime.now() < probation_end


def _suggest_category(db, emp, employee_id=None):
    if _is_probationary(emp):
        return 'probationary'
    gender = (emp.get('gender') or '').strip().lower()
    if not gender and employee_id:
        user = db.users.find_one({'employee_ref': employee_id})
        if user:
            gender = (user.get('gender') or '').strip().lower()
    if gender == 'female':
        return 'female'
    return 'regular'


def _get_or_create_category(db, employee_id, year=None):
    """One doc per employee per year holding the category + per-month usage
    counters. No accrual needed — the cap is checked live against actual
    usage recorded for that specific month."""
    year = year or datetime.now().year
    doc = db.leave_balances.find_one({'employee_id': employee_id, 'year': year})
    if doc:
        # Defensive migration: a doc created by an earlier schema version
        # (e.g. the old annual_quota/monthly_credit model) is missing the
        # v2 fields. Rather than crash, backfill them in place.
        required = ('monthly_cap', 'ml_monthly_cap', 'monthly_used', 'ml_monthly_used', 'lp_monthly', 'comp_off_balance')
        if not all(k in doc for k in required):
            category = doc.get('category') or _suggest_category(db, db.employees.find_one({'_id': ObjectId(employee_id)}) or {}, employee_id)
            rules = CATEGORY_RULES.get(category, CATEGORY_RULES['regular'])
            patch = {
                'category':        category,
                'monthly_cap':     doc.get('monthly_cap', rules['monthly_cap']),
                'ml_monthly_cap':  doc.get('ml_monthly_cap', rules['ml_monthly_cap']),
                'monthly_used':    doc.get('monthly_used') or {str(m): 0 for m in range(1, 13)},
                'ml_monthly_used': doc.get('ml_monthly_used') or {str(m): 0 for m in range(1, 13)},
                'lp_monthly':      doc.get('lp_monthly') or {str(m): 0 for m in range(1, 13)},
                'comp_off_balance': doc.get('comp_off_balance', 0),
                'comp_off_earned_dates': doc.get('comp_off_earned_dates') or [],
                'updated_at':      datetime.utcnow(),
            }
            db.leave_balances.update_one({'_id': doc['_id']}, {'$set': patch})
            doc.update(patch)
        return doc

    emp = db.employees.find_one({'_id': ObjectId(employee_id)})
    if not emp:
        return None

    category = _suggest_category(db, emp, employee_id)
    rules = CATEGORY_RULES[category]

    doc = {
        'employee_id':     employee_id,
        'year':            year,
        'category':        category,
        'monthly_cap':     rules['monthly_cap'],
        'ml_monthly_cap':  rules['ml_monthly_cap'],
        'monthly_used':    {str(m): 0 for m in range(1, 13)},   # CL/SL pool, per month
        'ml_monthly_used': {str(m): 0 for m in range(1, 13)},   # ML pool, per month
        'lp_monthly':      {str(m): 0 for m in range(1, 13)},   # informational only
        'comp_off_balance': 0,                                  # earned comp-off, standalone
        'comp_off_earned_dates': [],                            # weekend/holiday dates already credited — prevents double-crediting
        'manually_set':    False,
        'created_at':      datetime.utcnow(),
        'updated_at':      datetime.utcnow(),
    }
    result = db.leave_balances.insert_one(doc)
    doc['_id'] = result.inserted_id
    return doc


def _date_range(from_date, to_date):
    f = datetime.strptime(from_date, '%Y-%m-%d')
    t = datetime.strptime(to_date, '%Y-%m-%d')
    days = []
    d = f
    while d <= t:
        days.append(d)
        d += timedelta(days=1)
    return days


def _load_holiday_dates(db, from_date, to_date):
    """Company holidays falling inside [from_date, to_date] — a day that
    lands on one of these shouldn't consume any leave quota (paid or LP)."""
    docs = db.holidays.find({'date': {'$gte': from_date, '$lte': to_date}}, {'date': 1})
    out = set()
    for d in docs:
        try:
            out.add(datetime.strptime(d['date'], '%Y-%m-%d').date())
        except (ValueError, KeyError):
            continue
    return out


def _compute_split(cat_doc, leave_type, from_date, to_date, holiday_dates=None):
    """Day-by-day: for each day, spend from that day's month's remaining free
    quota (CL/SL pool or ML pool); anything left over becomes LP for that day.
    A day that falls on a company holiday (holiday_dates) is skipped entirely —
    it charges neither the paid pool nor LP.
    Returns (paid_days, lp_days, month_breakdown) where month_breakdown is a
    list of {year, month, paid, lp} so approval can credit the right buckets.
    Does NOT mutate cat_doc — this is also used for the pre-submit preview."""
    holiday_dates = holiday_dates or set()

    if leave_type == 'LP':
        days = [d for d in _date_range(from_date, to_date) if d.date() not in holiday_dates]
        return 0, len(days), []

    if leave_type in (MATERNITY_TYPE, OD_TYPE):
        # No monthly-quota impact whatsoever — Maternity is a paid continuous
        # block outside the CL/SL/ML pools; On Duty isn't leave at all (it's
        # handled as a Present marker over in attendance.py).
        days = [d for d in _date_range(from_date, to_date) if d.date() not in holiday_dates]
        return len(days), 0, []

    if leave_type == CO_TYPE:
        # Comp-off draws from its own standalone earned balance, not a
        # per-month pool — the balance check/deduction happens in apply_leave
        # and the approval handler, not here.
        days = [d for d in _date_range(from_date, to_date) if d.date() not in holiday_dates]
        return len(days), 0, []

    is_ml = (leave_type == ML_TYPE)
    cap = cat_doc['ml_monthly_cap'] if is_ml else cat_doc['monthly_cap']
    used_map = cat_doc['ml_monthly_used'] if is_ml else cat_doc['monthly_used']

    running_used = dict(used_map)

    days = _date_range(from_date, to_date)
    by_month = {}
    for d in days:
        if d.date() in holiday_dates:
            continue
        key = (d.year, d.month)
        month_str = str(d.month)
        remaining = cap - running_used.get(month_str, 0)
        by_month.setdefault(key, {'paid': 0, 'lp': 0})
        if remaining > 0:
            running_used[month_str] = running_used.get(month_str, 0) + 1
            by_month[key]['paid'] += 1
        else:
            by_month[key]['lp'] += 1

    month_breakdown = [
        {'year': y, 'month': m, 'paid': v['paid'], 'lp': v['lp']}
        for (y, m), v in sorted(by_month.items())
    ]
    total_paid = sum(v['paid'] for v in by_month.values())
    total_lp = sum(v['lp'] for v in by_month.values())
    return total_paid, total_lp, month_breakdown


def _compute_permission(cat_doc, permission_mode, the_date, from_time=None, to_time=None, holiday_dates=None):
    """Half-day permission draws 0.5 day from the CL/SL pool for that day's
    month (falls to LP if the pool is already exhausted), unless the_date is
    a company holiday, in which case nothing is charged at all. Hourly
    permission is tracked in hours only and never touches the CL/SL pool.
    Returns (paid_days, lp_days, month_breakdown, permission_hours)."""
    holiday_dates = holiday_dates or set()
    if permission_mode == 'hourly':
        try:
            t1 = datetime.strptime(from_time, '%H:%M')
            t2 = datetime.strptime(to_time, '%H:%M')
        except (TypeError, ValueError):
            return None
        hours = round((t2 - t1).total_seconds() / 3600, 2)
        if hours <= 0:
            return None
        return 0, 0, [], hours

    # half_day
    d = datetime.strptime(the_date, '%Y-%m-%d')
    if d.date() in holiday_dates:
        return 0, 0, [], None
    month_str = str(d.month)
    remaining = cat_doc['monthly_cap'] - cat_doc['monthly_used'].get(month_str, 0)
    if remaining >= 0.5:
        paid, lp = 0.5, 0
    else:
        paid, lp = 0, 0.5
    breakdown = [{'year': d.year, 'month': d.month, 'paid': paid, 'lp': lp}]
    return paid, lp, breakdown, None


def _apply_month_breakdown(db, cat_doc_id, is_ml, month_breakdown):
    field = 'ml_monthly_used' if is_ml else 'monthly_used'
    lp_field = 'lp_monthly'
    inc = {}
    for entry in month_breakdown:
        m = str(entry['month'])
        if entry['paid']:
            inc[f'{field}.{m}'] = inc.get(f'{field}.{m}', 0) + entry['paid']
        if entry['lp']:
            inc[f'{lp_field}.{m}'] = inc.get(f'{lp_field}.{m}', 0) + entry['lp']
    if inc:
        db.leave_balances.update_one({'_id': cat_doc_id}, {'$inc': inc, '$set': {'updated_at': datetime.utcnow()}})


def _apply_approval_effects(db, cat_doc, r):
    """Called once a request is approved — applies the correct balance
    mutation for whichever leave_type this request actually is."""
    leave_type = r.get('leave_type')
    if leave_type in ('LP', MATERNITY_TYPE, OD_TYPE):
        return  # no balance impact
    if leave_type == CO_TYPE:
        db.leave_balances.update_one(
            {'_id': cat_doc['_id']},
            {'$inc': {'comp_off_balance': -r.get('days', 0)},
             '$set': {'updated_at': datetime.utcnow()}},
        )
        return
    if leave_type == PERMISSION_TYPE:
        if r.get('permission_mode') == 'hourly':
            return  # hourly never touches CL/SL — nothing to apply
        _apply_month_breakdown(db, cat_doc['_id'], False, r.get('month_breakdown', []))
        return
    # CL, SL, ML
    _apply_month_breakdown(db, cat_doc['_id'], leave_type == ML_TYPE, r.get('month_breakdown', []))


def _notify_hr(db, message, link='', related_id=None):
    notify(db, type='leave', title='Leave request', message=message,
           roles=['hr', 'hr_head', 'admin'], link=link or '/leave-management',
           related_id=related_id)


def _notify_employee_of_decision(db, employee_id, message, related_id=None):
    notify_employee(db, employee_id, type='leave', title='Leave request update',
                     message=message, link='/leave-tracker', related_id=related_id)


def _enrich_request(r, db):
    r['_id'] = str(r['_id'])
    try:
        emp = db.employees.find_one({'_id': ObjectId(r.get('employee_id', ''))})
        r['employee_name'] = emp.get('name', 'Unknown') if emp else 'Unknown'
        r['employee_code'] = emp.get('employee_id', '') if emp else ''
        r['department']    = emp.get('department', '') if emp else ''
    except Exception:
        r['employee_name'], r['employee_code'], r['department'] = 'Unknown', '', ''
    return r


def _this_year_summary(cat_doc, lp_used_this_year):
    monthly_cap = cat_doc['monthly_cap']
    ml_cap = cat_doc['ml_monthly_cap']
    used = sum(cat_doc['monthly_used'].values())
    ml_used = sum(cat_doc['ml_monthly_used'].values())
    now = datetime.now()
    this_month = str(now.month)
    return {
        'category':          cat_doc['category'],
        'monthly_cap':        monthly_cap,
        'used_this_year':     used,
        'annual_quota':       monthly_cap * 12,
        'available_this_year': monthly_cap * 12 - used,
        'used_this_month':    cat_doc['monthly_used'].get(this_month, 0),
        'available_this_month': max(0, monthly_cap - cat_doc['monthly_used'].get(this_month, 0)),
        'ml_monthly_cap':     ml_cap,
        'ml_used_this_year':  ml_used,
        'ml_available_this_year': (ml_cap * 12 - ml_used) if ml_cap else None,
        'ml_used_this_month': cat_doc['ml_monthly_used'].get(this_month, 0),
        'ml_available_this_month': (max(0, ml_cap - cat_doc['ml_monthly_used'].get(this_month, 0)) if ml_cap else None),
        'lp_days_taken':      lp_used_this_year,
        'comp_off_available': cat_doc.get('comp_off_balance', 0),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Employee / Manager — own leave
# ─────────────────────────────────────────────────────────────────────────────

@leaves_bp.route('/my-summary', methods=['GET'])
@jwt_required()
def my_summary():
    db, uid = current_app.db, get_jwt_identity()
    u, err = _caller(db, uid)
    if err: return err
    emp_ref = u.get('employee_ref')
    if not emp_ref:
        return jsonify({'error': 'No employee record linked to this account'}), 400

    year = int(request.args.get('year', datetime.now().year))
    cat_doc = _get_or_create_category(db, emp_ref, year)
    if not cat_doc:
        return jsonify({'error': 'Employee record not found'}), 404

    lp_used = db.leave_requests.count_documents({
        'employee_id': emp_ref, 'leave_type': 'LP', 'status': 'approved',
        'from_date': {'$regex': f'^{year}'},
    }) + db.leave_requests.count_documents({
        'employee_id': emp_ref, 'lp_days': {'$gt': 0}, 'status': 'approved',
        'from_date': {'$regex': f'^{year}'},
    })

    return jsonify({'year': year, **_this_year_summary(cat_doc, lp_used), 'is_female': cat_doc['category'] == 'female'})


@leaves_bp.route('/my-requests', methods=['GET'])
@jwt_required()
def my_requests():
    db, uid = current_app.db, get_jwt_identity()
    u, err = _caller(db, uid)
    if err: return err
    emp_ref = u.get('employee_ref', '__none__')
    reqs = list(db.leave_requests.find({'employee_id': emp_ref}).sort('created_at', -1))
    return jsonify([_enrich_request(r, db) for r in reqs])


@leaves_bp.route('/preview', methods=['POST'])
@jwt_required()
def preview_leave():
    """Live paid/LP split preview, called by the Apply form before submit."""
    db, uid = current_app.db, get_jwt_identity()
    u, err = _caller(db, uid)
    if err: return err
    emp_ref = u.get('employee_ref')
    if not emp_ref:
        return jsonify({'error': 'No employee record linked to this account'}), 400

    data = request.json or {}
    leave_type = (data.get('leave_type') or '').upper().strip()
    from_date, to_date = data.get('from_date'), data.get('to_date')
    if leave_type not in LEAVE_TYPES:
        return jsonify({'error': f'leave_type must be one of {", ".join(sorted(LEAVE_TYPES))}'}), 400
    if not from_date or not to_date:
        return jsonify({'error': 'from_date and to_date are required'}), 400

    cat_doc = _get_or_create_category(db, emp_ref, datetime.strptime(from_date, '%Y-%m-%d').year)
    if leave_type in FEMALE_ONLY_TYPES and cat_doc['category'] != 'female':
        return jsonify({'error': f'{leave_type.title()} is only available to female employees'}), 400

    holiday_dates = _load_holiday_dates(db, from_date, to_date)

    if leave_type == PERMISSION_TYPE:
        permission_mode = (data.get('permission_mode') or 'half_day').strip()
        result = _compute_permission(cat_doc, permission_mode, from_date,
                                      data.get('from_time'), data.get('to_time'), holiday_dates)
        if result is None:
            return jsonify({'error': 'Invalid permission time range'}), 400
        paid, lp, breakdown, hours = result
        if permission_mode == 'hourly':
            return jsonify({'days': 0, 'paid_days': 0, 'lp_days': 0, 'permission_hours': hours,
                             'breakdown': [], 'warning': None})
    else:
        paid, lp, breakdown = _compute_split(cat_doc, leave_type, from_date, to_date, holiday_dates)

    message = None
    if leave_type != 'LP' and lp > 0:
        if paid == 0:
            message = (f"Your free {leave_type} day(s) for this month are already used. "
                       f"All {lp} day(s) of this request will be recorded as Leave Without Pay.")
        else:
            message = (f"Only {paid} day(s) of this request fall within your free monthly quota. "
                       f"The remaining {lp} day(s) will be recorded as Leave Without Pay.")

    return jsonify({'days': paid + lp, 'paid_days': paid, 'lp_days': lp, 'breakdown': breakdown, 'warning': message})


@leaves_bp.route('/apply', methods=['POST'])
@jwt_required()
def apply_leave():
    db, uid = current_app.db, get_jwt_identity()
    u, err = _caller(db, uid)
    if err: return err
    emp_ref = u.get('employee_ref')
    if not emp_ref:
        return jsonify({'error': 'No employee record linked to this account'}), 400

    data = request.json or {}
    leave_type = (data.get('leave_type') or '').upper().strip()
    from_date, to_date = data.get('from_date'), data.get('to_date')
    reason = (data.get('reason') or '').strip()
    team_email = (data.get('team_email') or '').strip()
    acknowledge_lp = bool(data.get('acknowledge_lp_split'))
    permission_mode = (data.get('permission_mode') or '').strip() or None
    from_time = data.get('from_time')
    to_time = data.get('to_time')

    if leave_type not in LEAVE_TYPES:
        return jsonify({'error': f'leave_type must be one of {", ".join(sorted(LEAVE_TYPES))}'}), 400
    if leave_type == PERMISSION_TYPE:
        if not from_date:
            return jsonify({'error': 'from_date is required'}), 400
        to_date = to_date or from_date
        if permission_mode not in ('half_day', 'hourly'):
            return jsonify({'error': "permission_mode must be 'half_day' or 'hourly'"}), 400
        if permission_mode == 'hourly' and (not from_time or not to_time):
            return jsonify({'error': 'from_time and to_time are required for hourly permission'}), 400
    else:
        if not from_date or not to_date:
            return jsonify({'error': 'from_date and to_date are required'}), 400
    if not reason:
        return jsonify({'error': 'Reason for leave is required'}), 400

    year = datetime.strptime(from_date, '%Y-%m-%d').year
    cat_doc = _get_or_create_category(db, emp_ref, year)
    if not cat_doc:
        return jsonify({'error': 'Employee record not found'}), 404

    if leave_type in FEMALE_ONLY_TYPES and cat_doc['category'] != 'female':
        return jsonify({'error': f'{leave_type.title()} is only available to female employees'}), 400

    holiday_dates = _load_holiday_dates(db, from_date, to_date)

    permission_hours = None
    if leave_type == PERMISSION_TYPE:
        result = _compute_permission(cat_doc, permission_mode, from_date, from_time, to_time, holiday_dates)
        if result is None:
            return jsonify({'error': 'Invalid permission time range'}), 400
        paid, lp, breakdown, permission_hours = result
    elif leave_type == CO_TYPE:
        paid, lp, breakdown = _compute_split(cat_doc, leave_type, from_date, to_date, holiday_dates)
        if cat_doc.get('comp_off_balance', 0) < paid:
            return jsonify({'error': f"Insufficient comp-off balance. You have {cat_doc.get('comp_off_balance', 0)} day(s) available."}), 400
    else:
        paid, lp, breakdown = _compute_split(cat_doc, leave_type, from_date, to_date, holiday_dates)

    lp_prone_types = {'CL', 'SL', 'ML', PERMISSION_TYPE}
    if leave_type in lp_prone_types and lp > 0 and not acknowledge_lp:
        return jsonify({
            'error': 'lp_confirmation_required',
            'paid_days': paid, 'lp_days': lp,
            'message': 'Part of this request exceeds your free monthly quota and will become Leave Without Pay. '
                       'Resubmit with acknowledge_lp_split=true to confirm.',
        }), 409

    emp = db.employees.find_one({'_id': ObjectId(emp_ref)})
    days_total = 0 if (leave_type == PERMISSION_TYPE and permission_mode == 'hourly') else (paid + lp)

    if u.get('role') == 'manager':
        status, approver_note = 'pending_hr_head', 'Routed to HR Head/Admin (manager has no reporting manager)'
    else:
        manager_id = emp.get('manager_id') if emp else None
        if not manager_id:
            status, approver_note = 'pending_hr_head', 'Routed to HR Head/Admin (no manager assigned)'
        else:
            status, approver_note = 'pending_manager', ''

    doc = {
        'employee_id': emp_ref, 'leave_type': leave_type,
        'from_date': from_date, 'to_date': to_date, 'days': days_total,
        'paid_days': paid, 'lp_days': lp, 'month_breakdown': breakdown,
        'reason': reason, 'team_email': team_email,
        'status': status, 'routing_note': approver_note,
        'created_by': uid, 'created_at': datetime.utcnow(),
        'history': [{'action': 'submitted', 'by': uid, 'timestamp': datetime.utcnow().isoformat()}],
    }
    if leave_type == PERMISSION_TYPE:
        doc['permission_mode'] = permission_mode
        if permission_mode == 'hourly':
            doc['from_time'] = from_time
            doc['to_time'] = to_time
            doc['permission_hours'] = permission_hours
    result = db.leave_requests.insert_one(doc)

    split_note = f" ({paid}d {leave_type} + {lp}d LP)" if (leave_type != 'LP' and lp > 0) else ''
    emp_name = emp.get('name', 'An employee') if emp else 'An employee'

    if status == 'pending_manager':
        mgr_user = db.users.find_one({'employee_ref': manager_id})
        if mgr_user:
            notify(db, type='leave', title='Leave approval needed',
                   message=f"{emp_name} requested {leave_type} leave "
                           f"({from_date} to {to_date}, {days_total} day(s)){split_note} — awaiting your approval.",
                   user_ids=[str(mgr_user['_id'])], link='/leave-tracker',
                   related_id=str(result.inserted_id))

    _notify_hr(
        db,
        f"{emp_name} applied for {leave_type} leave "
        f"({from_date} to {to_date}, {days_total} day(s)){split_note}",
        link='/leave-management', related_id=str(result.inserted_id),
    )

    return jsonify({'id': str(result.inserted_id), 'status': status, 'days': days_total,
                    'paid_days': paid, 'lp_days': lp}), 201


@leaves_bp.route('/<rid>/cancel', methods=['POST'])
@jwt_required()
def cancel_request(rid):
    db, uid = current_app.db, get_jwt_identity()
    u, err = _caller(db, uid)
    if err: return err
    r = db.leave_requests.find_one({'_id': ObjectId(rid)})
    if not r: return jsonify({'error': 'Not found'}), 404
    if r.get('employee_id') != u.get('employee_ref'):
        return jsonify({'error': 'Access denied'}), 403
    if r.get('status') not in ('pending_manager', 'pending_hr_head'):
        return jsonify({'error': 'Only pending requests can be cancelled'}), 400
    db.leave_requests.update_one({'_id': ObjectId(rid)}, {
        '$set': {'status': 'cancelled', 'updated_at': datetime.utcnow()},
        '$push': {'history': {'action': 'cancelled', 'by': uid, 'timestamp': datetime.utcnow().isoformat()}},
    })
    return jsonify({'message': 'Request cancelled'})


# ─────────────────────────────────────────────────────────────────────────────
# Manager — team approvals
# ─────────────────────────────────────────────────────────────────────────────

@leaves_bp.route('/team-pending', methods=['GET'])
@jwt_required()
def team_pending():
    db, uid = current_app.db, get_jwt_identity()
    u, err = _caller(db, uid)
    if err: return err
    if u.get('role') not in ('manager', 'hr_head', 'admin'):
        return jsonify({'error': 'Access denied'}), 403
    mgr_emp_ref = u.get('employee_ref', '')
    team_ids = [str(e['_id']) for e in db.employees.find({'manager_id': mgr_emp_ref})]
    reqs = list(db.leave_requests.find({'employee_id': {'$in': team_ids}, 'status': 'pending_manager'}).sort('created_at', -1))
    return jsonify([_enrich_request(r, db) for r in reqs])


def _decide_request(db, u, rid, expected_status, allow_roles):
    if u.get('role') not in allow_roles:
        return None, (jsonify({'error': 'Access denied'}), 403)
    r = db.leave_requests.find_one({'_id': ObjectId(rid)})
    if not r:
        return None, (jsonify({'error': 'Not found'}), 404)
    if r.get('status') != expected_status:
        return None, (jsonify({'error': f"Status is '{r.get('status')}', expected {expected_status}"}), 400)
    return r, None


@leaves_bp.route('/<rid>/manager-action', methods=['POST'])
@jwt_required()
def manager_action(rid):
    db, uid = current_app.db, get_jwt_identity()
    u, err = _caller(db, uid)
    if err: return err

    r, derr = _decide_request(db, u, rid, 'pending_manager', ('manager', 'hr_head', 'admin'))
    if derr: return derr

    if u.get('role') == 'manager':
        mgr_emp_ref = u.get('employee_ref', '')
        emp = db.employees.find_one({'_id': ObjectId(r['employee_id'])})
        if not emp or emp.get('manager_id') != mgr_emp_ref:
            return jsonify({'error': "You can only act on your own team's requests"}), 403
        if r['employee_id'] == mgr_emp_ref:
            return jsonify({'error': 'You cannot act on your own request'}), 403

    data = request.json or {}
    act, remarks = data.get('action'), (data.get('remarks') or '').strip()
    if act not in ('approve', 'reject'):
        return jsonify({'error': "action must be 'approve' or 'reject'"}), 400
    if act == 'reject' and not remarks:
        return jsonify({'error': 'Rejection reason is required'}), 400

    new_status = 'approved' if act == 'approve' else 'rejected'
    if act == 'approve':
        year = datetime.strptime(r['from_date'], '%Y-%m-%d').year
        cat_doc = _get_or_create_category(db, r['employee_id'], year)
        _apply_approval_effects(db, cat_doc, r)

    db.leave_requests.update_one({'_id': ObjectId(rid)}, {
        '$set': {'status': new_status, 'updated_at': datetime.utcnow(),
                 'decided_by': uid, 'decided_at': datetime.utcnow().isoformat(), 'decision_remarks': remarks},
        '$push': {'history': {'action': act, 'by': uid, 'remarks': remarks, 'timestamp': datetime.utcnow().isoformat()}},
    })

    emp = db.employees.find_one({'_id': ObjectId(r['employee_id'])})
    _notify_hr(db, f"{emp.get('name', 'An employee') if emp else 'An employee'}'s "
                   f"{r.get('leave_type')} leave request was {new_status} by {u.get('name', 'a manager')}",
               link='/leave-management', related_id=rid)
    _notify_employee_of_decision(
        db, r['employee_id'],
        f"Your {r.get('leave_type')} leave request ({r.get('from_date')} to {r.get('to_date')}) was {new_status}"
        + (f" — {remarks}" if new_status == 'rejected' and remarks else ''),
        related_id=rid,
    )
    return jsonify({'message': f'Request {act}d', 'new_status': new_status})


# ─────────────────────────────────────────────────────────────────────────────
# HR / HR Head / Admin — oversight
# ─────────────────────────────────────────────────────────────────────────────

@leaves_bp.route('/all', methods=['GET'])
@jwt_required()
def all_requests():
    db, uid = current_app.db, get_jwt_identity()
    u, err = _caller(db, uid)
    if err: return err
    if u.get('role') not in ('hr', 'hr_head', 'admin'):
        return jsonify({'error': 'Access denied'}), 403
    query = {}
    if request.args.get('status'):
        query['status'] = request.args.get('status')
    if request.args.get('employee_id'):
        query['employee_id'] = request.args.get('employee_id')
    reqs = list(db.leave_requests.find(query).sort('created_at', -1))
    return jsonify([_enrich_request(r, db) for r in reqs])


@leaves_bp.route('/<rid>/hr-head-action', methods=['POST'])
@jwt_required()
def hr_head_action(rid):
    """HR Head/Admin decide requests routed to them. Plain 'hr' never approves."""
    db, uid = current_app.db, get_jwt_identity()
    u, err = _caller(db, uid)
    if err: return err

    r, derr = _decide_request(db, u, rid, 'pending_hr_head', ('hr_head', 'admin'))
    if derr: return derr

    data = request.json or {}
    act, remarks = data.get('action'), (data.get('remarks') or '').strip()
    if act not in ('approve', 'reject'):
        return jsonify({'error': "action must be 'approve' or 'reject'"}), 400
    if act == 'reject' and not remarks:
        return jsonify({'error': 'Rejection reason is required'}), 400

    new_status = 'approved' if act == 'approve' else 'rejected'
    if act == 'approve':
        year = datetime.strptime(r['from_date'], '%Y-%m-%d').year
        cat_doc = _get_or_create_category(db, r['employee_id'], year)
        _apply_approval_effects(db, cat_doc, r)

    db.leave_requests.update_one({'_id': ObjectId(rid)}, {
        '$set': {'status': new_status, 'updated_at': datetime.utcnow(),
                 'decided_by': uid, 'decided_at': datetime.utcnow().isoformat(), 'decision_remarks': remarks},
        '$push': {'history': {'action': act, 'by': uid, 'remarks': remarks, 'timestamp': datetime.utcnow().isoformat()}},
    })
    _notify_employee_of_decision(
        db, r['employee_id'],
        f"Your {r.get('leave_type')} leave request ({r.get('from_date')} to {r.get('to_date')}) was {new_status}"
        + (f" — {remarks}" if new_status == 'rejected' and remarks else ''),
        related_id=rid,
    )
    return jsonify({'message': f'Request {act}d', 'new_status': new_status})


@leaves_bp.route('/balances', methods=['GET'])
@jwt_required()
def all_balances():
    db, uid = current_app.db, get_jwt_identity()
    u, err = _caller(db, uid)
    if err: return err
    if u.get('role') not in ('hr', 'hr_head', 'admin'):
        return jsonify({'error': 'Access denied'}), 403

    year = int(request.args.get('year', datetime.now().year))
    out = []
    for emp in db.employees.find({'status': {'$ne': 'exited'}}):
        emp_id = str(emp['_id'])
        cat_doc = _get_or_create_category(db, emp_id, year)
        if not cat_doc:
            continue
        s = _this_year_summary(cat_doc, 0)
        out.append({
            'employee_id': emp_id, 'employee_name': emp.get('name', ''),
            'employee_code': emp.get('employee_id', ''), 'department': emp.get('department', ''),
            **s,
        })
    return jsonify(out)


@leaves_bp.route('/balances/<emp_id>/adjust', methods=['POST'])
@jwt_required()
def adjust_balance(emp_id):
    db, uid = current_app.db, get_jwt_identity()
    u, err = _caller(db, uid)
    if err: return err
    if u.get('role') not in ('hr', 'hr_head', 'admin'):
        return jsonify({'error': 'Access denied'}), 403

    data = request.json or {}
    year = int(data.get('year', datetime.now().year))
    cat_doc = _get_or_create_category(db, emp_id, year)
    if not cat_doc:
        return jsonify({'error': 'Employee not found'}), 404

    update = {'updated_at': datetime.utcnow(), 'manually_set': True}
    if 'category' in data:
        cat = data['category']
        if cat not in CATEGORY_RULES:
            return jsonify({'error': f'category must be one of {list(CATEGORY_RULES)}'}), 400
        update['category'] = cat
        update['monthly_cap'] = CATEGORY_RULES[cat]['monthly_cap']
        update['ml_monthly_cap'] = CATEGORY_RULES[cat]['ml_monthly_cap']
    if 'monthly_cap' in data:
        update['monthly_cap'] = float(data['monthly_cap'])
    if 'ml_monthly_cap' in data:
        update['ml_monthly_cap'] = float(data['ml_monthly_cap'])
    if 'comp_off_balance' in data:
        update['comp_off_balance'] = float(data['comp_off_balance'])

    db.leave_balances.update_one({'_id': cat_doc['_id']}, {'$set': update})

    if 'comp_off_credit' in data:
        # Additive credit (e.g. "add 1 day earned this week") instead of a hard overwrite
        db.leave_balances.update_one({'_id': cat_doc['_id']}, {'$inc': {'comp_off_balance': float(data['comp_off_credit'])}})

    if 'correct_month' in data and 'correct_used' in data:
        month = str(int(data['correct_month']))
        field = 'ml_monthly_used' if data.get('correct_pool') == 'ml' else 'monthly_used'
        db.leave_balances.update_one({'_id': cat_doc['_id']}, {'$set': {f'{field}.{month}': float(data['correct_used'])}})

    updated = db.leave_balances.find_one({'_id': cat_doc['_id']})
    return jsonify(_s(updated))