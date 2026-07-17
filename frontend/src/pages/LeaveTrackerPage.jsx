/**
 * LeaveTrackerPage.jsx  (v3 — restyled to match app design system)
 * Employee & Manager leave module.
 *   - Leave Summary tab: CL/SL (pooled), ML (female only), LP cards — each
 *     shows "this month" remaining plus year-to-date used, year selector,
 *     List/Calendar toggle, Apply Leave button.
 *   - Leave Requests tab: own history, shows paid/LP split, cancel pending.
 *   - Team Requests tab (managers only): approve/reject direct reports.
 *   - Apply Leave modal: live preview of paid/LP day split before submit,
 *     with an explicit confirmation step if part of the request will
 *     become Leave Without Pay.
 *
 * All API calls, state shape, and component props are unchanged from v2 —
 * only markup/styling was reworked to use the shared .card / .stat-card /
 * .badge-* / .tabs / table / .modal / .empty-state classes from App.css
 * instead of one-off inline styles, so this page looks native next to
 * Approvals / Employees / Exit.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const LEAVE_META = {
  CL: { label: 'Casual Leave', color: '#2563eb', bg: 'rgba(37,99,235,.10)', icon: '☼' },
  SL: { label: 'Sick Leave',   color: '#7c3aed', bg: 'rgba(124,58,237,.10)', icon: '✚' },
  ML: { label: 'Menstrual Leave', color: '#db2777', bg: 'rgba(219,39,119,.10)', icon: '❀' },
  LP: { label: 'Leave Without Pay', color: '#d97706', bg: 'rgba(217,119,6,.10)', icon: '⊘' },
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
  const meta = LEAVE_META[type];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11.5, fontWeight: 700, color: meta.color, background: meta.bg,
      padding: '3px 9px', borderRadius: 'var(--radius-full)', border: `1px solid ${meta.color}30`,
    }}>
      <span style={{ fontSize: 11, opacity: .85 }}>{meta.icon}</span>{type}
    </span>
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

// ─── Apply Leave Modal (with live preview) ──────────────────────────────────
function ApplyLeaveModal({ isFemale, onClose, onSubmitted }) {
  const [leaveType, setLeaveType] = useState('');
  const [fromDate, setFromDate]   = useState('');
  const [toDate, setToDate]       = useState('');
  const [teamEmail, setTeamEmail] = useState('');
  const [reason, setReason]       = useState('');
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [preview, setPreview]     = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const debounceRef = useRef(null);

  const availableTypes = isFemale ? ['CL', 'SL', 'ML', 'LP'] : ['CL', 'SL', 'LP'];

  // Live preview whenever type/dates change
  useEffect(() => {
    setPreview(null);
    if (!leaveType || !fromDate || !toDate || toDate < fromDate) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewing(true);
      try {
        const { data } = await axios.post('/api/leaves/preview', {
          leave_type: leaveType, from_date: fromDate, to_date: toDate,
        });
        setPreview(data);
      } catch (e) {
        setPreview({ error: e.response?.data?.error || 'Could not check balance' });
      } finally { setPreviewing(false); }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [leaveType, fromDate, toDate]);

  const submit = async (acknowledgeLp = false) => {
    setError('');
    if (!leaveType) return setError('Please select a leave type.');
    if (!fromDate || !toDate) return setError('Please select a date range.');
    if (toDate < fromDate) return setError('End date cannot be before start date.');
    if (!reason.trim()) return setError('Please provide a reason for leave.');
    setSaving(true);
    try {
      await axios.post('/api/leaves/apply', {
        leave_type: leaveType, from_date: fromDate, to_date: toDate,
        team_email: teamEmail, reason, acknowledge_lp_split: acknowledgeLp,
      });
      onSubmitted();
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.error === 'lp_confirmation_required') {
        setError(e.response.data.message);
      } else {
        setError(e.response?.data?.error || 'Could not submit leave request');
      }
    } finally { setSaving(false); }
  };

  const hasLpSplit = leaveType !== 'LP' && preview && !preview.error && preview.lp_days > 0;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>Apply Leave</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 9px' }}>✕</button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="form-group">
          <label className="form-label">Leave type *</label>
          <select value={leaveType} onChange={e => setLeaveType(e.target.value)}>
            <option value="">Select…</option>
            {availableTypes.map(k => (
              <option key={k} value={k}>{LEAVE_META[k].label} ({k})</option>
            ))}
          </select>
        </div>

        <div className="form-row" style={{ margin: '14px 0' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">From *</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">To *</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
        </div>

        {previewing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
            <span className="spinner" style={{ width: 12, height: 12 }} /> Checking your balance…
          </div>
        )}
        {preview && !preview.error && leaveType !== 'LP' && (
          <div className={`alert ${hasLpSplit ? 'alert-warning' : 'alert-success'}`} style={{ marginBottom: 14 }}>
            <span>{hasLpSplit ? <>⚠️ {preview.warning}</> : <>✓ All {preview.days} day(s) fit within your free {leaveType} quota this month.</>}</span>
          </div>
        )}
        {preview?.error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{preview.error}</div>}

        <div className="form-group">
          <label className="form-label">Team email ID (optional — who to notify)</label>
          <input type="email" value={teamEmail} onChange={e => setTeamEmail(e.target.value)} placeholder="team@company.com" />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Reason for leave *</label>
          <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => submit(hasLpSplit)} disabled={saving || previewing}>
            {saving ? 'Submitting…' : hasLpSplit ? `Submit (${preview.paid_days}d paid + ${preview.lp_days}d LP)` : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar View ───────────────────────────────────────────────────────────
function CalendarView({ requests }) {
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const leaveDays = {};
  requests.filter(r => r.status === 'approved' || r.status.startsWith('pending')).forEach(r => {
    const from = new Date(r.from_date);
    const to = new Date(r.to_date);
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === year && d.getMonth() === month) leaveDays[d.getDate()] = r;
    }
  });

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="btn btn-secondary btn-sm">‹</button>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14.5, minWidth: 130, textAlign: 'center' }}>{monthLabel}</div>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="btn btn-secondary btn-sm">›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          const leave = d ? leaveDays[d] : null;
          const meta = leave ? LEAVE_META[leave.leave_type] : null;
          return (
            <div key={i} style={{
              minHeight: 64, borderRadius: 'var(--radius)', padding: '6px 8px',
              background: d ? (leave ? meta.bg : 'var(--surface-2)') : 'transparent',
              border: d ? `1px solid ${leave ? meta.color + '35' : 'var(--border)'}` : 'none',
            }}>
              {d && (
                <>
                  <div style={{ fontSize: 12, fontWeight: isToday(d) ? 800 : 600, color: isToday(d) ? 'var(--accent)' : 'var(--text)' }}>{d}</div>
                  {leave && <div style={{ fontSize: 10, fontWeight: 700, color: meta.color, marginTop: 3 }}>{leave.leave_type}</div>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Leave Summary tab ───────────────────────────────────────────────────────
function ProgressRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontWeight: 700, fontSize: 12.5 }}>{value}</span>
    </div>
  );
}

function SummaryCard({ leaveKey, availableMonth, usedMonth, availableYear, usedYear, cap }) {
  const meta = LEAVE_META[leaveKey];
  const pct = cap ? Math.max(0, Math.min(100, Math.round((usedMonth / cap) * 100))) : 0;
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: meta.color }}>{meta.icon}</div>
        <div className="stat-label" style={{ margin: 0, textTransform: 'none', letterSpacing: 0, fontSize: 13.5, color: 'var(--text)' }}>{meta.label}</div>
      </div>
      <ProgressRow label="Used this month" value={`${usedMonth} / ${cap}`} />
      <div className="progress-bar" style={{ marginBottom: 10 }}><div className="progress-fill" style={{ width: `${pct}%`, background: meta.color }} /></div>
      <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Year to date</span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-dim)' }}>{usedYear} used / {availableYear} available</span>
      </div>
    </div>
  );
}

function SummaryTab({ summary, requests, onApply }) {
  const [view, setView] = useState('list');
  if (!summary) return <div className="loading-screen"><div className="spinner" /></div>;

  const upcoming = requests.filter(r => r.status === 'approved' && new Date(r.to_date) >= new Date()).slice(0, 5);

  const clSlPct = summary.monthly_cap ? Math.max(0, Math.min(100, Math.round((summary.used_this_month / summary.monthly_cap) * 100))) : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Category: <strong style={{ textTransform: 'capitalize', color: 'var(--text)' }}>{summary.category}</strong>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="tabs" style={{ padding: 3 }}>
            <button onClick={() => setView('list')} className={`tab-btn ${view === 'list' ? 'active' : ''}`}>☰ List</button>
            <button onClick={() => setView('calendar')} className={`tab-btn ${view === 'calendar' ? 'active' : ''}`}>▦ Calendar</button>
          </div>
          <button className="btn btn-primary" onClick={onApply}>+ Apply Leave</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, marginBottom: 18 }}>
        {/* Combined CL+SL pool — ONE card since they share ONE quota */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex', marginRight: 2 }}>
              <div style={{ width: 30, height: 30, borderRadius: '8px 0 0 8px', background: LEAVE_META.CL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: LEAVE_META.CL.color }}>{LEAVE_META.CL.icon}</div>
              <div style={{ width: 30, height: 30, borderRadius: '0 8px 8px 0', background: LEAVE_META.SL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: LEAVE_META.SL.color }}>{LEAVE_META.SL.icon}</div>
            </div>
            <div className="stat-label" style={{ margin: 0, textTransform: 'none', letterSpacing: 0, fontSize: 13.5, color: 'var(--text)' }}>
              Casual / Sick Leave <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: 11.5 }}>(shared pool)</span>
            </div>
          </div>
          <ProgressRow label="Used this month (CL + SL combined)" value={`${summary.used_this_month} / ${summary.monthly_cap}`} />
          <div className="progress-bar" style={{ marginBottom: 10 }}><div className="progress-fill" style={{ width: `${clSlPct}%` }} /></div>
          <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Year to date</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-dim)' }}>{summary.used_this_year} used / {summary.annual_quota} available</span>
          </div>
        </div>

        {summary.is_female && (
          <SummaryCard leaveKey="ML" cap={summary.ml_monthly_cap}
            availableMonth={summary.ml_available_this_month} usedMonth={summary.ml_used_this_month}
            availableYear={summary.ml_available_this_year} usedYear={summary.ml_used_this_year} />
        )}

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: LEAVE_META.LP.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: LEAVE_META.LP.color }}>{LEAVE_META.LP.icon}</div>
            <div className="stat-label" style={{ margin: 0, textTransform: 'none', letterSpacing: 0, fontSize: 13.5, color: 'var(--text)' }}>{LEAVE_META.LP.label}</div>
          </div>
          <div className="stat-label">Days taken this year</div>
          <div className="stat-value" style={{ color: LEAVE_META.LP.color, fontSize: 26 }}>{summary.lp_days_taken}</div>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 18 }}>
        <span>
          CL and SL share <strong>one combined</strong> free quota of <strong>{summary.monthly_cap}/month</strong> total
          (e.g. 2 CL, or 2 SL, or 1 of each — never more than {summary.monthly_cap} combined)
          {summary.is_female && <> · ML has its own separate quota: <strong>{summary.ml_monthly_cap}/month</strong></>}.
          No carry-over — unused days don't roll into the next month. Any day beyond the free quota
          is automatically recorded as Leave Without Pay.
        </span>
      </div>

      {view === 'list' ? (
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '16px 20px', margin: 0 }}>
            <div className="card-title">Upcoming Approved Leave</div>
          </div>
          {upcoming.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th></tr></thead>
                <tbody>
                  {upcoming.map(r => (
                    <tr key={r._id}>
                      <td><TypeChip type={r.leave_type} /></td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{r.from_date} → {r.to_date}</td>
                      <td>{r.days}d{r.lp_days > 0 ? <span style={{ color: 'var(--amber)' }}> ({r.lp_days}d LP)</span> : ''}</td>
                      <td><StatusPill status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🗓️</div>
              <p>No upcoming leaves</p>
            </div>
          )}
        </div>
      ) : <CalendarView requests={requests} />}
    </div>
  );
}

