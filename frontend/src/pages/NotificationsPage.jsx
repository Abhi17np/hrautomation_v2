import { useState, useEffect } from 'react';
import axios from 'axios';

const TYPE_ICON = {
  leave: '▤', document: '⬡', payslip: '₹', exit: '⇥',
  appointment_order: '◈', expense: '◧', asset: '▥', system: '❖',
};

const TYPE_LABEL = {
  leave: 'Leave', document: 'Documents', payslip: 'Payslip', exit: 'Exit & Relieving',
  appointment_order: 'Appointment Order', expense: 'Expense', asset: 'Asset', system: 'System',
};

export default function NotificationsPage() {
  const [data, setData] = useState({ notifications: [], unread_count: 0 });
  const [loading, setLoading] = useState(true);

  const load = () => {
    axios.get('/api/notifications/')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openItem = n => {
    if (!n.read) axios.post(`/api/notifications/${n._id}/mark-read`).then(load).catch(() => {});
    if (n.link) window.location.hash = n.link;
  };

  const markAll = () => {
    axios.post('/api/notifications/mark-all-read').then(load).catch(() => {});
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Notifications</div>
          <div className="page-subtitle">
            {data.unread_count > 0 ? `${data.unread_count} unread` : 'All caught up'}
          </div>
        </div>
        {data.unread_count > 0 && (
          <button className="btn btn-secondary" onClick={markAll}>Mark all as read</button>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}><p>Loading…</p></div>
        ) : data.notifications.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <p style={{ margin: 0 }}>No notifications yet</p>
          </div>
        ) : data.notifications.map(n => (
          <div
            key={n._id}
            onClick={() => openItem(n)}
            style={{
              padding: '14px 18px', borderBottom: '1px solid var(--surface-2)',
              cursor: n.link ? 'pointer' : 'default',
              background: n.read ? 'transparent' : 'var(--accent-dim)',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}
          >
            <span style={{ fontSize: 17, flexShrink: 0, marginTop: 2 }}>{TYPE_ICON[n.type] || TYPE_ICON.system}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>{n.title || TYPE_LABEL[n.type] || 'Notification'}</span>
                <span style={{ color: 'var(--text-faint)', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: 13, marginTop: 3 }}>{n.message}</div>
            </div>
            {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 6 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
