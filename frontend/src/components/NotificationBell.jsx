import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const TYPE_ICON = {
  leave: '▤', document: '⬡', payslip: '💰', exit: '⇥',
  appointment_order: '◈', expense: '🧾', asset: '💻', system: '🔔',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread_count: 0 });
  const ref = useRef(null);

  const load = () => axios.get('/api/notifications/').then(r => setData(r.data)).catch(() => {});

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickAway = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  const togglePanel = () => {
    setOpen(o => !o);
    if (!open && data.unread_count > 0) {
      axios.post('/api/notifications/mark-all-read').then(load).catch(() => {});
    }
  };

  const openItem = n => {
    if (!n.read) axios.post(`/api/notifications/${n._id}/mark-read`).then(load).catch(() => {});
    setOpen(false);
    if (n.link) window.location.hash = n.link;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn-secondary"
        onClick={togglePanel}
        aria-label="Notifications"
        style={{ width: 36, height: 36, padding: 0, borderRadius: 9, position: 'relative', fontSize: 15 }}
      >
        🔔
        {data.unread_count > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 'var(--radius-full)',
            background: 'var(--red)', color: '#fff', fontSize: 9.5, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
          }}>{data.unread_count > 99 ? '99+' : data.unread_count}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 42, width: 360, maxHeight: 440, overflowY: 'auto',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)', zIndex: 200,
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Notifications</span>
            <button
              className="btn-link"
              style={{ fontSize: 11.5, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}
              onClick={() => { setOpen(false); window.location.hash = '/notifications'; }}
            >
              View all
            </button>
          </div>
          {data.notifications.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 14px' }}>
              <p style={{ margin: 0 }}>No notifications yet</p>
            </div>
          ) : data.notifications.slice(0, 10).map(n => (
            <div
              key={n._id}
              onClick={() => openItem(n)}
              style={{
                padding: '10px 14px', borderBottom: '1px solid var(--surface-2)', fontSize: 12.5,
                cursor: n.link ? 'pointer' : 'default',
                background: n.read ? 'transparent' : 'var(--accent-dim)',
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{TYPE_ICON[n.type] || TYPE_ICON.system}</span>
              <div style={{ minWidth: 0 }}>
                {n.title && <div style={{ fontWeight: 600, marginBottom: 2 }}>{n.title}</div>}
                <div style={{ color: 'var(--text-soft, inherit)' }}>{n.message}</div>
                <div style={{ color: 'var(--text-faint)', fontSize: 10.5, marginTop: 3 }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
