"""
payroll.py — shared payroll calculations
==========================================
Single source of truth for two things payroll needs and the rest of the app
already computes separately:

  1. Salary structure (CTC → Basic/HRA/DA/PF/other) — the same formula
     offer letters use (letters.py), so a payslip's earnings line up with
     what the employee was actually offered instead of being retyped by
     hand every month.
  2. Attendance-based pay-period counts (working/present/leave/absent days)
     — the same logic attendance.py's monthly-summary report uses, reused
     per-employee so payroll doesn't need its own copy of the working-day/
     holiday/leave rules.
"""
from datetime import date, timedelta
import calendar


def calculate_ctc_breakdown(annual_ctc, avail_pf=True, ghi_annual=0.0, metro=False):
    ctc          = float(annual_ctc)
    basic_a      = round(ctc * 0.50)
    basic_m      = round(basic_a / 12)
    hra_a        = round(basic_a * (0.50 if metro else 0.40))
    hra_m        = round(hra_a / 12)
    da_a         = round(basic_a * 0.20)
    da_m         = round(da_a / 12)
    pf_m         = 1800 if avail_pf else 0
    pf_a         = pf_m * 12
    ghi_a        = round(float(ghi_annual or 0))
    ghi_m        = round(ghi_a / 12)
    other_a      = max(0, int(ctc) - basic_a - hra_a - da_a - pf_a - ghi_a)
    other_m      = round(other_a / 12)
    gross_m      = basic_m + hra_m + da_m + other_m
    net_a        = basic_a + hra_a + da_a + other_a
    return {
        'ctc': ctc, 'basic': basic_a, 'hra': hra_a, 'da': da_a,
        'employer_pf': pf_a, 'ghi': ghi_a, 'other_allowances': other_a,
        'net_annual': net_a, 'gross_monthly': gross_m,
        'basic_monthly': basic_m, 'hra_monthly': hra_m, 'da_monthly': da_m,
        'employer_pf_monthly': pf_m, 'ghi_monthly': ghi_m,
        'other_allowances_monthly': other_m,
        'avail_pf': avail_pf, 'metro': metro,
    }


def compute_attendance_for_employee(db, employee_id, year, month):
    """
    Per-employee version of attendance.py's monthly_summary report logic:
    working days (Mon-Fri minus holidays) up to today (or full month if the
    month is already in the past), present/on-leave/absent counts.
    """
    days_in_month = calendar.monthrange(year, month)[1]
    month_start = date(year, month, 1)
    month_end = date(year, month, days_in_month)
    today = date.today()

    if (year, month) > (today.year, today.month):
        effective_end = month_start - timedelta(days=1)
    elif (year, month) == (today.year, today.month):
        effective_end = today
    else:
        effective_end = month_end

    holiday_dates = {
        h['date'] for h in db.holidays.find({
            'date': {'$gte': month_start.isoformat(), '$lte': month_end.isoformat()},
        })
    }

    working_dates = []
    for d in range(1, days_in_month + 1):
        day = date(year, month, d)
        if day > effective_end:
            break
        if day.weekday() >= 5:
            continue
        if day.isoformat() in holiday_dates:
            continue
        working_dates.append(day.isoformat())

    total_working_days = len(working_dates)

    present_dates = {
        r['date'] for r in db.attendance_daily.find({
            'employee_id': employee_id,
            'date': {'$in': working_dates},
            'login_time': {'$ne': None},
        })
    }

    leaves = list(db.leave_requests.find({
        'employee_id': employee_id,
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
                    od_dates.add(iso)
                else:
                    leave_dates.add(iso)
            cur += timedelta(days=1)

    present_count = len(present_dates) + len(od_dates - present_dates)
    leave_count = len(leave_dates)
    absent_count = max(total_working_days - present_count - leave_count, 0)

    return {
        'working_days': total_working_days,
        'present_days': present_count,
        'leave_days': leave_count,
        'absent_days': absent_count,
    }


# Flat monthly Professional Tax — matches the default already assumed in the
# offer-letter CTC breakup (letters.py's _ctc_to_ctx). HR can override per
# payslip before approving; this is just a sane starting point, not a full
# state-wise PT slab table.
DEFAULT_PROFESSIONAL_TAX = 200


def compute_payslip_defaults(db, employee, year, month):
    """
    Suggested payslip fields for one employee/month, built from their salary
    structure (CTC breakup) and actual attendance — the numbers HR would
    otherwise have to type from memory every month. HR can still edit any
    field before approving; this only removes the blank-slate guesswork.

    LOP (loss of pay) days reduce earnings pro-rata against working days,
    same as any standard payroll run.
    """
    ctc = float(employee.get('ctc') or 0)
    bd = calculate_ctc_breakdown(ctc) if ctc else None
    att = compute_attendance_for_employee(db, str(employee['_id']), year, month)

    working_days = att['working_days'] or 1
    payable_days = att['present_days'] + att['leave_days']
    proration = min(payable_days / working_days, 1.0) if working_days else 1.0

    if bd:
        basic = round(bd['basic_monthly'] * proration)
        hra = round(bd['hra_monthly'] * proration)
        da = round(bd['da_monthly'] * proration)
        pf_deduction = round(basic * 0.12)  # employee-side EPF contribution
    else:
        basic = hra = da = pf_deduction = 0

    return {
        'basic': basic,
        'hra': hra,
        'da': da,
        'allowances': 0,
        'pf_deduction': pf_deduction,
        'esi_deduction': 0,
        'income_tax': 0,
        'other_deductions': DEFAULT_PROFESSIONAL_TAX,
        'working_days': att['working_days'],
        'present_days': att['present_days'],
        'leave_days': att['leave_days'],
        'absent_days': att['absent_days'],
    }
