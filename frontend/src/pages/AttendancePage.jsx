import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtHours(decimalHours) {
  if (decimalHours === null || decimalHours === undefined) return '—';
  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function StatusBadge({ status }) {
  const cfg = {
    present: { cls: 'badge-green', label: 'Present' },
    absent: { cls: 'badge-red', label: 'Absent' },
  }[status] || { cls: 'badge-gray', label: status };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

// ─── HR / Manager view: today's board ────────────────────────────────────────

function TodayBoard({ tab, setTab }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = () => {
    setLoading(true);
    axios.get('/api/attendance/today', { params: { date } })
      .then(r => setRows(r.data || []))
      .catch(() => notify('Failed to load attendance.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [date]);

  const syncNow = async () => {
    setSyncing(true);
    try {
      const r = await axios.post('/api/attendance/sync');
      notify(`Sync complete — ${r.data.new_punches_synced} new punch(es) processed.`);
      load();
    } catch {
      notify('Sync failed. Check the device connection.');
    } finally {
      setSyncing(false);
    }
  };

  const filtered = rows.filter(r =>
    !search ||
    r.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.employee_code?.toLowerCase().includes(search.toLowerCase())
  );

  const presentCount = rows.filter(r => r.status === 'present').length;

  return (
    <div>
      {toast && <div className="alert alert-success" style={{ marginBottom: 16 }}>{toast}</div>}

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div className="card" style={{ padding: '14px 20px', flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>Present Today</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{presentCount} / {rows.length}</div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="card" style={{ display: 'flex', gap: 8, marginBottom: 20, padding: 8, background: '#fff', width: 'fit-content' }}>
        <button className={`btn ${tab === 'today' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '10px 20px', fontSize: 14 }} onClick={() => setTab('today')}>Today</button>
        <button className={`btn ${tab === 'management' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '10px 20px', fontSize: 14 }} onClick={() => setTab('management')}>◷ Attendance Management</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Search by name or code…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ maxWidth: 170 }} />
        <button className="btn btn-secondary btn-sm" onClick={() => setDate(todayStr())}>Today</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={syncNow} disabled={syncing}>
          {syncing ? 'Syncing…' : '⟲ Sync Now'}
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Employee</th>
                <th>Login</th><th>Logout</th><th>Hours</th><th>Status</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5}>
                    <div className="empty-state">
                      <div className="empty-icon">◷</div>
                      <p>{rows.length === 0 ? 'No attendance data for this date.' : 'No employees match this filter.'}</p>
                    </div>
                  </td></tr>
                ) : filtered.map(r => (
                  <tr key={r.employee_id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.employee_name}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>{r.employee_code}</div>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{fmtTime(r.login_time)}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{fmtTime(r.logout_time)}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{fmtHours(r.hours_worked)}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Employee view: personal history ─────────────────────────────────────────

function MyAttendance() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get('/api/attendance/me')
      .then(r => setRows(r.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>Date</th><th>Login</th><th>Logout</th><th>Hours</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4}>
                <div className="empty-state">
                  <div className="empty-icon">◷</div>
                  <p>No attendance history yet.</p>
                </div>
              </td></tr>
            ) : rows.map(r => (
              <tr key={r._id}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{r.date}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{fmtTime(r.login_time)}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{fmtTime(r.logout_time)}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{fmtHours(r.hours_worked)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Employee day-by-day calendar modal ──────────────────────────────────────

const DAY_STATUS_CFG = {
  present: { bg: 'var(--green-dim)', color: 'var(--green)', label: 'Present' },
  absent: { bg: 'var(--red-dim)', color: 'var(--red)', label: 'Absent' },
  on_leave: { bg: 'var(--blue-50)', color: 'var(--blue-700)', label: 'On Leave' },
  weekend: { bg: 'var(--surface-2)', color: 'var(--text-dim)', label: 'Weekend' },
  holiday: { bg: 'var(--purple-dim)', color: 'var(--purple)', label: 'Holiday' },
  upcoming: { bg: '#fff', color: 'var(--text-dim)', label: 'Upcoming' },
};

function EmployeeCalendarModal({ employeeId, year, month, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoverDay, setHoverDay] = useState(null);

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/attendance/employee/${employeeId}/calendar`, { params: { year, month } })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [employeeId, year, month]);

  // Leading blanks so day 1 lands under the correct weekday column (Mon-first)
  const leadingBlanks = data?.days?.length ? (data.days[0].weekday) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card" style={{ width: 480, maxHeight: '85vh', overflowY: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{data.employee_name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>{data.employee_code}</div>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={onClose}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>{MONTH_NAMES[month - 1]} {year}</div>

            {/* Weekday header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 16 }}>
              {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`blank-${i}`} />)}
              {data.days.map(d => {
                const cfg = DAY_STATUS_CFG[d.status] || DAY_STATUS_CFG.upcoming;
                return (
                  <div key={d.date}
                    onMouseEnter={() => setHoverDay(d)}
                    onMouseLeave={() => setHoverDay(null)}
                    style={{
                      aspectRatio: '1', borderRadius: 8, background: cfg.bg, color: cfg.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 600, cursor: 'default',
                      border: hoverDay?.date === d.date ? `2px solid ${cfg.color}` : '1px solid transparent',
                    }}>
                    {d.day}
                  </div>
                );
              })}
            </div>

            {/* Hover detail */}
            {hoverDay && (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, minHeight: 18 }}>
                <strong>{hoverDay.date}</strong> — {DAY_STATUS_CFG[hoverDay.status]?.label}
                {hoverDay.status === 'present' && (
                  <> · {fmtTime(hoverDay.login_time)} to {fmtTime(hoverDay.logout_time)} · {fmtHours(hoverDay.hours_worked)}</>
                )}
                {hoverDay.status === 'holiday' && hoverDay.holiday_name && <> · {hoverDay.holiday_name}</>}
              </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              {Object.entries(DAY_STATUS_CFG).map(([key, cfg]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: cfg.bg, border: `1px solid ${cfg.color}` }} />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{cfg.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── HR: Regularize one employee's attendance for a specific date ───────────
function RegularizeModal({ employee, onClose, onDone }) {
  const [date, setDate] = useState(todayStr());
  const [loginTime, setLoginTime] = useState('');
  const [logoutTime, setLogoutTime] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError('');
    if (!date) return setError('Please select a date.');
    if (!remarks.trim()) return setError('Please provide a reason for this regularization.');
    setSaving(true);
    try {
      await axios.post(`/api/attendance/regularize/${employee.employee_id}`, {
        date, login_time: loginTime, logout_time: logoutTime, remarks,
      });
      onDone();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not regularize attendance');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>Regularize Attendance</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 9px' }}>✕</button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
          {employee.employee_name} <span style={{ fontFamily: 'var(--mono)' }}>({employee.employee_code})</span>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="form-group">
          <label className="form-label">Date *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="form-row" style={{ margin: '14px 0' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Login time</label>
            <input type="time" value={loginTime} onChange={e => setLoginTime(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Logout time (optional)</label>
            <input type="time" value={logoutTime} onChange={e => setLogoutTime(e.target.value)} />
          </div>
        </div>

        <div className="alert alert-info" style={{ marginBottom: 14 }}>
          <span>Leaving login time blank still marks this day as Present with a default morning time.</span>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Reason *</label>
          <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder="e.g. Biometric device missed the punch; employee confirmed present" />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Regularize'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HR view: Monthly Attendance Management report ───────────────────────────

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function MonthlySummary({ tab, setTab }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showHolidays, setShowHolidays] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [toast, setToast] = useState('');
  const [calendarTarget, setCalendarTarget] = useState(null);
  const [regularizeTarget, setRegularizeTarget] = useState(null);

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = () => {
    setLoading(true);
    axios.get('/api/attendance/monthly-summary', { params: { year, month } })
      .then(r => setData(r.data))
      .catch(() => notify('Failed to load monthly summary.'))
      .finally(() => setLoading(false));
  };

  const loadHolidays = () => {
    axios.get('/api/attendance/holidays', { params: { year } })
      .then(r => setHolidays(r.data || []))
      .catch(() => setHolidays([]));
  };

  useEffect(() => { load(); loadHolidays(); }, [year, month]);

  const addHoliday = async () => {
    if (!newHolidayDate || !newHolidayName.trim()) {
      notify('Enter both a date and a name for the holiday.');
      return;
    }
    try {
      await axios.post('/api/attendance/holidays', { date: newHolidayDate, name: newHolidayName.trim() });
      notify(`Holiday "${newHolidayName}" added.`);
      setNewHolidayDate(''); setNewHolidayName('');
      loadHolidays(); load();
    } catch {
      notify('Failed to add holiday.');
    }
  };

  const removeHoliday = async (id) => {
    try {
      await axios.delete(`/api/attendance/holidays/${id}`);
      notify('Holiday removed.');
      loadHolidays(); load();
    } catch {
      notify('Failed to remove holiday.');
    }
  };

  const rows = (data?.employees || []).filter(r =>
    !search ||
    r.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.employee_code?.toLowerCase().includes(search.toLowerCase())
  );

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  const now2 = new Date();
  const isCurrentMonth = year === now2.getFullYear() && month === now2.getMonth() + 1;
  const isFutureMonth = (year > now2.getFullYear()) || (year === now2.getFullYear() && month > now2.getMonth() + 1);
  const workingDaysLabel = isFutureMonth ? 'Working Days (Not Started)' : isCurrentMonth ? 'Working Days (So Far)' : 'Working Days This Month';

  return (
    <div>
      {toast && <div className="alert alert-success" style={{ marginBottom: 16 }}>{toast}</div>}

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div className="card" style={{ padding: '14px 20px', flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>
            {workingDaysLabel}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{data?.total_working_days ?? '—'}</div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="card" style={{ display: 'flex', gap: 8, marginBottom: 20, padding: 8, background: '#fff', width: 'fit-content' }}>
        <button className={`btn ${tab === 'today' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '10px 20px', fontSize: 14 }} onClick={() => setTab('today')}>Today</button>
        <button className={`btn ${tab === 'management' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '10px 20px', fontSize: 14 }} onClick={() => setTab('management')}>◷ Attendance Management</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Search by name or code…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
        <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ maxWidth: 160 }}>
          {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ maxWidth: 110 }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={() => setShowHolidays(s => !s)}>
          {showHolidays ? 'Hide Holidays' : '⚑ Manage Holidays'}
        </button>
      </div>

      {/* Holiday management panel */}
      {showHolidays && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Holidays in {year}</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <input type="date" value={newHolidayDate} onChange={e => setNewHolidayDate(e.target.value)} style={{ maxWidth: 170 }} />
            <input placeholder="Holiday name (e.g. Independence Day)" value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} style={{ maxWidth: 260 }} />
            <button className="btn btn-primary btn-sm" onClick={addHoliday}>+ Add Holiday</button>
          </div>
          {holidays.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>No holidays added for {year} yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {holidays.map(h => (
                <div key={h._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 6 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)', width: 100 }}>{h.date}</span>
                  <span style={{ fontSize: 13, flex: 1 }}>{h.name}</span>
                  <button className="btn btn-sm btn-secondary" onClick={() => removeHoliday(h._id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Employee</th><th>Present</th><th>On Leave</th><th>Absent</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={5}>
                    <div className="empty-state">
                      <div className="empty-icon">◷</div>
                      <p>No data for this month.</p>
                    </div>
                  </td></tr>
                ) : rows.map(r => (
                  <tr key={r.employee_id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.employee_name}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>{r.employee_code}</div>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--green)' }}>{r.present}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--blue-700)' }}>{r.on_leave}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--red)' }}>{r.absent}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => setCalendarTarget(r)}>
                          ▤ Calendar
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setRegularizeTarget(r)}>
                          ✎ Regularize
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {calendarTarget && (
        <EmployeeCalendarModal
          employeeId={calendarTarget.employee_id}
          year={year}
          month={month}
          onClose={() => setCalendarTarget(null)}
        />
      )}

      {regularizeTarget && (
        <RegularizeModal
          employee={regularizeTarget}
          onClose={() => setRegularizeTarget(null)}
          onDone={() => {
            setRegularizeTarget(null);
            notify('Attendance regularized');
            load();
          }}
        />
      )}
    </div>
  );
}

// ─── Top-level page: routes by role ──────────────────────────────────────────

export default function AttendancePage() {
  const { user } = useAuth();
  const isHR = ['admin', 'hr', 'hr_head'].includes(user?.role);
  const [tab, setTab] = useState('today'); // 'today' | 'management'

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>
        {isHR ? 'Attendance' : 'My Attendance'}
      </div>
      {isHR
        ? (tab === 'today' ? <TodayBoard tab={tab} setTab={setTab} /> : <MonthlySummary tab={tab} setTab={setTab} />)
        : <MyAttendance />}
    </div>
  );
}