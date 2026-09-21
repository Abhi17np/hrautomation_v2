"""
payroll_engine.py — statutory payroll calculations: PF, ESI, Professional
Tax, and a simplified TDS (income-tax) estimate, plus LOP (loss-of-pay)
computation from attendance/leave data.

⚠️ COMPLIANCE NOTICE: the rates, ceilings, and slabs below (PF_DEFAULTS,
ESI_DEFAULTS, PT_SLABS_BY_STATE, TDS_DEFAULT_SLABS) are widely-published
figures as commonly cited for Indian payroll, but statutory numbers change
with government notifications (union budgets, state finance acts) and can
vary by establishment/wage class. They are stored as EDITABLE per-tenant
config (companies.payroll_config), not hardcoded constants used directly —
every tenant's finance/compliance team must review and confirm the active
values under Payroll > Statutory Settings before running real, filing-grade
payroll. This module implements the CALCULATION LOGIC correctly; it is not
a substitute for a compliance review of the CONFIGURED VALUES.

TDS here is a simplified monthly estimate (annual slab tax on projected
annual taxable income, divided by 12) — it does not account for old-regime
exemptions (HRA/80C/etc.), multiple Form 16s, or mid-year regime changes.
Treat it as an estimate to reduce manual work, not a final filing figure.
"""
from calendar import monthrange
from datetime import date

# ─────────────────────────────────────────────────────────────────────────────
# Default statutory config — seeded into a new company's payroll_config on
# first payroll-settings touch; every field is then editable per tenant.
# ─────────────────────────────────────────────────────────────────────────────

PF_DEFAULTS = {
    'enabled': True,
    'employer_rate': 0.12,      # 12% of PF wage
    'employee_rate': 0.12,      # 12% of PF wage
    'wage_ceiling': 15000,      # statutory PF wage ceiling; some employers apply PF on full basic instead
    'apply_ceiling': True,      # if True, PF wage = min(basic, wage_ceiling); if False, PF wage = basic
}

ESI_DEFAULTS = {
    'enabled': True,
    'employer_rate': 0.0325,    # 3.25% of gross
    'employee_rate': 0.0075,    # 0.75% of gross
    'wage_threshold': 21000,    # employees with gross <= this are ESI-eligible
}

# A handful of commonly-cited state Professional Tax slabs (monthly, INR).
# NOT exhaustive — states not listed here default to 0 unless the tenant
# supplies custom_slabs. Verify against the current state Professional Tax
# Act before relying on these for real deductions.
PT_SLABS_BY_STATE = {
    'karnataka': [
        {'upto': 15000, 'amount': 0},
        {'upto': None, 'amount': 200},
    ],
    'maharashtra': [
        {'upto': 7500, 'amount': 0},
        {'upto': 10000, 'amount': 175},
        {'upto': None, 'amount': 200},  # Feb is commonly 300 in Maharashtra; not modeled here — override via custom_slabs if needed
    ],
    'west_bengal': [
        {'upto': 10000, 'amount': 0},
        {'upto': 15000, 'amount': 110},
        {'upto': 25000, 'amount': 130},
        {'upto': 40000, 'amount': 150},
        {'upto': None, 'amount': 200},
    ],
    'andhra_pradesh': [
        {'upto': 15000, 'amount': 0},
        {'upto': 20000, 'amount': 150},
        {'upto': None, 'amount': 200},
    ],
    'telangana': [
        {'upto': 15000, 'amount': 0},
        {'upto': 20000, 'amount': 150},
        {'upto': None, 'amount': 200},
    ],
    'gujarat': [
        {'upto': 12000, 'amount': 0},
        {'upto': None, 'amount': 200},
    ],
}

TDS_DEFAULTS = {
    'enabled': True,
    'standard_deduction': 75000,   # annual, simplified new-regime style deduction
    'rebate_taxable_income_threshold': 1200000,  # projected annual taxable income at/below which rebate zeroes out tax
    'slabs': [
        {'upto': 400000, 'rate': 0.0},
        {'upto': 800000, 'rate': 0.05},
        {'upto': 1200000, 'rate': 0.10},
        {'upto': 1600000, 'rate': 0.15},
        {'upto': 2000000, 'rate': 0.20},
        {'upto': 2400000, 'rate': 0.25},
        {'upto': None, 'rate': 0.30},
    ],
    'cess_rate': 0.04,  # health & education cess on computed tax
}


def default_payroll_config():
    return {
        'pf': dict(PF_DEFAULTS),
        'esi': dict(ESI_DEFAULTS),
        'professional_tax': {'enabled': True, 'state': 'karnataka', 'custom_slabs': None},
        'tds': dict(TDS_DEFAULTS),
    }


def _slab_lookup(amount, slabs, key='amount'):
    for slab in slabs:
        if slab['upto'] is None or amount <= slab['upto']:
            return slab[key]
    return slabs[-1][key]


def compute_pf(basic, config):
    cfg = {**PF_DEFAULTS, **(config or {})}
    if not cfg['enabled'] or basic <= 0:
        return {'employer_pf': 0.0, 'employee_pf': 0.0, 'pf_wage': 0.0}
    pf_wage = min(basic, cfg['wage_ceiling']) if cfg.get('apply_ceiling', True) else basic
    return {
        'employer_pf': round(pf_wage * cfg['employer_rate']),
        'employee_pf': round(pf_wage * cfg['employee_rate']),
        'pf_wage': pf_wage,
    }


