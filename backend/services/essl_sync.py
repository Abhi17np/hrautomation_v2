"""
essl_sync.py — Pulls punch logs from the eSSL/ZKTeco biometric device and
syncs them into MongoDB.

Place at: backend/services/essl_sync.py

Called from routes/attendance.py as:
    from services.essl_sync import sync_now
    result = sync_now(current_app._get_current_object())

Also exposes start_background_sync(app) if you want a polling thread
started from app.py on boot (optional — manual_sync works without it).
"""

import threading
import time
from datetime import datetime, date

from zk import ZK

# Same IP/port/flag that worked in your test_essl_connect.py
DEVICE_IP = '192.168.0.4'
DEVICE_PORT = 4370
POLL_SECONDS = 60


def _connect():
    """Open a connection to the device. Raises on failure."""
    zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=5, ommit_ping=True)
    return zk.connect()


def _fetch_raw_punches():
    """Connect to the device and return its raw attendance log list."""
    conn = _connect()
    try:
        records = conn.get_attendance()
    finally:
        conn.disconnect()
    return records


def _fetch_raw_punches_with_hard_timeout(hard_timeout=10):
    """Same as _fetch_raw_punches, but backstopped with a hard wall-clock
    timeout. pyzk's own `timeout=` param is unreliable when the network
    silently drops packets (common when the device is on a different
    network than the server) — the TCP connect can hang far longer than
    the stated timeout. This guarantees sync_now() always returns quickly
    even if the device is completely unreachable."""
    result = {}
    error = {}

    def _worker():
        try:
            result['records'] = _fetch_raw_punches()
        except Exception as e:
            error['exc'] = e

    t = threading.Thread(target=_worker, daemon=True)
    t.start()
    t.join(hard_timeout)

    if t.is_alive():
        raise TimeoutError(
            f'Device at {DEVICE_IP}:{DEVICE_PORT} did not respond within {hard_timeout}s — '
            'it may be offline or unreachable from this network.'
        )
    if 'exc' in error:
        raise error['exc']
    return result.get('records', [])


def _get_last_synced_ts(db):
    """Return the timestamp of the newest punch we've already processed, or None.
    Keyed on 'key' rather than a fixed _id string — with tenant_id merged in
    by the wrapper, a fixed _id would collide across tenants (Mongo _id must
    be unique per collection, independent of any other filter field)."""
    state = db.sync_state.find_one({'key': 'essl_sync'})
    return state['last_synced_ts'] if state else None


def _set_last_synced_ts(db, ts):
    db.sync_state.update_one(
        {'key': 'essl_sync'},
        {'$set': {'last_synced_ts': ts, 'updated_at': datetime.utcnow()}},
        upsert=True,
    )


def _resolve_default_tenant_id(app):
    """DEVICE_IP above is a single hardcoded physical device, so today this
    module can only meaningfully sync one tenant's data (multi-device,
    per-tenant device configuration is a later feature-phase item, not a
    tenant-isolation gap in existing code — there's genuinely one office's
    device here). Resolves to the oldest active company (tenant zero) when
    no explicit tenant_id is given."""
    company = app.db.companies.find_one({'status': {'$ne': 'suspended'}}, sort=[('created_at', 1)])
    if not company:
        raise RuntimeError('No active company found to sync attendance for')
    return str(company['_id'])


