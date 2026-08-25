import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Travel', 'Food', 'Accommodation', 'Office Supplies', 'Client Entertainment', 'Other'];

const STATUS_META = {
  pending_manager: { label: 'Pending — Manager', cls: 'badge-amber' },
  pending_hr:       { label: 'Pending — HR',      cls: 'badge-amber' },
  approved:         { label: 'Approved',          cls: 'badge-blue' },
  rejected:         { label: 'Rejected',          cls: 'badge-red' },
  paid:             { label: 'Paid',              cls: 'badge-green' },
};

function StatusPill({ status }) {
  const m = STATUS_META[status] || { label: status, cls: 'badge-gray' };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function money(currency, amount) {
  return `${currency || 'INR'} ${Number(amount || 0).toLocaleString()}`;
}

// ─── Submit form ──────────────────────────────────────────────────────────────
function SubmitExpenseForm({ onSubmitted }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [description, setDescription] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount'); return; }
    if (!expenseDate) { setError('Expense date is required'); return; }
    setSaving(true); setError('');
    try {
      const form = new FormData();
      form.append('category', category);
      form.append('amount', amount);
      form.append('expense_date', expenseDate);
      form.append('description', description);
      if (receipt) form.append('receipt', receipt);
      await axios.post('/api/expenses/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAmount(''); setExpenseDate(''); setDescription(''); setReceipt(null);
      onSubmitted();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not submit expense');
    } finally { setSaving(false); }
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header"><div className="card-title">Submit an Expense</div></div>
      {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Amount (INR)</label>
          <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Expense Date</label>
          <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Receipt (optional)</label>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" onChange={e => setReceipt(e.target.files?.[0] || null)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="What was this for?" />
      </div>
      <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Submitting…' : 'Submit Expense'}</button>
    </div>
  );
}

// ─── Shared table ─────────────────────────────────────────────────────────────
function ExpenseTable({ expenses, showEmployee, actions }) {
  if (expenses.length === 0) {
    return <div className="empty-state" style={{ padding: '32px 16px' }}><p style={{ margin: 0 }}>No expenses found.</p></div>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {showEmployee && <th>Employee</th>}
            <th>Date</th><th>Category</th><th>Amount</th><th>Receipt</th><th>Status</th>{actions && <th></th>}
          </tr>
        </thead>
        <tbody>
          {expenses.map(e => (
            <tr key={e._id}>
              {showEmployee && <td>{e.employee_name || '—'}</td>}
              <td>{e.expense_date}</td>
              <td>{e.category}</td>
              <td style={{ fontWeight: 600 }}>{money(e.currency, e.amount)}</td>
              <td>
                {e.receipt_filename
                  ? <a href={`/api/expenses/${e._id}/receipt`} target="_blank" rel="noreferrer" className="btn-link">View</a>
                  : '—'}
              </td>
              <td><StatusPill status={e.status} /></td>
              {actions && <td style={{ textAlign: 'right' }}>{actions(e)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Action modal (approve/reject with remarks) ───────────────────────────────
function DecisionModal({ title, onClose, onConfirm }) {
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const go = async (action) => {
    if (action === 'reject' && !remarks.trim()) { return; }
    setSaving(true);
    try { await onConfirm(action, remarks); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <h3 className="modal-title">{title}</h3>
        <div className="form-group">
          <label className="form-label">Remarks (required to reject)</label>
          <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-danger" onClick={() => go('reject')} disabled={saving}>Reject</button>
          <button className="btn btn-primary" onClick={() => go('approve')} disabled={saving}>Approve</button>
        </div>
      </div>
    </div>
  );
}

// ─── Employee view ─────────────────────────────────────────────────────────────
function EmployeeView() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => axios.get('/api/expenses/').then(r => setExpenses(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Expenses</div>
          <div className="page-subtitle">Submit reimbursement requests and track their approval status.</div>
        </div>
      </div>
      <SubmitExpenseForm onSubmitted={load} />
      <div className="card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state" style={{ padding: '32px 16px' }}><p>Loading…</p></div>
          : <ExpenseTable expenses={expenses} />}
      </div>
    </div>
  );
}

// ─── Manager view ──────────────────────────────────────────────────────────────
function ManagerView() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decisionTarget, setDecisionTarget] = useState(null);
  const { user } = useAuth();

  const load = () => axios.get('/api/expenses/').then(r => setExpenses(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const pending = expenses.filter(e => e.status === 'pending_manager' && e.employee_id !== user?.employee_ref);
  const rest = expenses.filter(e => !(e.status === 'pending_manager' && e.employee_id !== user?.employee_ref));

  const decide = async (action, remarks) => {
    await axios.post(`/api/expenses/${decisionTarget._id}/manager-action`, { action, remarks });
    setDecisionTarget(null);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Team Expenses</div>
          <div className="page-subtitle">Approve expenses from your direct reports, and track your own submissions.</div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: 0 }}>
          <div className="card-header" style={{ padding: '12px 18px' }}><div className="card-title">Awaiting Your Approval</div></div>
          <ExpenseTable expenses={pending} showEmployee actions={e => (
            <button className="btn btn-primary btn-sm" onClick={() => setDecisionTarget(e)}>Review</button>
          )} />
        </div>
      )}

      <SubmitExpenseForm onSubmitted={load} />

      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: '12px 18px' }}><div className="card-title">All Team Expenses</div></div>
        {loading ? <div className="empty-state" style={{ padding: '32px 16px' }}><p>Loading…</p></div>
          : <ExpenseTable expenses={rest} showEmployee />}
      </div>

      {decisionTarget && (
        <DecisionModal
          title={`Review expense — ${decisionTarget.employee_name}`}
          onClose={() => setDecisionTarget(null)}
          onConfirm={decide}
        />
      )}
    </div>
  );
}

// ─── HR view ────────────────────────────────────────────────────────────────
function HRView() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    axios.get('/api/expenses/', { params: statusFilter ? { status: statusFilter } : {} })
      .then(r => setExpenses(r.data))
      .catch(() => setError('Could not load expenses'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  const decide = async (action, remarks) => {
    await axios.post(`/api/expenses/${decisionTarget._id}/hr-action`, { action, remarks });
    setDecisionTarget(null);
    load();
  };

  const markPaid = async (e) => {
    await axios.post(`/api/expenses/${e._id}/mark-paid`, {});
    load();
  };

  const counts = expenses.reduce((acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc; }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Expense Approvals</div>
          <div className="page-subtitle">Company-wide expense review and reimbursement processing.</div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['', `All (${expenses.length})`], ['pending_hr', `Pending HR (${counts.pending_hr || 0})`],
          ['pending_manager', `Pending Manager (${counts.pending_manager || 0})`],
          ['approved', `Approved (${counts.approved || 0})`], ['paid', `Paid (${counts.paid || 0})`],
          ['rejected', `Rejected (${counts.rejected || 0})`]].map(([val, lbl]) => (
          <button key={val} className={`btn btn-sm ${statusFilter === val ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(val)}>
            {lbl}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state" style={{ padding: '32px 16px' }}><p>Loading…</p></div>
          : <ExpenseTable expenses={expenses} showEmployee actions={e => (
              e.status === 'pending_hr'
                ? <button className="btn btn-primary btn-sm" onClick={() => setDecisionTarget(e)}>Review</button>
                : e.status === 'approved'
                ? <button className="btn btn-secondary btn-sm" onClick={() => markPaid(e)}>Mark Paid</button>
                : null
            )} />}
      </div>

      {decisionTarget && (
        <DecisionModal
          title={`Review expense — ${decisionTarget.employee_name}`}
          onClose={() => setDecisionTarget(null)}
          onConfirm={decide}
        />
      )}
    </div>
  );
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  if (['admin', 'hr', 'hr_head'].includes(role)) return <HRView />;
  if (role === 'manager') return <ManagerView />;
  return <EmployeeView />;
}
