/**
 * ExpensesPage.jsx — Expense Claims
 *
 * Employees submit reimbursement claims with an optional receipt;
 * approvers (permission expenses.approve) review, approve/reject, and
 * mark reimbursed once paid out.
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  ['travel', 'Travel'], ['food', 'Food'], ['accommodation', 'Accommodation'],
  ['office_supplies', 'Office Supplies'], ['communication', 'Communication'], ['other', 'Other'],
];

const STATUS_BADGE = {
  pending_approval: { cls: 'badge-amber', label: 'Pending Approval' },
  approved: { cls: 'badge-blue', label: 'Approved' },
  rejected: { cls: 'badge-red', label: 'Rejected' },
  reimbursed: { cls: 'badge-green', label: 'Reimbursed' },
};

function Badge({ status }) {
  const c = STATUS_BADGE[status] || { cls: 'badge-gray', label: status };
  return <span className={`badge ${c.cls}`}>{c.label}</span>;
}

function SubmitModal({ onClose, onDone }) {
  const [form, setForm] = useState({ category: 'travel', amount: '', description: '', expense_date: '' });
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (receipt) fd.append('receipt', receipt);
      await axios.post('/api/expenses/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onDone('Claim submitted.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit claim');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Submit Expense Claim</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input required type="number" min="0.01" step="0.01" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Expense Date</label>
            <input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Receipt</label>
            <input type="file" onChange={e => setReceipt(e.target.files[0])} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Submitting…' : 'Submit Claim'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const canApprove = (user?.permissions || []).includes('expenses.approve');

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    axios.get('/api/expenses/')
      .then(r => setClaims(r.data || []))
      .catch(() => setError('Could not load expense claims.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const notify = (msg) => { setSuccess(msg); setShowSubmit(false); load(); setTimeout(() => setSuccess(''), 3000); };

  const act = async (claim, action) => {
    let remarks = '';
    if (action === 'reject') {
      remarks = window.prompt('Reason for rejection:') || '';
      if (!remarks) return;
    }
    setBusyId(claim._id); setError('');
    try {
      await axios.post(`/api/expenses/${claim._id}/action`, { action, remarks });
      notify(`Claim ${action}d.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed');
    } finally { setBusyId(null); }
  };

  const reimburse = async (claim) => {
    setBusyId(claim._id); setError('');
    try {
      await axios.post(`/api/expenses/${claim._id}/reimburse`);
      notify('Marked reimbursed.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not mark reimbursed');
    } finally { setBusyId(null); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expense Claims</h1>
          <p className="page-subtitle">{claims.length} claims</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowSubmit(true)}>+ Submit Claim</button>
      </div>

      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Loading…</div>
          ) : claims.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧾</div>
              <div style={{ fontWeight: 600 }}>No expense claims yet</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  {canApprove && <th>Employee</th>}
                  <th>Category</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map(c => (
                  <tr key={c._id}>
                    {canApprove && <td>{c.employee_name} <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>({c.employee_code})</span></td>}
                    <td>{CATEGORIES.find(([v]) => v === c.category)?.[1] || c.category}</td>
                    <td>₹{Math.round(c.amount).toLocaleString('en-IN')}</td>
                    <td>{c.expense_date || '—'}</td>
                    <td><Badge status={c.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.receipt_gridfs_id && (
                          <a className="btn btn-sm btn-secondary" href={`/api/expenses/${c._id}/receipt`} target="_blank" rel="noreferrer">Receipt</a>
                        )}
                        {canApprove && c.status === 'pending_approval' && (
                          <>
                            <button className="btn btn-sm btn-secondary" disabled={busyId === c._id} onClick={() => act(c, 'approve')}>Approve</button>
                            <button className="btn btn-sm btn-secondary" disabled={busyId === c._id} onClick={() => act(c, 'reject')}>Reject</button>
                          </>
                        )}
                        {canApprove && c.status === 'approved' && (
                          <button className="btn btn-sm btn-secondary" disabled={busyId === c._id} onClick={() => reimburse(c)}>Mark Reimbursed</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showSubmit && <SubmitModal onClose={() => setShowSubmit(false)} onDone={notify} />}
    </div>
  );
}
