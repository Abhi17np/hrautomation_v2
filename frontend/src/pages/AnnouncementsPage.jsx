/**
 * AnnouncementsPage.jsx — company notice board.
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function NewAnnouncementModal({ onClose, onDone }) {
  const [form, setForm] = useState({ title: '', body: '', pinned: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await axios.post('/api/announcements/', form);
      onDone('Announcement posted.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not post announcement');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>New Announcement</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea required rows={4} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 16 }}>
            <input type="checkbox" checked={form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })} />
            Pin to top
          </label>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Posting…' : 'Post Announcement'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const canManage = (user?.permissions || []).includes('announcements.manage');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    axios.get('/api/announcements/')
      .then(r => setItems(r.data || []))
      .catch(() => setError('Could not load announcements.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const notify = (msg) => { setSuccess(msg); setShowNew(false); load(); setTimeout(() => setSuccess(''), 3000); };

  const del = async (a) => {
    if (!window.confirm('Delete this announcement?')) return;
    try { await axios.delete(`/api/announcements/${a._id}`); notify('Deleted.'); }
    catch (err) { setError(err.response?.data?.error || 'Could not delete'); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Company notice board</p>
        </div>
        {canManage && <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ New Announcement</button>}
      </div>

      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon">📣</div>
          <div style={{ fontWeight: 600 }}>No announcements yet</div>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(a => (
            <div key={a._id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                  {a.pinned && <span style={{ marginRight: 6 }}>📌</span>}{a.title}
                </div>
                {canManage && <button className="btn btn-sm btn-secondary" onClick={() => del(a)}>Delete</button>}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text)', margin: '8px 0', whiteSpace: 'pre-wrap' }}>{a.body}</p>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                {new Date(a.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <NewAnnouncementModal onClose={() => setShowNew(false)} onDone={notify} />}
    </div>
  );
}
