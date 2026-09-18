import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const HR_ROLES = ['admin', 'hr', 'hr_head'];

const CATEGORY_OPTIONS = [
  { value: 'payroll', label: 'Payroll' },
  { value: 'it', label: 'IT' },
  { value: 'hr_policy', label: 'HR Policy' },
  { value: 'leave_attendance', label: 'Leave & Attendance' },
  { value: 'general', label: 'General' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORY_OPTIONS.map(o => [o.value, o.label]));

const STATUS_BADGE_CFG = {
  open: { cls: 'badge-blue', label: 'Open' },
  in_progress: { cls: 'badge-amber', label: 'In Progress' },
  resolved: { cls: 'badge-green', label: 'Resolved' },
  closed: { cls: 'badge-gray', label: 'Closed' },
};

const PRIORITY_BADGE_CFG = {
  low: { cls: 'badge-gray', label: 'Low' },
  medium: { cls: 'badge-amber', label: 'Medium' },
  high: { cls: 'badge-red', label: 'High' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_BADGE_CFG[status] || { cls: 'badge-gray', label: status };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_BADGE_CFG[priority] || { cls: 'badge-gray', label: priority };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function fmtDateTime(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return d; }
}

// ─── New Ticket modal ────────────────────────────────────────────────────────

function NewTicketModal({ onClose, onCreated }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError('');
    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required.');
      return;
    }
    setSaving(true);
    try {
      const r = await axios.post('/api/support/tickets', {
        subject: subject.trim(), description: description.trim(), category, priority,
      });
      onCreated(r.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not create ticket.');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>New Support Ticket</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 9px' }}>✕</button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="form-group">
          <label className="form-label">Subject *</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary of your issue" />
        </div>

        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Describe your query in detail…" />
        </div>

        <div className="form-row" style={{ margin: '14px 0 0' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Submitting…' : 'Submit Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket detail modal ─────────────────────────────────────────────────────

function TicketDetailModal({ ticketId, isHR, onClose, onUpdated }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [toast, setToast] = useState('');

  // HR management panel state
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [savingMgmt, setSavingMgmt] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState([]);

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(() => {
    setLoading(true);
    axios.get(`/api/support/tickets/${ticketId}`)
      .then(r => {
        setTicket(r.data);
        setStatus(r.data.status);
        setPriority(r.data.priority);
        setAssignedTo(r.data.assigned_to || '');
      })
      .catch(() => notify('Failed to load ticket.'))
      .finally(() => setLoading(false));
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isHR) return;
    // /api/auth/users is admin/hr_head only on the backend; plain "hr" callers
    // will get a 403 here — degrade gracefully by leaving the list empty.
    axios.get('/api/auth/users')
      .then(r => setAssignableUsers((r.data || []).filter(u => HR_ROLES.includes(u.role))))
      .catch(() => setAssignableUsers([]));
  }, [isHR]);

  const postComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const r = await axios.post(`/api/support/tickets/${ticketId}/comments`, { message: comment.trim() });
      setTicket(r.data);
      setComment('');
    } catch {
      notify('Failed to post comment.');
    } finally { setPosting(false); }
  };

  const saveManagement = async () => {
    setSavingMgmt(true);
    try {
      const r = await axios.put(`/api/support/tickets/${ticketId}`, {
        status, priority, assigned_to: assignedTo || null,
      });
      setTicket(r.data);
      notify('Ticket updated.');
      onUpdated?.();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to update ticket.');
    } finally { setSavingMgmt(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 640, maxHeight: '88vh', overflowY: 'auto' }}>
        {loading || !ticket ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>{ticket.ticket_no}</div>
                <h3 className="modal-title" style={{ margin: '4px 0 0' }}>{ticket.subject}</h3>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 9px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 8, margin: '10px 0 16px', flexWrap: 'wrap' }}>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span className="badge badge-gray">{CATEGORY_LABEL[ticket.category] || ticket.category}</span>
            </div>

            {toast && <div className="alert alert-success" style={{ marginBottom: 14 }}>{toast}</div>}

            <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16, whiteSpace: 'pre-wrap' }}>
              {ticket.description}
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 20 }}>
              Raised by {ticket.raised_by_name || '—'} · {fmtDateTime(ticket.created_at)}
            </div>

            {/* HR management panel */}
            {isHR && (
              <div className="card" style={{ padding: '14px 16px', marginBottom: 20, background: 'var(--surface-2)' }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 12 }}>Manage Ticket</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
                    <label className="form-label">Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value)}>
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0, minWidth: 120 }}>
                    <label className="form-label">Priority</label>
                    <select value={priority} onChange={e => setPriority(e.target.value)}>
                      {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0, minWidth: 180 }}>
                    <label className="form-label">Assign to</label>
                    <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                      <option value="">Unassigned</option>
                      {assignableUsers.map(u => (
                        <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={saveManagement} disabled={savingMgmt}>
                    {savingMgmt ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {/* Comments */}
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 10 }}>Comments</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {(ticket.comments || []).length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>No comments yet.</div>
              ) : ticket.comments.map((c, i) => (
                <div key={i} style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 12.5 }}>
                      {c.user_name} <span style={{ fontWeight: 400, color: 'var(--text-dim)', fontSize: 11 }}>({c.role})</span>
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{fmtDateTime(c.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{c.message}</div>
                </div>
              ))}
            </div>

            <div className="form-group" style={{ marginBottom: 10 }}>
              <textarea rows={2} value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Write a comment…" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={postComment} disabled={posting || !comment.trim()}>
                {posting ? 'Posting…' : 'Post Comment'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Stats strip (HR/admin only) ─────────────────────────────────────────────

function StatsStrip({ stats }) {
  const tiles = [
    { key: 'open', label: 'Open', color: 'var(--blue-700)' },
    { key: 'in_progress', label: 'In Progress', color: '#d97706' },
    { key: 'resolved', label: 'Resolved', color: 'var(--green)' },
    { key: 'closed', label: 'Closed', color: 'var(--text-dim)' },
    { key: 'total', label: 'Total', color: 'var(--text)' },
  ];
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
      {tiles.map(t => (
        <div key={t.key} className="card" style={{ padding: '14px 20px', flex: 1, minWidth: 110 }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>{t.label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.color }}>{stats ? (stats[t.key] ?? 0) : '—'}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Top-level page ───────────────────────────────────────────────────────────

export default function HRMSupportPage() {
  const { user } = useAuth();
  const isHR = HR_ROLES.includes(user?.role);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [toast, setToast] = useState('');

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (isHR) {
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
    }
    axios.get('/api/support/tickets', { params })
      .then(r => setTickets(r.data || []))
      .catch(() => notify('Failed to load tickets.'))
      .finally(() => setLoading(false));
  }, [isHR, statusFilter, categoryFilter]);

  const loadStats = useCallback(() => {
    if (!isHR) return;
    axios.get('/api/support/tickets/stats')
      .then(r => setStats(r.data))
      .catch(() => setStats(null));
  }, [isHR]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>HRM Support</div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ New Ticket</button>
      </div>

      {toast && <div className="alert alert-success" style={{ marginBottom: 16 }}>{toast}</div>}

      {isHR && <StatsStrip stats={stats} />}

      {isHR && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ maxWidth: 190 }}>
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Ticket #</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                {isHR && <th>Raised By</th>}
                <th>Created</th>
                <th>Actions</th>
              </tr></thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr><td colSpan={isHR ? 8 : 7}>
                    <div className="empty-state">
                      <div className="empty-icon">☎</div>
                      <p>{isHR ? 'No tickets match this filter.' : "You haven't raised any tickets yet."}</p>
                    </div>
                  </td></tr>
                ) : tickets.map(t => (
                  <tr key={t._id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{t.ticket_no}</td>
                    <td style={{ fontWeight: 500 }}>{t.subject}</td>
                    <td style={{ fontSize: 13 }}>{CATEGORY_LABEL[t.category] || t.category}</td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td><StatusBadge status={t.status} /></td>
                    {isHR && <td style={{ fontSize: 13 }}>{t.raised_by_name || '—'}</td>}
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmtDate(t.created_at)}</td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => setDetailId(t._id)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <NewTicketModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            notify('Ticket submitted.');
            load(); loadStats();
          }}
        />
      )}

      {detailId && (
        <TicketDetailModal
          ticketId={detailId}
          isHR={isHR}
          onClose={() => setDetailId(null)}
          onUpdated={() => { load(); loadStats(); }}
        />
      )}
    </div>
  );
}
