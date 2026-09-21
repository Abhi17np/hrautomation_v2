/**
 * AuditLogPage.jsx — Organization > Audit Log
 *
 * Read-only view of sensitive actions (credential/role/workflow changes,
 * auth events) recorded by backend/audit.py.
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function fmt(ts) {
  try { return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return ts; }
}

const ACTION_LABEL = {
  'auth.login_succeeded': 'Login succeeded',
  'auth.login_failed': 'Login failed',
  'auth.password_changed': 'Password changed',
  'auth.password_reset_requested': 'Password reset requested',
  'auth.password_reset_completed': 'Password reset completed',
  'user.invited': 'User invited',
  'user.activated': 'User activated',
  'role.created': 'Role created',
  'role.updated': 'Role updated',
  'role.deleted': 'Role deleted',
  'workflow.updated': 'Workflow updated',
  'workflow.reset': 'Workflow reset to default',
};

export default function AuditLogPage() {
  const { user } = useAuth();
  const canView = (user?.permissions || []).includes('audit.view');

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canView) return;
    axios.get('/api/audit-log/')
      .then(r => setEntries(r.data || []))
      .catch(() => setError('Could not load audit log.'))
      .finally(() => setLoading(false));
  }, [canView]);

  if (!canView) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <div style={{ fontWeight: 600 }}>You don't have access to the Audit Log.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">{entries.length} recent events</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Loading…</div>
          ) : entries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div style={{ fontWeight: 600 }}>No audit events yet</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e._id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(e.created_at)}</td>
                    <td>{e.actor_name || '—'}</td>
                    <td>{ACTION_LABEL[e.action] || e.action}</td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                      {e.details && Object.keys(e.details).length > 0 ? JSON.stringify(e.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