def sync_now(app, full_resync=False, tenant_id=None):
    """
    Pull all punches from the device, insert any new ones, recompute
    attendance_daily for every (employee, date) touched, and return a
    summary dict.

    full_resync=True ignores the saved cursor and rechecks every record on
    the device - use this once after mapping new employees, so their
    historical punches (older than the current cursor) get picked up.
    Normal polling should leave this False for speed.

    tenant_id scopes every DB read/write this run touches (see
    _resolve_default_tenant_id's docstring for why this module supports
    exactly one tenant's device today). Pass it explicitly from a request
    context (g.tenant_id); the background poller resolves a default.
    """
    print('[essl_sync] sync_now: start', flush=True)
    with app.app_context():
        if tenant_id is None:
            tenant_id = _resolve_default_tenant_id(app)
        from tenant_scope import scoped_db_for
        db = scoped_db_for(tenant_id)

    result = {
        'total_punches_on_device': 0,
        'new_punches_synced': 0,
        'days_recomputed': 0,
        'unmapped_device_uids': [],
    }

    print('[essl_sync] connecting to device...', flush=True)
    try:
        records = _fetch_raw_punches_with_hard_timeout()
    except Exception as e:
        print(f'[essl_sync] device fetch FAILED: {e}', flush=True)
        result['error'] = f'Could not connect to device: {e}'
        return result

    print(f'[essl_sync] got {len(records)} records from device', flush=True)
    result['total_punches_on_device'] = len(records)

    # Only look at records newer than the last cursor - skips re-checking
    # thousands of already-synced records against Mongo on every poll.
    last_synced_ts = None if full_resync else _get_last_synced_ts(db)
    if last_synced_ts:
        records = [r for r in records if r.timestamp > last_synced_ts]
    print(f'[essl_sync] {len(records)} records newer than last sync cursor '
          f'({last_synced_ts})', flush=True)

    print('[essl_sync] querying employees collection for essl_uid mapping...', flush=True)
    # Build device_uid -> employee_id lookup from employees.essl_uid
    employees = list(db.employees.find({'essl_uid': {'$exists': True, '$ne': None}}))
    print(f'[essl_sync] found {len(employees)} mapped employees', flush=True)
    uid_to_emp = {str(e['essl_uid']).strip().upper(): str(e['_id']) for e in employees}

    unmapped_uids = set()
    affected_emp_dates = set()  # (employee_id, date_str) pairs touched by new punches
    new_count = 0

    print(f'[essl_sync] processing {len(records)} punches...', flush=True)
    for i, rec in enumerate(records):
        if i % 500 == 0:
            print(f'[essl_sync] ...at record {i}/{len(records)}', flush=True)
        device_uid = str(rec.user_id)
        ts = rec.timestamp  # datetime
        emp_id = uid_to_emp.get(device_uid.strip().upper())
        if not emp_id:
            unmapped_uids.add(device_uid)
            continue

        # Dedupe: one raw punch document per (employee_id, timestamp)
        existing = db.attendance_punches.find_one({
            'employee_id': emp_id,
            'timestamp': ts,
        })
        if existing:
            continue

        db.attendance_punches.insert_one({
            'employee_id': emp_id,
            'device_uid': device_uid,
            'timestamp': ts,
            'synced_at': datetime.utcnow(),
        })
        new_count += 1
        affected_emp_dates.add((emp_id, ts.date().isoformat()))

    print(f'[essl_sync] done processing. new={new_count} unmapped={len(unmapped_uids)}', flush=True)

    result['new_punches_synced'] = new_count
    result['unmapped_device_uids'] = sorted(unmapped_uids)

    # Advance the cursor to the newest timestamp seen this run (even for
    # unmapped/duplicate records) so next poll doesn't re-scan them either.
    if records:
        newest_ts = max(r.timestamp for r in records)
        _set_last_synced_ts(db, newest_ts)
        print(f'[essl_sync] cursor advanced to {newest_ts}', flush=True)

    # Recompute attendance_daily for every (employee, date) that got new punches
    for emp_id, date_str in affected_emp_dates:
        _recompute_day(db, emp_id, date_str)

    result['days_recomputed'] = len(affected_emp_dates)
    return result


def _is_weekend_or_holiday(db, date_str):
    d = datetime.fromisoformat(date_str).date()
    if d.weekday() >= 5:  # Saturday/Sunday
        return True
    return db.holidays.find_one({'date': date_str}) is not None


def _credit_comp_off_if_earned(db, employee_id, date_str):
    """If the employee actually punched in on a weekend or company holiday,
    credit +1 comp-off day — exactly once per date, ever (tracked via
    comp_off_earned_dates so re-syncing the same day never double-credits)."""
    if not _is_weekend_or_holiday(db, date_str):
        return

    year = datetime.fromisoformat(date_str).year
    from routes.leaves import _get_or_create_category  # lazy import — avoids circular import at boot
    cat_doc = _get_or_create_category(db, employee_id, year)
    if not cat_doc:
        return

    already_credited = date_str in (cat_doc.get('comp_off_earned_dates') or [])
    if already_credited:
        return

    db.leave_balances.update_one(
        {'_id': cat_doc['_id']},
        {
            '$inc': {'comp_off_balance': 1},
            '$addToSet': {'comp_off_earned_dates': date_str},
            '$set': {'updated_at': datetime.utcnow()},
        },
    )
    print(f'[essl_sync] comp-off credited: employee {employee_id} worked {date_str}', flush=True)


def _recompute_day(db, employee_id, date_str):
    """
    Rebuild the attendance_daily summary for one employee on one day,
    from all raw punches recorded for that employee/day.
    """
    day_start = datetime.fromisoformat(date_str)
    day_end = datetime.fromisoformat(date_str).replace(hour=23, minute=59, second=59)

    punches = list(db.attendance_punches.find({
        'employee_id': employee_id,
        'timestamp': {'$gte': day_start, '$lte': day_end},
    }).sort('timestamp', 1))

    if not punches:
        return

    login_time = punches[0]['timestamp']
    logout_time = punches[-1]['timestamp'] if len(punches) > 1 else None

    hours_worked = None
    if logout_time:
        hours_worked = round((logout_time - login_time).total_seconds() / 3600, 2)

    db.attendance_daily.update_one(
        {'employee_id': employee_id, 'date': date_str},
        {'$set': {
            'employee_id': employee_id,
            'date': date_str,
            'login_time': login_time,
            'logout_time': logout_time,
            'hours_worked': hours_worked,
            'punch_count': len(punches),
            'updated_at': datetime.utcnow(),
        }},
        upsert=True,
    )

    _credit_comp_off_if_earned(db, employee_id, date_str)


def start_background_sync(app):
    """
    Optional: call this once from app.py after creating the Flask app to
    poll the device every POLL_SECONDS in a background thread, e.g.:

        from services.essl_sync import start_background_sync
        start_background_sync(app)
    """
    def _loop():
        while True:
            try:
                sync_now(app)
            except Exception as e:
                print(f'[essl_sync] background sync error: {e}')
            time.sleep(POLL_SECONDS)

    t = threading.Thread(target=_loop, daemon=True)
    t.start()
    print(f'ESSL sync: background thread started, polling every {POLL_SECONDS}s')