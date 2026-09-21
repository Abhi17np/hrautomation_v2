"""
permissions.py — the permission catalog for configurable RBAC.

This is the single source of truth for every permission key a role's
`permissions` array may contain (backend/db_init.py's `roles` collection).
Route code checks these via `auth_utils.require_permission(*perms)`.

Existing route files still gate most endpoints with the older
`require_role('admin', 'hr_head', ...)` decorator (a hardcoded 5-value
enum check against `users.role`) — that keeps working unchanged. Every
role, system or custom, also carries a `base_role` naming which of those
5 legacy buckets it behaves as on routes not yet migrated to
`require_permission`. New surfaces (role management itself, the workflow
engine, and anything built from here on) should use `require_permission`
so a tenant admin can actually reassign who can do what, rather than being
stuck with the fixed enum.
"""

# ─────────────────────────────────────────────────────────────────────────────
# Catalog: module -> [(key, label), ...]
# Shown in the Roles & Permissions admin UI grouped by module.
# ─────────────────────────────────────────────────────────────────────────────

PERMISSION_CATALOG = {
    "Administration": [
        ("roles.manage",       "Manage roles & permissions"),
        ("users.manage",       "Create & manage user accounts"),
        ("workflows.manage",   "Configure approval workflows"),
        ("company.manage",     "Edit company settings (branding, policies)"),
        ("audit.view",         "View audit log"),
    ],
    "Employees": [
        ("employees.view",           "View employee records"),
        ("employees.manage",         "Create & edit employee records"),
        ("employees.manage_sensitive", "Edit salary, manager assignment, org placement"),
        ("employees.delete",         "Delete employee records"),
        ("employees.bulk_import",    "Bulk import employees via Excel"),
    ],
    "Templates": [
        ("templates.manage", "Upload & edit letter templates"),
        ("templates.delete", "Delete templates"),
    ],
    "Offer Letters": [
        ("letters.create",    "Generate & edit offer letters"),
        ("letters.approve",   "Approve/reject offer letters"),
        ("letters.send",      "Email offer letters to candidates"),
        ("letters.create_id", "Create employee login ID after joining"),
        ("letters.delete",    "Delete draft/rejected letters"),
    ],
    "Appointment Orders": [
        ("appointment_orders.create",  "Create appointment orders"),
        ("appointment_orders.approve", "Approve/reject appointment orders"),
        ("appointment_orders.delete",  "Delete draft/rejected orders"),
    ],
    "Exit & Offboarding": [
        ("exit.approve_resignation", "Approve/reject employee resignations"),
        ("exit.manage_clearance",    "Update exit clearance checklist"),
        ("exit.generate_relieving",  "Generate relieving letters"),
    ],
    "Leave": [
        ("leaves.approve",       "Approve/reject leave requests"),
        ("leaves.manage_policy", "Configure leave types & policy"),
        ("leaves.view_all",      "View all employees' leave records"),
    ],
    "Attendance": [
        ("attendance.view_all", "View all employees' attendance"),
        ("attendance.manage",   "Manage attendance records & corrections"),
        ("attendance.configure", "Configure shifts, holidays, grace periods"),
    ],
    "Payroll": [
        ("payslips.generate", "Generate payslips"),
        ("payslips.approve",  "Approve payslips"),
        ("payslips.release",  "Release payslips to employees"),
        ("payroll.configure", "Configure statutory settings (PF, ESI, PT, TDS)"),
        ("payroll.run",       "Run batch payroll for a month"),
        ("expenses.approve",  "Approve/reject expense claims"),
        ("fnf.manage",        "Compute & finalize full & final settlements"),
    ],
    "Documents": [
        ("documents.review", "Review & verify employee KYC documents"),
    ],
    "Assets": [
        ("assets.manage", "Manage asset inventory & assignment"),
        ("assets.delete",  "Delete asset records"),
    ],
    "Support": [
        ("support.manage", "Manage & resolve HR support tickets"),
    ],
    "Reports": [
        ("reports.view", "View analytics & compliance reports"),
    ],
    "Integrations": [
        ("integrations.manage", "Manage API keys & webhook subscriptions"),
    ],
    "Engagement": [
        ("announcements.manage", "Post & manage company announcements"),
        ("policies.manage", "Upload & manage policy documents"),
        ("policies.view_acknowledgments", "View who has acknowledged a policy"),
    ],
}

ALL_PERMISSIONS = {key for perms in PERMISSION_CATALOG.values() for key, _ in perms}

LEGACY_ROLE_KEYS = ('admin', 'hr', 'hr_head', 'manager', 'employee')

# ─────────────────────────────────────────────────────────────────────────────
# Default permission sets for the 5 system roles every tenant is seeded with.
# Chosen to be a superset of what each role's require_role(...) call sites
# already grant today (see routes/*.py), so migrating a route from
# require_role to require_permission never regresses an existing tenant.
# ─────────────────────────────────────────────────────────────────────────────

DEFAULT_ROLE_PERMISSIONS = {
    "admin": sorted(ALL_PERMISSIONS),  # admin can do everything
    "hr_head": sorted(ALL_PERMISSIONS - {"roles.manage", "company.manage"}),
    "hr": sorted({
        "employees.view", "employees.manage", "employees.bulk_import",
        "templates.manage",
        "letters.create", "letters.send",
        "appointment_orders.create",
        "exit.manage_clearance", "exit.generate_relieving",
        "leaves.approve", "leaves.view_all",
        "attendance.view_all", "attendance.manage",
        "payslips.generate", "payslips.release", "payroll.run",
        "expenses.approve",
        "documents.review",
        "assets.manage",
        "support.manage",
        "announcements.manage", "policies.manage", "policies.view_acknowledgments",
        "reports.view",
    }),
    "manager": sorted({
        "employees.view",
        "exit.approve_resignation",
        "leaves.approve",
        "attendance.view_all",
    }),
    "employee": sorted(set()),  # only what @tenant_scoped grants (own data)
}

SYSTEM_ROLE_NAMES = {
    "admin":    "Admin",
    "hr_head":  "HR Head",
    "hr":       "HR",
    "manager":  "Manager",
    "employee": "Employee",
}
