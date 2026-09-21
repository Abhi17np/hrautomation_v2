/**
 * PayrollRunsPage.jsx — Organization > Payroll > Run Payroll
 *
 * Batch-processes a payslip for every active employee for a chosen
 * month, using payroll_engine.py (PF/ESI/PT/TDS + attendance/leave-based
 * LOP). Replaces one-by-one manual payslip creation for the common case.
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function fmtINR(n) { return `₹${Math.round(n || 0).toLocaleString('en-IN')}`; }

function RunDetailModal({ runId, onClose, onFinalized }) {
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`/api/payroll-runs/${runId}`)
      .then(r => setRun(r.data))
      .catch(() => setError('Could not load run'))
      .finally(() => setLoading(false));
  }, [runId]);

  const finalize = async () => {
    if (!window.confirm('Finalize this payroll run? Payslips will move to Approved and can then be released to employees.')) return;
    setBusy(true); setError('');
    try {
      await axios.post(`/api/payroll-runs/${runId}/finalize`);
      onFinalized();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not finalize');
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 780, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>
            {run ? `${MONTHS[run.month]} ${run.year}` : 'Payroll Run'}
          </h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>Loading…</div>
        ) : run && (
          <>
            <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 13 }}>
              <div><strong>{run.employee_count}</strong> employees</div>
              <div>Gross: <strong>{fmtINR(run.total_gross)}</strong></div>
              <div>Net: <strong>{fmtINR(run.total_net)}</strong></div>
              <span className={`badge ${run.status === 'finalized' ? 'badge-green' : 'badge-amber'}`}>{run.status}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>LOP days</th>
                    <th>Gross</th>
                    <th>PF</th>
                    <th>ESI</th>
                    <th>PT</th>
                    <th>TDS</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {(run.payslips || []).map(p => (
                    <tr key={p._id}>
                      <td>{p.employee_name} <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>({p.employee_code})</span></td>
                      <td>{p.absent_days || 0}</td>
                      <td>{fmtINR(p.gross_salary)}</td>
                      <td>{fmtINR(p.pf_deduction)}</td>
                      <td>{fmtINR(p.esi_deduction)}</td>
                      <td>{fmtINR(p.professional_tax)}</td>
                      <td>{fmtINR(p.income_tax)}</td>
                      <td style={{ fontWeight: 600 }}>{fmtINR(p.net_salary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <a className="btn btn-secondary" href={`/api/payroll-runs/${runId}/bank-file`} target="_blank" rel="noreferrer">
                Download Bank File (CSV)
              </a>
              {run.status !== 'finalized' && (
                <button className="btn btn-primary" disabled={busy} onClick={finalize}>
                  {busy ? 'Finalizing…' : 'Finalize Run'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PayrollRunsPage() {
  const { user } = useAuth();
  const canRun = (user?.permissions || []).includes('payroll.run');

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [creating, setCreating] = useState(false);
  const [openRunId, setOpenRunId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    setLoading(true);
    axios.get('/api/payroll-runs/')
      .then(r => setRuns(r.data || []))
      .catch(() => setError('Could not load payroll runs.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const runPayroll = async () => {
    setError(''); setCreating(true);
    try {
      const res = await axios.post('/api/payroll-runs/', { month, year });
      setSuccess(`Payroll run created for ${MONTHS[month]} ${year}.`);
      setOpenRunId(res.data._id);
      load();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not run payroll');
    } finally { setCreating(false); }
  };

  if (!canRun) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <div style={{ fontWeight: 600 }}>You don't have access to run payroll.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Run Payroll</h1>
          <p className="page-subtitle">Batch-compute payslips for all active employees for a month.</p>
        </div>
      </div>

      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Month</label>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Year</label>
          <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width: 100 }} />
        </div>
        <button className="btn btn-primary" disabled={creating} onClick={runPayroll}>
          {creating ? 'Processing…' : 'Run Payroll'}
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Loading…</div>
          ) : runs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💰</div>
              <div style={{ fontWeight: 600 }}>No payroll runs yet</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Period</th><th>Employees</th><th>Gross</th><th>Net</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 600 }}>{MONTHS[r.month]} {r.year}</td>
                    <td>{r.employee_count}</td>
                    <td>{fmtINR(r.total_gross)}</td>
                    <td>{fmtINR(r.total_net)}</td>
                    <td><span className={`badge ${r.status === 'finalized' ? 'badge-green' : 'badge-amber'}`}>{r.status}</span></td>
                    <td><button className="btn btn-sm btn-secondary" onClick={() => setOpenRunId(r._id)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {openRunId && (
        <RunDetailModal runId={openRunId} onClose={() => setOpenRunId(null)}
          onFinalized={() => { setOpenRunId(null); load(); }} />
      )}
    </div>
  );
}
