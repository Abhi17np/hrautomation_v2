/**
 * IntegrationsPage.jsx — Organization > Integrations
 *
 * API keys (for the read-only public API, routes/public_api.py) and
 * webhook subscriptions (routes/webhooks.py). Enterprise-plan feature.
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function RevealOnce({ label, value }) {
  return (
    <div className="alert alert-success" style={{ marginBottom: 16, wordBreak: 'break-all' }}>
      <strong>{label}:</strong> <code>{value}</code>
      <div style={{ fontSize: 11, marginTop: 6 }}>Copy this now — it won't be shown again.</div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { user } = useAuth();
  const canManage = (user?.permissions || []).includes('integrations.manage');

  const [keys, setKeys] = useState([]);
  const [hooks, setHooks] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reveal, setReveal] = useState(null);

  const [keyName, setKeyName] = useState('');
  const [hookForm, setHookForm] = useState({ url: '', events: [] });

  const load = () => {
    setLoading(true);
    Promise.all([axios.get('/api/api-keys/'), axios.get('/api/webhooks/')])
      .then(([k, w]) => { setKeys(k.data || []); setHooks(w.data.webhooks || []); setAvailableEvents(w.data.available_events || []); })
      .catch(() => setError('Could not load integrations.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const createKey = async () => {
    if (!keyName.trim()) return;
    setError('');
    try {
      const res = await axios.post('/api/api-keys/', { name: keyName });
      setReveal({ label: 'API Key', value: res.data.key });
      setKeyName('');
      load();
    } catch (err) { setError(err.response?.data?.error || 'Could not create key'); }
  };

  const revokeKey = async (k) => {
    if (!window.confirm(`Revoke "${k.name}"?`)) return;
    await axios.delete(`/api/api-keys/${k._id}`);
    load();
  };

  const toggleEvent = (ev) => setHookForm(f => ({
    ...f, events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
  }));

  const createHook = async () => {
    if (!hookForm.url || hookForm.events.length === 0) return;
    setError('');
    try {
      const res = await axios.post('/api/webhooks/', hookForm);
      setReveal({ label: 'Webhook Signing Secret', value: res.data.secret });
      setHookForm({ url: '', events: [] });
      load();
    } catch (err) { setError(err.response?.data?.error || 'Could not create webhook'); }
  };

  const deleteHook = async (h) => {
    if (!window.confirm('Delete this webhook?')) return;
    await axios.delete(`/api/webhooks/${h._id}`);
    load();
  };

  if (!canManage) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <div style={{ fontWeight: 600 }}>You don't have access to Integrations.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="page-subtitle">API keys and webhook subscriptions — Enterprise plan.</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {reveal && <RevealOnce {...reveal} />}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Loading…</div>
      ) : (
        <>
          <div className="card" style={{ padding: 18, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>API Keys</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input placeholder="Key name, e.g. 'Accounting export'" value={keyName} onChange={e => setKeyName(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={createKey}>+ Create Key</button>
            </div>
            {keys.map(k => (
              <div key={k._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                <span>{k.name} <code style={{ fontSize: 11, color: 'var(--text-dim)' }}>{k.key_prefix}…</code></span>
                <button className="btn btn-sm btn-secondary" onClick={() => revokeKey(k)}>Revoke</button>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Webhooks</div>
            <div className="form-group">
              <label className="form-label">URL</label>
              <input placeholder="https://example.com/webhook" value={hookForm.url} onChange={e => setHookForm({ ...hookForm, url: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 12, margin: '8px 0 14px' }}>
              {availableEvents.map(ev => (
                <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                  <input type="checkbox" checked={hookForm.events.includes(ev)} onChange={() => toggleEvent(ev)} />
                  {ev}
                </label>
              ))}
            </div>
            <button className="btn btn-primary" onClick={createHook}>+ Add Webhook</button>

            {hooks.map(h => (
              <div key={h._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13, marginTop: 12 }}>
                <span>{h.url} — {h.events.join(', ')} {h.last_delivery_status ? `(last: ${h.last_delivery_status})` : ''}</span>
                <button className="btn btn-sm btn-secondary" onClick={() => deleteHook(h)}>Delete</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
