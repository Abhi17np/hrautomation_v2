import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d - today) / 86400000);
}

function HolidayModal({ initial, onClose, onSaved }) {
  const [name, setName] = useState(initial?.name || '');
  const [date, setDate] = useState(initial?.date || '');
  const [type, setType] = useState(initial?.type || 'public');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim() || !date) { setError('Name and date are required'); return; }
    setSaving(true); setError('');
    try {
      if (initial) {
        await axios.put(`/api/holidays/${initial._id}`, { name, date, type });
      } else {
        await axios.post('/api/holidays/', { name, date, type });
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not save holiday');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <h3 className="modal-title">{initial ? 'Edit Holiday' : 'Add Holiday'}</h3>
        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
        <div className="form-group">
          <label className="form-label">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Republic Day" />
        </div>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="public">Public Holiday</option>
            <option value="optional">Optional Holiday</option>
          </select>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function HolidaysPage() {
  const { user } = useAuth();
  const canManage = ['admin', 'hr_head', 'hr'].includes(user?.role);
  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | holiday-object
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    axios.get('/api/holidays/', { params: { year } })
      .then(r => setHolidays(r.data))
      .catch(() => setError('Could not load holidays'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year]);

  const grouped = useMemo(() => {
    const byMonth = {};
    holidays.forEach(h => {
      const m = parseInt(h.date.split('-')[1], 10) - 1;
      (byMonth[m] = byMonth[m] || []).push(h);
    });
    return byMonth;
  }, [holidays]);

  const next = useMemo(() => {
    return holidays
      .map(h => ({ ...h, until: daysUntil(h.date) }))
      .filter(h => h.until >= 0)
      .sort((a, b) => a.until - b.until)[0];
  }, [holidays]);

  const remove = async (h) => {
    if (!window.confirm(`Delete "${h.name}"?`)) return;
    try {
      await axios.delete(`/api/holidays/${h._id}`);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not delete holiday');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Holiday Calendar</div>
          <div className="page-subtitle">
            {canManage ? 'Manage the company holiday list — it feeds directly into leave-day calculations.'
                       : 'Company holidays for the year — these days are never counted against your leave balance.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 110 }}>
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setModal('new')}>+ Add Holiday</button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {next && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, background: 'var(--accent-dim)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
          }}>📅</div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Next holiday
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--display)' }}>
              {next.name} — {new Date(next.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
              {next.until === 0 ? 'Today' : `In ${next.until} day${next.until === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state" style={{ padding: '40px 16px' }}><p>Loading…</p></div>
      ) : holidays.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 16px' }}>
          <p style={{ margin: 0 }}>No holidays recorded for {year} yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {Object.keys(grouped).sort((a, b) => a - b).map(m => (
            <div key={m} className="card" style={{ padding: 0 }}>
              <div className="card-header" style={{ padding: '12px 18px' }}>
                <div className="card-title">{MONTH_NAMES[m]}</div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Date</th><th>Day</th><th>Name</th><th>Type</th>{canManage && <th></th>}</tr>
                  </thead>
                  <tbody>
                    {grouped[m].sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                      <tr key={h._id}>
                        <td>{new Date(h.date + 'T00:00:00').getDate()}</td>
                        <td>{new Date(h.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })}</td>
                        <td style={{ fontWeight: 600 }}>{h.name}</td>
                        <td>
                          <span className={`badge ${h.type === 'optional' ? 'badge-gray' : 'badge-blue'}`}>
                            {h.type === 'optional' ? 'Optional' : 'Public'}
                          </span>
                        </td>
                        {canManage && (
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setModal(h)} style={{ marginRight: 6 }}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => remove(h)}>Delete</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <HolidayModal
          initial={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
