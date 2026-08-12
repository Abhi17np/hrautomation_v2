"""
attendance.py — Attendance module routes.
Place at: backend/routes/attendance.py
Register in app.py: app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import date, datetime, timedelta
import calendar

attendance_bp = Blueprint('attendance', __name__)

HR_ROLES = {'admin', 'hr', 'hr_head'}


def _serialize(doc):
    doc['_id'] = str(doc['_id'])
    for k in ('login_time', 'logout_time', 'timestamp'):
        if doc.get(k) and isinstance(doc[k], datetime):
            doc[k] = doc[k].isoformat()
    return doc


def _get_caller(db, uid):
    user = db.users.find_one({'_id': ObjectId(uid)})
    if not user:
        return None, (jsonify({'error': 'User not found'}), 404)
    return user, None


# ─── Today's attendance board (HR / Manager dashboard) ──────────────────────
@attendance_bp.route('/today', methods=['GET'])
@jwt_required()
def today_board():
    db = current_app.db
    today_str = request.args.get('date', date.today().isoformat())

    daily = list(db.attendance_daily.find({'date': today_str}))
    by_emp = {d['employee_id']: d for d in daily}

    employees = list(db.employees.find({'status': 'active'}))
    rows = []
    for emp in employees:
        emp_id = str(emp['_id'])
        rec = by_emp.get(emp_id)
        rows.append({
            'employee_id': emp_id,
            'employee_name': emp.get('name'),
            'employee_code': emp.get('employee_id'),
            'department': emp.get('department', ''),
            'login_time': rec['login_time'].isoformat() if rec and rec.get('login_time') else None,
            'logout_time': rec['logout_time'].isoformat() if rec and rec.get('logout_time') else None,
            'hours_worked': rec.get('hours_worked') if rec else None,
            'status': 'present' if rec else 'absent',
        })
    return jsonify(rows)


# ─── Employee's own attendance history ───────────────────────────────────────
@attendance_bp.route('/me', methods=['GET'])
@jwt_required()
def my_attendance():
    db = current_app.db
    uid = get_jwt_identity()
    user = db.users.find_one({'_id': ObjectId(uid)})
    if not user or not user.get('employee_ref'):
        return jsonify({'error': 'No employee record linked to this account'}), 400

    from_date = request.args.get('from')
    to_date = request.args.get('to')
    query = {'employee_id': user['employee_ref']}
    if from_date and to_date:
        query['date'] = {'$gte': from_date, '$lte': to_date}

    records = list(db.attendance_daily.find(query).sort('date', -1).limit(60))
    return jsonify([_serialize(r) for r in records])


# ─── HR: one employee's history ──────────────────────────────────────────────
@attendance_bp.route('/employee/<emp_id>', methods=['GET'])
@jwt_required()
def employee_attendance(emp_id):
    db = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES and caller.get('role') != 'manager':
        return jsonify({'error': 'Not authorized'}), 403

    from_date = request.args.get('from')
    to_date = request.args.get('to')
    query = {'employee_id': emp_id}
    if from_date and to_date:
        query['date'] = {'$gte': from_date, '$lte': to_date}

    records = list(db.attendance_daily.find(query).sort('date', -1).limit(90))
    return jsonify([_serialize(r) for r in records])


# ─── Map an employee to their device user id (do this once per employee) ────
@attendance_bp.route('/map/<emp_id>', methods=['POST'])
@jwt_required()
def map_employee(emp_id):
    db = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Only HR/Admin can map biometric device IDs'}), 403

    essl_uid = str((request.json or {}).get('essl_uid', '')).strip()
    if not essl_uid:
        return jsonify({'error': 'essl_uid is required'}), 400

    emp = db.employees.find_one({'_id': ObjectId(emp_id)})
    if not emp:
        return jsonify({'error': 'Employee not found'}), 404

    db.employees.update_one({'_id': ObjectId(emp_id)}, {'$set': {
        'essl_uid': essl_uid, 'updated_at': datetime.utcnow(),
    }})
    return jsonify({'message': f'Mapped {emp.get("name")} to device user id {essl_uid}'})


# ─── Bulk map (map many employees to device IDs in one call) ────────────────
@attendance_bp.route('/map-bulk', methods=['POST'])
@jwt_required()
def map_bulk():
    db = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Only HR/Admin can map biometric device IDs'}), 403

    pairs = (request.json or {}).get('mappings', [])
    if not pairs:
        return jsonify({'error': 'mappings array is required, e.g. [{"employee_id": "...", "essl_uid": "IM0049"}]'}), 400

    updated, not_found = [], []
    for pair in pairs:
        emp_id = pair.get('employee_id')
        essl_uid = str(pair.get('essl_uid', '')).strip()
        if not emp_id or not essl_uid:
            continue
        try:
            result = db.employees.update_one(
                {'_id': ObjectId(emp_id)},
                {'$set': {'essl_uid': essl_uid, 'updated_at': datetime.utcnow()}},
            )
            if result.matched_count:
                updated.append({'employee_id': emp_id, 'essl_uid': essl_uid})
            else:
                not_found.append(emp_id)
        except Exception:
            not_found.append(emp_id)

    return jsonify({'updated': len(updated), 'not_found': not_found})


# ─── Manual sync trigger (useful for testing / "sync now" button) ───────────
@attendance_bp.route('/sync', methods=['POST'])
@jwt_required()
def manual_sync():
    db = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Only HR/Admin can trigger a manual sync'}), 403

    from services.essl_sync import sync_now
    full_resync = request.args.get('full', '').lower() in ('1', 'true', 'yes')
    result = sync_now(current_app._get_current_object(), full_resync=full_resync)
    return jsonify(result)


# ─── Holiday management (dates excluded from working-day counts) ────────────
@attendance_bp.route('/holidays', methods=['GET'])
@jwt_required()
def list_holidays():
    db = current_app.db
    year = request.args.get('year')
    query = {}
    if year:
        query['date'] = {'$regex': f'^{year}-'}
    holidays = list(db.holidays.find(query).sort('date', 1))
    for h in holidays:
        h['_id'] = str(h['_id'])
    return jsonify(holidays)


@attendance_bp.route('/holidays', methods=['POST'])
@jwt_required()
def add_holiday():
    db = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Only HR/Admin can manage holidays'}), 403

    data = request.json or {}
    hdate = str(data.get('date', '')).strip()
    name = str(data.get('name', '')).strip()
    if not hdate or not name:
        return jsonify({'error': 'date (YYYY-MM-DD) and name are required'}), 400

    db.holidays.update_one(
        {'date': hdate},
        {'$set': {'date': hdate, 'name': name}},
        upsert=True,
    )
    return jsonify({'message': f'Holiday "{name}" added for {hdate}'})


@attendance_bp.route('/holidays/<holiday_id>', methods=['DELETE'])
@jwt_required()
def delete_holiday(holiday_id):
    db = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Only HR/Admin can manage holidays'}), 403

    db.holidays.delete_one({'_id': ObjectId(holiday_id)})
    return jsonify({'message': 'Holiday removed'})


# ─── Monthly attendance summary (Attendance Management report) ──────────────
@attendance_bp.route('/monthly-summary', methods=['GET'])
@jwt_required()
def monthly_summary():
    db = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Only HR/Admin can view attendance reports'}), 403

    try:
        year = int(request.args.get('year', date.today().year))
        month = int(request.args.get('month', date.today().month))
    except ValueError:
        return jsonify({'error': 'year and month must be integers'}), 400

    days_in_month = calendar.monthrange(year, month)[1]
    month_start = date(year, month, 1)
    month_end = date(year, month, days_in_month)
    today = date.today()

    # Past month -> full month counts. Current month -> only up to today.
    # Future month -> hasn't happened at all yet, so no working days to count.
    if (year, month) > (today.year, today.month):
        effective_end = month_start - timedelta(days=1)  # before the month even starts
    elif (year, month) == (today.year, today.month):
        effective_end = today
    else:
        effective_end = month_end

    holiday_dates = {
        h['date'] for h in db.holidays.find({
            'date': {'$gte': month_start.isoformat(), '$lte': month_end.isoformat()},
        })
    }

    # Build the list of actual working days: Mon-Fri, minus holidays, up to effective_end
    working_dates = []
    for d in range(1, days_in_month + 1):
        day = date(year, month, d)
        if day > effective_end:
            break
        if day.weekday() >= 5:  # 5=Saturday, 6=Sunday
            continue
        if day.isoformat() in holiday_dates:
            continue
        working_dates.append(day.isoformat())

    total_working_days = len(working_dates)

    employees = list(db.employees.find({'status': 'active'}))
    rows = []
    for emp in employees:
        emp_id = str(emp['_id'])

        present_dates = {
            r['date'] for r in db.attendance_daily.find({
                'employee_id': emp_id,
                'date': {'$in': working_dates},
                'login_time': {'$ne': None},
            })
        }

        # Approved leave overlapping this month
        leaves = list(db.leave_requests.find({
            'employee_id': emp_id,
            'status': 'approved',
            'from_date': {'$lte': month_end.isoformat()},
            'to_date': {'$gte': month_start.isoformat()},
        }))

        leave_dates, od_dates = set(), set()
        for lv in leaves:
            lf = max(date.fromisoformat(lv['from_date']), month_start)
            lt = min(date.fromisoformat(lv['to_date']), month_end)
            cur = lf
            while cur <= lt:
                iso = cur.isoformat()
                if iso in working_dates and iso not in present_dates:
                    if lv.get('leave_type') == 'OD':
                        od_dates.add(iso)   # On Duty counts as Present, not leave
                    else:
                        leave_dates.add(iso)
                cur += timedelta(days=1)

        present_count = len(present_dates) + len(od_dates - present_dates)
        leave_count = len(leave_dates)
        absent_count = max(total_working_days - present_count - leave_count, 0)

        rows.append({
            'employee_id': emp_id,
            'employee_name': emp.get('name'),
            'employee_code': emp.get('employee_id'),
            'working_days': total_working_days,
            'present': present_count,
            'on_leave': leave_count,
            'absent': absent_count,
        })

    return jsonify({
        'year': year,
        'month': month,
        'total_working_days': total_working_days,
        'holidays': sorted(holiday_dates),
        'employees': rows,
    })


# ─── Single employee's day-by-day calendar for a month ───────────────────────
@attendance_bp.route('/employee/<emp_id>/calendar', methods=['GET'])
@jwt_required()
def employee_calendar(emp_id):
    db = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES and caller.get('role') != 'manager':
        return jsonify({'error': 'Not authorized'}), 403

    try:
        year = int(request.args.get('year', date.today().year))
        month = int(request.args.get('month', date.today().month))
    except ValueError:
        return jsonify({'error': 'year and month must be integers'}), 400

    days_in_month = calendar.monthrange(year, month)[1]
    month_start = date(year, month, 1)
    month_end = date(year, month, days_in_month)
    today = date.today()

    holiday_map = {
        h['date']: h['name'] for h in db.holidays.find({
            'date': {'$gte': month_start.isoformat(), '$lte': month_end.isoformat()},
        })
    }

    daily_records = {
        r['date']: r for r in db.attendance_daily.find({
            'employee_id': emp_id,
            'date': {'$gte': month_start.isoformat(), '$lte': month_end.isoformat()},
        })
    }

    leaves = list(db.leave_requests.find({
        'employee_id': emp_id,
        'status': 'approved',
        'from_date': {'$lte': month_end.isoformat()},
        'to_date': {'$gte': month_start.isoformat()},
    }))
    leave_dates, od_dates = set(), set()
    for lv in leaves:
        lf = max(date.fromisoformat(lv['from_date']), month_start)
        lt = min(date.fromisoformat(lv['to_date']), month_end)
        cur = lf
        while cur <= lt:
            iso = cur.isoformat()
            if lv.get('leave_type') == 'OD':
                od_dates.add(iso)
            else:
                leave_dates.add(iso)
            cur += timedelta(days=1)

    days = []
    for d in range(1, days_in_month + 1):
        day = date(year, month, d)
        iso = day.isoformat()
        rec = daily_records.get(iso)

        if day.weekday() >= 5:
            status = 'weekend'
        elif iso in holiday_map:
            status = 'holiday'
        elif rec and rec.get('login_time'):
            status = 'present'
        elif iso in od_dates:
            status = 'present'   # On Duty — official work, counts as Present
        elif iso in leave_dates:
            status = 'on_leave'
        elif day > today:
            status = 'upcoming'
        else:
            status = 'absent'

        days.append({
            'date': iso,
            'day': d,
            'weekday': day.weekday(),
            'status': status,
            'holiday_name': holiday_map.get(iso),
            'login_time': rec['login_time'].isoformat() if rec and rec.get('login_time') else None,
            'logout_time': rec['logout_time'].isoformat() if rec and rec.get('logout_time') else None,
            'hours_worked': rec.get('hours_worked') if rec else None,
        })

    emp = db.employees.find_one({'_id': ObjectId(emp_id)})
    return jsonify({
        'employee_id': emp_id,
        'employee_name': emp.get('name') if emp else None,
        'employee_code': emp.get('employee_id') if emp else None,
        'year': year,
        'month': month,
        'days': days,
    })


# ─── HR: manually regularize one employee's attendance for a specific date ──
@attendance_bp.route('/regularize/<emp_id>', methods=['POST'])
@jwt_required()
def regularize_attendance(emp_id):
    db = current_app.db
    uid = get_jwt_identity()
    caller, err = _get_caller(db, uid)
    if err: return err
    if caller.get('role') not in HR_ROLES:
        return jsonify({'error': 'Only HR/Admin can regularize attendance'}), 403

    data = request.json or {}
    date_str = str(data.get('date', '')).strip()
    if not date_str:
        return jsonify({'error': 'date (YYYY-MM-DD) is required'}), 400
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'date must be in YYYY-MM-DD format'}), 400

    remarks = str(data.get('remarks', '')).strip()
    if not remarks:
        return jsonify({'error': 'A reason is required to regularize attendance'}), 400

    login_time_str = (data.get('login_time') or '').strip()   # 'HH:MM'
    logout_time_str = (data.get('logout_time') or '').strip()  # 'HH:MM', optional

    emp = db.employees.find_one({'_id': ObjectId(emp_id)})
    if not emp:
        return jsonify({'error': 'Employee not found'}), 404

    def _parse_time(t_str, label):
        if not t_str:
            return None, None
        try:
            h, m = map(int, t_str.split(':'))
            return datetime.fromisoformat(date_str).replace(hour=h, minute=m), None
        except (ValueError, AttributeError):
            return None, f'{label} must be in HH:MM format'

    login_dt, e1 = _parse_time(login_time_str, 'login_time')
    if e1: return jsonify({'error': e1}), 400
    logout_dt, e2 = _parse_time(logout_time_str, 'logout_time')
    if e2: return jsonify({'error': e2}), 400

    if not login_dt:
        # No time given at all — still mark Present with a default morning time
        login_dt = datetime.fromisoformat(date_str).replace(hour=9, minute=30)

    hours_worked = None
    if login_dt and logout_dt:
        hours_worked = round((logout_dt - login_dt).total_seconds() / 3600, 2)

    db.attendance_daily.update_one(
        {'employee_id': emp_id, 'date': date_str},
        {'$set': {
            'employee_id': emp_id,
            'date': date_str,
            'login_time': login_dt,
            'logout_time': logout_dt,
            'hours_worked': hours_worked,
            'regularized': True,
            'regularized_by': uid,
            'regularized_at': datetime.utcnow(),
            'regularized_remarks': remarks,
            'updated_at': datetime.utcnow(),
        }},
        upsert=True,
    )

    return jsonify({'message': f"Attendance regularized for {emp.get('name', 'employee')} on {date_str}"})