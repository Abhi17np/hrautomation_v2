"""
routes/analytics.py — headcount/attrition trends, department/designation
distribution, and statutory compliance registers derived from payroll
runs (PF/ESI/PT/TDS totals actually withheld, for filing reference).
"""
from calendar import monthrange
from datetime import datetime, date

from flask import Blueprint, jsonify, request

from auth_utils import require_permission
from tenant_scope import get_db

analytics_bp = Blueprint('analytics', __name__)

_DATE_FORMATS = ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y')


def _parse_date(s):
    if not s:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(str(s).strip(), fmt).date()
        except ValueError:
            continue
    return None


def _last_n_months(n):
    """Returns n (year, month) tuples ending at the current month, oldest first."""
    today = date.today()
    months = []
    y, m = today.year, today.month
    for _ in range(n):
        months.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return list(reversed(months))


@analytics_bp.route('/headcount', methods=['GET'])
@require_permission('reports.view')
def headcount():
    db = get_db()
    employees = list(db.employees.find({}, {'joining_date': 1, 'last_working_day': 1, 'exit_date': 1, 'status': 1, 'department': 1, 'designation': 1}))

    records = []
    for e in employees:
        join = _parse_date(e.get('joining_date'))
        exited = e.get('status') == 'exited'
        exit_d = _parse_date(e.get('exit_date')) or _parse_date(e.get('last_working_day')) if exited else None
        records.append({'join': join, 'exit': exit_d})

    months = _last_n_months(12)
    trend = []
    for (y, m) in months:
        month_end = date(y, m, monthrange(y, m)[1])
        headcount_eom = sum(1 for r in records if r['join'] and r['join'] <= month_end and (not r['exit'] or r['exit'] > month_end))
        hires = sum(1 for r in records if r['join'] and r['join'].year == y and r['join'].month == m)
        exits = sum(1 for r in records if r['exit'] and r['exit'].year == y and r['exit'].month == m)
        month_start = date(y, m, 1)
        headcount_start = sum(1 for r in records if r['join'] and r['join'] < month_start and (not r['exit'] or r['exit'] >= month_start))
        attrition_rate = round((exits / headcount_start) * 100, 2) if headcount_start else 0
        trend.append({
            'year': y, 'month': m, 'label': date(y, m, 1).strftime('%b %Y'),
            'headcount': headcount_eom, 'hires': hires, 'exits': exits, 'attrition_rate': attrition_rate,
        })

    active = [e for e in employees if e.get('status') != 'exited']
    by_department = {}
    by_designation = {}
    for e in active:
        dept = e.get('department') or 'Unassigned'
        desig = e.get('designation') or 'Unassigned'
        by_department[dept] = by_department.get(dept, 0) + 1
        by_designation[desig] = by_designation.get(desig, 0) + 1

    return jsonify({
        'trend': trend,
        'current_headcount': len(active),
        'by_department': [{'label': k, 'count': v} for k, v in sorted(by_department.items(), key=lambda x: -x[1])],
        'by_designation': [{'label': k, 'count': v} for k, v in sorted(by_designation.items(), key=lambda x: -x[1])],
    })


@analytics_bp.route('/compliance-register', methods=['GET'])
@require_permission('reports.view')
def compliance_register():
    """Monthly PF/ESI/PT/TDS totals actually withheld via payroll runs —
    a filing-reference summary, not a substitute for the statutory
    returns themselves (see payroll_engine.py's compliance notice)."""
    db = get_db()
    year = request.args.get('year', type=int) or datetime.utcnow().year

    pipeline = [
        {'$match': {'year': year}},
        {'$group': {
            '_id': '$month',
            'employer_pf': {'$sum': {'$ifNull': ['$employer_pf', 0]}},
            'employee_pf': {'$sum': {'$ifNull': ['$pf_deduction', 0]}},
            'employer_esi': {'$sum': {'$ifNull': ['$employer_esi', 0]}},
            'employee_esi': {'$sum': {'$ifNull': ['$esi_deduction', 0]}},
            'professional_tax': {'$sum': {'$ifNull': ['$professional_tax', 0]}},
            'tds': {'$sum': {'$ifNull': ['$income_tax', 0]}},
            'gross_salary': {'$sum': {'$ifNull': ['$gross_salary', 0]}},
            'employee_count': {'$sum': 1},
        }},
        {'$sort': {'_id': 1}},
    ]
    rows = list(db.payslips.aggregate(pipeline))
    for r in rows:
        r['month'] = r.pop('_id')
    return jsonify({'year': year, 'months': rows})