def compute_esi(gross, config):
    cfg = {**ESI_DEFAULTS, **(config or {})}
    if not cfg['enabled'] or gross <= 0 or gross > cfg['wage_threshold']:
        return {'employer_esi': 0.0, 'employee_esi': 0.0, 'eligible': False}
    return {
        'employer_esi': round(gross * cfg['employer_rate']),
        'employee_esi': round(gross * cfg['employee_rate']),
        'eligible': True,
    }


def compute_professional_tax(gross, config):
    cfg = config or {}
    if not cfg.get('enabled', True):
        return 0.0
    slabs = cfg.get('custom_slabs') or PT_SLABS_BY_STATE.get((cfg.get('state') or '').lower())
    if not slabs:
        return 0.0
    return float(_slab_lookup(gross, slabs, key='amount'))


def compute_annual_slab_tax(annual_taxable_income, slabs):
    """Standard progressive slab tax: each bracket's rate applies only to
    the income within that bracket."""
    tax = 0.0
    lower = 0
    for slab in slabs:
        upper = slab['upto'] if slab['upto'] is not None else annual_taxable_income
        if annual_taxable_income <= lower:
            break
        taxable_in_slab = max(0, min(annual_taxable_income, upper) - lower)
        tax += taxable_in_slab * slab['rate']
        lower = upper
        if slab['upto'] is None:
            break
    return tax


def compute_tds_monthly(monthly_gross, config):
    """Simplified monthly TDS estimate: annualizes the current monthly
    gross (x12), applies the standard deduction, runs it through the slab
    table, applies the small-income rebate and health/education cess, then
    divides by 12. Real payroll should true this up against actual annual
    figures each month as pay changes."""
    cfg = {**TDS_DEFAULTS, **(config or {})}
    if not cfg['enabled'] or monthly_gross <= 0:
        return {'annual_taxable_income': 0.0, 'annual_tax': 0.0, 'monthly_tds': 0.0}

    annual_gross = monthly_gross * 12
    annual_taxable = max(0, annual_gross - cfg['standard_deduction'])
    annual_tax = compute_annual_slab_tax(annual_taxable, cfg['slabs'])

    if annual_taxable <= cfg['rebate_taxable_income_threshold']:
        annual_tax = 0.0

    annual_tax_with_cess = annual_tax * (1 + cfg['cess_rate'])
    return {
        'annual_taxable_income': round(annual_taxable),
        'annual_tax': round(annual_tax_with_cess),
        'monthly_tds': round(annual_tax_with_cess / 12),
    }


def compute_lop_days(db, employee_id, month, year, working_days=None):
    """Loss-of-pay days = working days in the period minus (present days +
    approved paid leave days), floored at 0. Pulls from attendance_daily
    and leave_requests — both already tenant-scoped collections the
    payroll run queries through the same TenantScopedDB as everything
    else."""
    last_day = monthrange(year, month)[1]
    start = date(year, month, 1).isoformat()
    end = date(year, month, last_day).isoformat()

    if working_days is None:
        working_days = last_day  # simplistic: caller may pass a real working-days count (excludes weekends/holidays) instead

    present_days = db.attendance_daily.count_documents({
        'employee_id': employee_id,
        'date': {'$gte': start, '$lte': end},
        'status': {'$in': ['present', 'half_day']},
    }) if hasattr(db.attendance_daily, 'count_documents') else 0

    approved_leave_days = 0
    for lr in db.leave_requests.find({
        'employee_id': employee_id, 'status': 'approved',
        'from_date': {'$lte': end}, 'to_date': {'$gte': start},
    }):
        approved_leave_days += float(lr.get('days', 1) or 1)

    lop_days = max(0, working_days - present_days - approved_leave_days)
    return {
        'working_days': working_days, 'present_days': present_days,
        'approved_leave_days': approved_leave_days, 'lop_days': lop_days,
    }


def compute_payslip_breakdown(emp, payroll_config, lop_days=0, working_days=None):
    """Builds a full statutory payslip breakdown for one employee for one
    month, pro-rating basic/HRA/DA/allowances for LOP days first."""
    last_day = working_days or 30
    basic = float(emp.get('basic') or 0)
    hra = float(emp.get('hra') or 0)
    da = float(emp.get('da') or 0)
    allowances = float(emp.get('allowances') or 0)

    prorate = max(0.0, (last_day - lop_days) / last_day) if last_day else 1.0
    basic_p, hra_p, da_p, allow_p = basic * prorate, hra * prorate, da * prorate, allowances * prorate
    gross = basic_p + hra_p + da_p + allow_p

    pf = compute_pf(basic_p, payroll_config.get('pf'))
    esi = compute_esi(gross, payroll_config.get('esi'))
    pt = compute_professional_tax(gross, payroll_config.get('professional_tax'))
    tds = compute_tds_monthly(gross, payroll_config.get('tds'))

    total_deductions = pf['employee_pf'] + esi['employee_esi'] + pt + tds['monthly_tds']
    net_salary = gross - total_deductions

    return {
        'basic': round(basic_p), 'hra': round(hra_p), 'da': round(da_p), 'allowances': round(allow_p),
        'gross_salary': round(gross),
        'pf_deduction': pf['employee_pf'], 'employer_pf': pf['employer_pf'],
        'esi_deduction': esi['employee_esi'], 'employer_esi': esi['employer_esi'],
        'professional_tax': pt,
        'income_tax': tds['monthly_tds'], 'annual_taxable_income': tds['annual_taxable_income'],
        'other_deductions': 0,
        'total_deductions': round(total_deductions),
        'net_salary': round(net_salary),
    }