// ─── Requests tab ────────────────────────────────────────────────────────────
function RequestsTab({ requests, onApply, onCancel }) {
  if (!requests.length) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-icon">🗂️</div>
          <p style={{ marginBottom: 16 }}>No leave requests yet</p>
          <button className="btn btn-primary" onClick={onApply}>+ Apply Leave</button>
        </div>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r._id}>
                <td><TypeChip type={r.leave_type} /></td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{r.from_date} → {r.to_date}</td>
                <td>
                  {r.days} day(s)
                  {r.leave_type !== 'LP' && r.lp_days > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>
                      {r.paid_days}d paid + {r.lp_days}d LP
                    </div>
                  )}
                </td>
                <td style={{ maxWidth: 220 }}>
                  {r.reason ? <span style={{ color: 'var(--text-dim)', fontSize: 12.5 }}>{r.reason}</span> : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                  {r.decision_remarks && <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 3 }}>Remarks: {r.decision_remarks}</div>}
                </td>
                <td><StatusPill status={r.status} /></td>
                <td>
                  {(r.status === 'pending_manager' || r.status === 'pending_hr_head') && (
                    <button className="btn btn-sm btn-secondary" onClick={() => onCancel(r._id)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Team Requests tab (manager only) ───────────────────────────────────────
function TeamTab({ pending, onAction }) {
  const [remarksFor, setRemarksFor] = useState(null);
  const [remarks, setRemarks] = useState('');

  if (!pending.length) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-icon">✓</div>
          <p>No pending requests from your team</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      {pending.map((r, i) => (
        <div key={r._id} style={{ padding: '16px 20px', borderBottom: i < pending.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <Avatar name={r.employee_name} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.employee_name} <span style={{ color: 'var(--text-faint)', fontWeight: 400, fontSize: 12 }}>({r.employee_code})</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                  <TypeChip type={r.leave_type} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--text-dim)' }}>{r.from_date} → {r.to_date} ({r.days}d)</span>
                  {r.lp_days > 0 && r.leave_type !== 'LP' && (
                    <span style={{ color: 'var(--amber)', fontWeight: 600, fontSize: 11.5 }}>· {r.paid_days}d paid + {r.lp_days}d LP</span>
                  )}
                </div>
                {r.reason && <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 5 }}>{r.reason}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button className="btn btn-sm btn-primary" onClick={() => onAction(r._id, 'approve')}>Approve</button>
              <button className="btn btn-sm btn-danger" onClick={() => setRemarksFor(r._id)}>Reject</button>
            </div>
          </div>
          {remarksFor === r._id && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <input placeholder="Rejection reason (required)" value={remarks} onChange={e => setRemarks(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-sm btn-danger"
                      onClick={() => { onAction(r._id, 'reject', remarks); setRemarksFor(null); setRemarks(''); }}>Confirm Reject</button>
              <button className="btn btn-sm btn-secondary" onClick={() => { setRemarksFor(null); setRemarks(''); }}>Cancel</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function LeaveTrackerPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const [tab, setTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [teamPending, setTeamPending] = useState([]);
  const [showApply, setShowApply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get('/api/leaves/my-summary').catch(() => ({ data: null })),
      axios.get('/api/leaves/my-requests').catch(() => ({ data: [] })),
      isManager ? axios.get('/api/leaves/team-pending').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ]).then(([s, r, t]) => { setSummary(s.data); setRequests(r.data); setTeamPending(t.data); })
      .finally(() => setLoading(false));
  }, [isManager]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id) => { await axios.post(`/api/leaves/${id}/cancel`).catch(() => {}); load(); };

  const handleTeamAction = async (id, action, remarks = '') => {
    try {
      await axios.post(`/api/leaves/${id}/manager-action`, { action, remarks });
      setToast(`Request ${action}d`); setTimeout(() => setToast(''), 2500); load();
    } catch (e) {
      setToast(e.response?.data?.error || 'Action failed'); setTimeout(() => setToast(''), 3000);
    }
  };

  const TABS = [
    { key: 'summary', label: 'Leave Summary' },
    { key: 'requests', label: 'Leave Requests' },
    ...(isManager ? [{ key: 'team', label: `Team Requests${teamPending.length ? ` (${teamPending.length})` : ''}` }] : []),
  ];

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Leave Tracker</div>
          <div className="page-subtitle">Apply for leave, track your balance, and view request history.</div>
        </div>
      </div>

      {toast && <div className="alert alert-success" style={{ marginBottom: 16 }}>{toast}</div>}

      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`tab-btn ${tab === t.key ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && <SummaryTab summary={summary} requests={requests} onApply={() => setShowApply(true)} />}
      {tab === 'requests' && <RequestsTab requests={requests} onApply={() => setShowApply(true)} onCancel={handleCancel} />}
      {tab === 'team' && isManager && <TeamTab pending={teamPending} onAction={handleTeamAction} />}

      {showApply && (
        <ApplyLeaveModal
          isFemale={!!summary?.is_female}
          onClose={() => setShowApply(false)}
          onSubmitted={() => { setShowApply(false); setToast('Leave request submitted'); setTimeout(() => setToast(''), 2500); load(); }}
        />
      )}
    </div>
  );
}