/**
 * LeaveManagementPage.jsx  (v3 — restyled to match app design system)
 * HR / HR Head / Admin oversight of the Leave Tracker module.
 *
 * All API calls, state shape, and component props are unchanged from v2 —
 * only markup/styling was reworked to use the shared .card / .badge-* /
 * .tabs / table / .modal / .empty-state classes from App.css instead of
 * one-off inline styles, so rows line up in real table columns instead of
 * stacked divs.
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const LEAVE_META = {
  CL: { label: 'CL', color: '#2563eb', bg: 'rgba(37,99,235,.10)' },
  SL: { label: 'SL', color: '#7c3aed', bg: 'rgba(124,58,237,.10)' },
  ML: { label: 'ML', color: '#db2777', bg: 'rgba(219,39,119,.10)' },
  LP: { label: 'LP', color: '#d97706', bg: 'rgba(217,119,6,.10)' },
};

const STATUS_META = {
  pending_manager: { label: 'Pending — Manager', cls: 'badge-amber' },
  pending_hr_head:  { label: 'Pending — HR Head', cls: 'badge-amber' },
  approved:         { label: 'Approved',          cls: 'badge-green' },
  rejected:         { label: 'Rejected',           cls: 'badge-red' },
  cancelled:        { label: 'Cancelled',          cls: 'badge-gray' },
};

function StatusPill({ status }) {
  const m = STATUS_META[status] || { label: status, cls: 'badge-gray' };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function TypeChip({ type }) {
  const meta = LEAVE_META[type] || { label: type, color: '#64748b', bg: 'var(--surface-2)' };
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 700, color: meta.color, background: meta.bg,
      padding: '3px 9px', borderRadius: 'var(--radius-full)', border: `1px solid ${meta.color}30`,
    }}>{meta.label}</span>
  );
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
}

function Avatar({ name, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--accent-dim)', color: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, fontFamily: 'var(--display)',
    }}>{initials(name)}</div>
  );
}

// ─── Adjust balance modal ────────────────────────────────────────────────────
function AdjustBalanceModal({ row, onClose, onSaved }) {
  const [category, setCategory] = useState(row.category);
  const [monthlyCap, setMonthlyCap] = useState(row.monthly_cap);
  const [mlCap, setMlCap] = useState(row.ml_monthly_cap);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const CATEGORY_DEFAULTS = {
    regular:      { monthly_cap: 2, ml_monthly_cap: 0 },
    female:       { monthly_cap: 2, ml_monthly_cap: 1 },
    probationary: { monthly_cap: 1, ml_monthly_cap: 0 },
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      await axios.post(`/api/leaves/balances/${row.employee_id}/adjust`, {
        category, monthly_cap: Number(monthlyCap), ml_monthly_cap: Number(mlCap),
      });
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not save changes');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <h3 className="modal-title">Adjust Balance — {row.employee_name}</h3>

        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="form-group">
          <label className="form-label">Category</label>
          <select value={category} onChange={e => {
            const cat = e.target.value;
            setCategory(cat);
            setMonthlyCap(CATEGORY_DEFAULTS[cat].monthly_cap);
            setMlCap(CATEGORY_DEFAULTS[cat].ml_monthly_cap);
          }}>
            <option value="regular">Regular — 2 free CL/SL per month</option>
            <option value="female">Female — 2 free CL/SL + 1 ML per month</option>
            <option value="probationary">Probationary — 1 free CL/SL per month</option>
          </select>
        </div>

        <div className="form-row" style={{ margin: '14px 0' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">CL/SL free per month</label>
            <input type="number" value={monthlyCap} onChange={e => setMonthlyCap(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">ML free per month</label>
            <input type="number" value={mlCap} onChange={e => setMlCap(e.target.value)} disabled={category !== 'female'} />
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
          Changing the category resets the monthly caps to their defaults above — adjust the numbers
          afterward if this employee needs a custom quota. This does not affect days already used this month.
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Notification bell ───────────────────────────────────────────────────────
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread_count: 0 });
  const load = () => axios.get('/api/leaves/notifications').then(r => setData(r.data)).catch(() => {});

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, []);

  const openPanel = () => {
    setOpen(o => !o);
    if (data.unread_count > 0) axios.post('/api/leaves/notifications/mark-read').then(load).catch(() => {});
  };

  return (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-secondary" onClick={openPanel} style={{ width: 36, height: 36, padding: 0, borderRadius: 9, position: 'relative', fontSize: 15 }}>
        🔔
        {data.unread_count > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 'var(--radius-full)',
            background: 'var(--red)', color: '#fff', fontSize: 9.5, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
          }}>{data.unread_count}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 42, width: 340, maxHeight: 420, overflowY: 'auto',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)', zIndex: 50,
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>Leave Notifications</div>
          {data.notifications.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 14px' }}>
              <p style={{ margin: 0 }}>No notifications yet</p>
            </div>
          ) : data.notifications.map(n => (
            <div key={n._id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--surface-2)', fontSize: 12.5 }}>
              <div>{n.message}</div>
              <div style={{ color: 'var(--text-faint)', fontSize: 10.5, marginTop: 3 }}>{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── All Requests tab ────────────────────────────────────────────────────────
function AllRequestsTab({ requests, canDecide, onDecide }) {
  const [remarksFor, setRemarksFor] = useState(null);
  const [remarks, setRemarks] = useState('');

  if (!requests.length) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-icon">🗂️</div>
          <p>No leave requests found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {requests.map(r => {
              const subtitle = [r.employee_code, r.department].filter(Boolean).join(' · ');
              return (
                <tr key={r._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={r.employee_name} size={28} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.employee_name}</div>
                        {subtitle && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{subtitle}</div>}
                      </div>
                    </div>
                  </td>
                  <td><TypeChip type={r.leave_type} /></td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{r.from_date} → {r.to_date}</td>
                  <td>
                    {r.days}d
                    {r.lp_days > 0 && r.leave_type !== 'LP' && (
                      <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2, whiteSpace: 'nowrap' }}>{r.paid_days}d paid + {r.lp_days}d LP</div>
                    )}
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    {r.reason ? <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{r.reason}</span> : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                    {r.routing_note && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3, fontStyle: 'italic' }}>{r.routing_note}</div>}
                  </td>
                  <td><StatusPill status={r.status} /></td>
                  <td>
                    {canDecide && r.status === 'pending_hr_head' && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-sm btn-primary" onClick={() => onDecide(r._id, 'approve')}>Approve</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setRemarksFor(r._id)}>Reject</button>
                      </div>
                    )}
                    {remarksFor === r._id && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 6, minWidth: 260 }}>
                        <input placeholder="Rejection reason" value={remarks} onChange={e => setRemarks(e.target.value)} style={{ flex: 1 }} />
                        <button className="btn btn-sm btn-danger" onClick={() => { onDecide(r._id, 'reject', remarks); setRemarksFor(null); setRemarks(''); }}>Confirm</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setRemarksFor(null); setRemarks(''); }}>Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Balances tab ────────────────────────────────────────────────────────────
function BalancesTab({ balances, onAdjust }) {
  const [editing, setEditing] = useState(null);

  if (!balances.length) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-icon">⚖️</div>
          <p>No balances found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th><th>Dept</th><th>Category</th><th>CL/SL free/mo</th>
              <th>Used this mo</th><th>Used YTD</th><th>ML free/mo</th><th>ML used YTD</th><th>LP taken YTD</th><th></th>
            </tr>
          </thead>
          <tbody>
            {balances.map(b => (
              <tr key={b.employee_id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={b.employee_name} size={28} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{b.employee_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{b.employee_code}</div>
                    </div>
                  </div>
                </td>
                <td style={{ color: 'var(--text-dim)' }}>{b.department || '—'}</td>
                <td><span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{b.category}</span></td>
                <td>{b.monthly_cap}</td>
                <td>{b.used_this_month}</td>
                <td>{b.used_this_year}</td>
                <td>{b.ml_monthly_cap || '—'}</td>
                <td>{b.ml_monthly_cap ? b.ml_used_this_year : '—'}</td>
                <td style={{ color: 'var(--amber)', fontWeight: 700 }}>{b.lp_days_taken}</td>
                <td><button className="btn btn-sm btn-secondary" onClick={() => setEditing(b)}>Adjust</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <AdjustBalanceModal row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onAdjust(); }} />}
    </div>
  );
}

// ─── Add/Edit leave type modal ───────────────────────────────────────────────
function LeaveTypeModal({ type, onClose, onSaved }) {
  const isEdit = !!type;
  const [name, setName] = useState(type?.name || '');
  const [code, setCode] = useState(type?.code || '');
  const [cap, setCap] = useState(type?.monthly_cap ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      const monthly_cap = cap === '' || cap === null ? null : Number(cap);
      if (isEdit) {
        await axios.put(`/api/leaves/types/${type._id}`, { name: name.trim(), monthly_cap });
      } else {
        await axios.post('/api/leaves/types', { code: code.trim(), name: name.trim(), monthly_cap });
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not save leave type');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <h3 className="modal-title">{isEdit ? 'Edit Leave Type' : 'Add Leave Type'}</h3>

        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="form-group">
          <label className="form-label">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bereavement Leave" />
        </div>
        <div className="form-group">
          <label className="form-label">Code</label>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. BRVMT"
            disabled={isEdit}
          />
          {isEdit && (
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
              Code can't be changed after a leave type is created.
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Monthly cap (days)</label>
          <input
            type="number" min="0" step="0.5" value={cap}
            onChange={e => setCap(e.target.value)}
            placeholder="Leave blank for uncapped"
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={saving || !name.trim() || (!isEdit && !code.trim())}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const EMPTY_CATEGORY_RULES = {
  regular: { monthly_cap: 0, ml_monthly_cap: 0 },
  probationary: { monthly_cap: 0, ml_monthly_cap: 0 },
  female: { monthly_cap: 0, ml_monthly_cap: 0 },
};

const CATEGORY_ROWS = [
  { key: 'regular', label: 'Regular' },
  { key: 'probationary', label: 'Probationary' },
  { key: 'female', label: 'Female employees' },
];

// ─── Settings tab ────────────────────────────────────────────────────────────
function SettingsTab({ notify }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [yearMonth, setYearMonth] = useState(1);
  const [savingYear, setSavingYear] = useState(false);

  const [caps, setCaps] = useState(EMPTY_CATEGORY_RULES);
  const [savingCaps, setSavingCaps] = useState(false);

  const [types, setTypes] = useState([]);
  const [showAddType, setShowAddType] = useState(false);
  const [editingType, setEditingType] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    Promise.all([
      axios.get('/api/leaves/policy'),
      axios.get('/api/leaves/types'),
    ]).then(([p, t]) => {
      setYearMonth(p.data.leave_year_start_month || 1);
      setCaps({ ...EMPTY_CATEGORY_RULES, ...(p.data.category_rules || {}) });
      setTypes(t.data);
    }).catch(e => {
      setError(e.response?.data?.error || 'Could not load leave settings');
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshTypes = () => axios.get('/api/leaves/types').then(r => setTypes(r.data)).catch(() => {});

  const saveYear = async () => {
    setSavingYear(true);
    try {
      const { data } = await axios.put('/api/leaves/policy', { leave_year_start_month: Number(yearMonth) });
      setYearMonth(data.leave_year_start_month);
      notify('Leave year setting saved');
    } catch (e) {
      notify(e.response?.data?.error || 'Could not save leave year setting');
    } finally { setSavingYear(false); }
  };

  const saveCaps = async () => {
    setSavingCaps(true);
    try {
      const payload = {};
      CATEGORY_ROWS.forEach(({ key }) => {
        payload[key] = {
          monthly_cap: Number(caps[key]?.monthly_cap || 0),
          ml_monthly_cap: Number(caps[key]?.ml_monthly_cap || 0),
        };
      });
      const { data } = await axios.put('/api/leaves/policy', { category_rules: payload });
      setCaps({ ...EMPTY_CATEGORY_RULES, ...(data.category_rules || {}) });
      notify('Category caps saved');
    } catch (e) {
      notify(e.response?.data?.error || 'Could not save category caps');
    } finally { setSavingCaps(false); }
  };

  const toggleActive = async (t) => {
    try {
      await axios.put(`/api/leaves/types/${t._id}`, { is_active: !t.is_active });
      notify(`${t.name} ${t.is_active ? 'deactivated' : 'reactivated'}`);
      refreshTypes();
    } catch (e) {
      notify(e.response?.data?.error || 'Could not update leave type');
    }
  };

  const deleteType = async (t) => {
    if (!window.confirm(`Delete leave type "${t.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/leaves/types/${t._id}`);
      notify('Leave type deleted');
      refreshTypes();
    } catch (e) {
      notify(e.response?.data?.error || 'Could not delete leave type');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="empty-state"><p>Loading settings…</p></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 14 }}>Leave Year</h3>
        <div className="form-group">
          <label className="form-label">Leave year starts in</label>
          <select value={yearMonth} onChange={e => setYearMonth(Number(e.target.value))} style={{ width: 240 }}>
            {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 14 }}>
          Choose January for a calendar-year leave cycle (Jan – Dec). Choosing any other month starts a
          fiscal leave year instead — e.g. April begins a leave year that runs April through March.
        </div>
        <button className="btn btn-primary" onClick={saveYear} disabled={savingYear}>
          {savingYear ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 14 }}>Category Caps</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>CL/SL days per month</th>
                <th>Additional ML days per month</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_ROWS.map(({ key, label }) => (
                <tr key={key}>
                  <td style={{ fontWeight: 600 }}>{label}</td>
                  <td>
                    <input
                      type="number" min="0" step="0.5" style={{ width: 100 }}
                      value={caps[key]?.monthly_cap ?? 0}
                      onChange={e => setCaps(c => ({ ...c, [key]: { ...c[key], monthly_cap: e.target.value } }))}
                    />
                  </td>
                  <td>
                    {key === 'female' ? (
                      <input
                        type="number" min="0" step="0.5" style={{ width: 100 }}
                        value={caps[key]?.ml_monthly_cap ?? 0}
                        onChange={e => setCaps(c => ({ ...c, [key]: { ...c[key], ml_monthly_cap: e.target.value } }))}
                      />
                    ) : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={saveCaps} disabled={savingCaps}>
          {savingCaps ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Custom Leave Types</h3>
          <button className="btn btn-sm btn-primary" onClick={() => setShowAddType(true)}>+ Add Leave Type</button>
        </div>
        {types.length === 0 ? (
          <div className="empty-state"><p>No custom leave types yet</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Code</th><th>Monthly cap</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {types.map(t => (
                  <tr key={t._id}>
                    <td>{t.name}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{t.code}</td>
                    <td>{t.monthly_cap == null ? 'Uncapped' : t.monthly_cap}</td>
                    <td><span className={`badge ${t.is_active ? 'badge-green' : 'badge-gray'}`}>{t.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditingType(t)}>Edit</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => toggleActive(t)}>
                          {t.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteType(t)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddType && (
        <LeaveTypeModal
          onClose={() => setShowAddType(false)}
          onSaved={() => { setShowAddType(false); notify('Leave type added'); refreshTypes(); }}
        />
      )}
      {editingType && (
        <LeaveTypeModal
          type={editingType}
          onClose={() => setEditingType(null)}
          onSaved={() => { setEditingType(null); notify('Leave type updated'); refreshTypes(); }}
        />
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function LeaveManagementPage() {
  const { user } = useAuth();
  const canDecide = ['hr_head', 'admin'].includes(user?.role);

  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const q = statusFilter ? `?status=${statusFilter}` : '';
    Promise.all([
      axios.get(`/api/leaves/all${q}`).catch(() => ({ data: [] })),
      axios.get('/api/leaves/balances').catch(() => ({ data: [] })),
    ]).then(([r, b]) => { setRequests(r.data); setBalances(b.data); }).finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDecide = async (id, action, remarks = '') => {
    try {
      await axios.post(`/api/leaves/${id}/hr-head-action`, { action, remarks });
      setToast(`Request ${action}d`); setTimeout(() => setToast(''), 2500); load();
    } catch (e) {
      setToast(e.response?.data?.error || 'Action failed'); setTimeout(() => setToast(''), 3000);
    }
  };

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Leave Management</div>
          <div className="page-subtitle">
            Track every employee's leave requests and monthly balances.
            {!canDecide && ' You can view and adjust balances; approvals are handled by managers and HR Head.'}
          </div>
        </div>
        <NotificationBell />
      </div>

      {toast && <div className="alert alert-success" style={{ marginBottom: 16 }}>{toast}</div>}

      <div className="tabs" style={{ marginBottom: 18 }}>
        {[
          { key: 'requests', label: 'All Requests' },
          { key: 'balances', label: 'Balances' },
          ...(canDecide ? [{ key: 'settings', label: 'Settings' }] : []),
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`tab-btn ${tab === t.key ? 'active' : ''}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'requests' && (
        <>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 220 }}>
              <option value="">All statuses</option>
              <option value="pending_manager">Pending — Manager</option>
              <option value="pending_hr_head">Pending — HR Head</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <AllRequestsTab requests={requests} canDecide={canDecide} onDecide={handleDecide} />
        </>
      )}
      {tab === 'balances' && <BalancesTab balances={balances} onAdjust={load} />}
      {tab === 'settings' && canDecide && <SettingsTab notify={notify} />}
    </div>
  );
}