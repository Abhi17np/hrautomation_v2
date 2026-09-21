/**
 * PoliciesPage.jsx — policy library with acknowledgment tracking.
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function UploadModal({ onClose, onDone }) {
  const [form, setForm] = useState({ title: '', category: '', body: '', requires_acknowledgment: true });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('file', file);
      await axios.post('/api/policies/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onDone('Policy published.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not publish policy');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Publish Policy</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Leave, Conduct, IT" />
          </div>
          <div className="form-group">
            <label className="form-label">Body text (optional if uploading a file)</label>
            <textarea rows={4} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Document (optional)</label>
            <input type="file" onChange={e => setFile(e.target.files[0])} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 16 }}>
            <input type="checkbox" checked={form.requires_acknowledgment}
              onChange={e => setForm({ ...form, requires_acknowledgment: e.target.checked })} />
            Requires employee acknowledgment
          </label>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Publishing…' : 'Publish'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AckModal({ policy, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    axios.get(`/api/policies/${policy._id}/acknowledgments`).then(r => setData(r.data)).catch(() => {});
  }, [policy._id]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{policy.title} — Acknowledgments</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {!data ? <div>Loading…</div> : (
          <>
            <p style={{ fontSize: 13, marginBottom: 12 }}>
              <strong>{data.acknowledged_count}</strong> of <strong>{data.total}</strong> employees have acknowledged.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data.users.map(u => (
                <div key={u.user_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0' }}>
                  <span>{u.name}</span>
                  <span className={`badge ${u.acknowledged ? 'badge-green' : 'badge-gray'}`}>{u.acknowledged ? 'Acknowledged' : 'Pending'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PoliciesPage() {
  const { user } = useAuth();
  const canManage = (user?.permissions || []).includes('policies.manage');
  const canViewAck = (user?.permissions || []).includes('policies.view_acknowledgments');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [ackPolicy, setAckPolicy] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    axios.get('/api/policies/')
      .then(r => setItems(r.data || []))
      .catch(() => setError('Could not load policies.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const notify = (msg) => { setSuccess(msg); setShowUpload(false); load(); setTimeout(() => setSuccess(''), 3000); };

  const acknowledge = async (p) => {
    try { await axios.post(`/api/policies/${p._id}/acknowledge`); notify('Acknowledged.'); }
    catch (err) { setError(err.response?.data?.error || 'Could not acknowledge'); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Policies</h1>
          <p className="page-subtitle">Company policy library</p>
        </div>
        {canManage && <button className="btn btn-primary" onClick={() => setShowUpload(true)}>+ Publish Policy</button>}
      </div>

      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon">📘</div>
          <div style={{ fontWeight: 600 }}>No policies published yet</div>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(p => (
            <div key={p._id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{p.title}</div>
                  {p.category && <span className="badge badge-blue" style={{ marginTop: 6, display: 'inline-block' }}>{p.category}</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {p.file_gridfs_id && (
                    <a className="btn btn-sm btn-secondary" href={`/api/policies/${p._id}/file`} target="_blank" rel="noreferrer">View Document</a>
                  )}
                  {canViewAck && (
                    <button className="btn btn-sm btn-secondary" onClick={() => setAckPolicy(p)}>Acknowledgments</button>
                  )}
                  {p.requires_acknowledgment && !p.acknowledged && (
                    <button className="btn btn-sm btn-primary" onClick={() => acknowledge(p)}>Acknowledge</button>
                  )}
                  {p.requires_acknowledgment && p.acknowledged && (
                    <span className="badge badge-green">Acknowledged</span>
                  )}
                </div>
              </div>
              {p.body && <p style={{ fontSize: 13, color: 'var(--text)', margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>{p.body}</p>}
            </div>
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={notify} />}
      {ackPolicy && <AckModal policy={ackPolicy} onClose={() => setAckPolicy(null)} />}
    </div>
  );
}
