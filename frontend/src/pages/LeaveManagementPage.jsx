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
      </div>

      {toast && <div className="alert alert-success" style={{ marginBottom: 16 }}>{toast}</div>}

      <div className="tabs" style={{ marginBottom: 18 }}>
        {[{ key: 'requests', label: 'All Requests' }, { key: 'balances', label: 'Balances' }].map(t => (
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
    </div>
  );
}