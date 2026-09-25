import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const NAV_HR = [
  { to: '/', icon: '⊞', label: 'Dashboard' },
  { to: '/employees', icon: '◎', label: 'Employees' },
  { group: 'Onboarding', icon: '⌘', items: [
      { to: '/templates', label: 'Templates' },
      { to: '/letters', label: 'Offer Letters' },
      { to: '/appointment', label: 'Appointment Orders' },
  ] },
  { to: '/approvals', icon: '✓', label: 'Approvals' },
  { to: '/exit', icon: '⇥', label: 'Exit & Relieving' },
  { to: '/leave-management', icon: '▤', label: 'Leave Management' },
  { group: 'Attendance', icon: '◷', items: [
      { to: '/attendance/web-login', label: 'Web Login' },
      { to: '/attendance', label: 'Biometric' },
      { to: '/attendance/holidays', label: 'Holidays' },
      { to: '/attendance/incidents', label: 'Incident History' },
      { to: '/attendance/configuration', label: 'Configuration' },
      { to: '/attendance/shift-summary', label: 'Shift Summary' },
  ] },
  { group: 'Payroll', icon: '₹', items: [
      { to: '/payslip-management', label: 'Payslips' },
      { to: '/payroll/run', label: 'Run Payroll' },
      { to: '/payroll/settings', label: 'Statutory Settings' },
  ] },
  { to: '/expenses', icon: '⊟', label: 'Expense Claims' },
  { to: '/support', icon: '☎', label: 'HRM Support' },
  { group: 'Organization', icon: '▣', items: [
      { to: '/announcements', label: 'Announcements' },
      { to: '/policies', label: 'Policies' },
      { to: '/organization/assets', label: 'Assets' },
      { to: '/organization/org-chart', label: 'Org Chart' },
      { to: '/organization/reports', label: 'Reports' },
      { to: '/organization/analytics', label: 'Analytics' },
      { to: '/organization/integrations', label: 'Integrations' },
      { to: '/organization/roles', label: 'Roles & Permissions' },
      { to: '/organization/workflows', label: 'Approval Workflows' },
      { to: '/organization/audit-log', label: 'Audit Log' },
  ] },
];
const NAV_EMPLOYEE = [
  { to: '/', icon: '▦', label: 'Dashboard' },
  { to: '/announcements', icon: '※', label: 'Announcements' },
  { to: '/policies', icon: '§', label: 'Policies' },
  { to: '/letters', icon: '◎', label: 'My Offer Letters' },
  { to: '/appointment', icon: '◈', label: 'Appointment Order' },
  { to: '/documents', icon: '⬡', label: 'My Documents' },
  { to: '/exit', icon: '⇥', label: 'Exit & Relieving' },
  { to: '/leave-tracker', icon: '▤', label: 'Leave Tracker' },
  { to: '/attendance', icon: '◷', label: 'Attendance' },
  { to: '/payslip', icon: '₹', label: 'Payslips' },
  { to: '/expenses', icon: '⊟', label: 'Expense Claims' },
  { to: '/support', icon: '☎', label: 'HRM Support' },
];

const NAV_MANAGER = [
  { to: '/', icon: '▦', label: 'Dashboard' },
  { to: '/announcements', icon: '※', label: 'Announcements' },
  { to: '/policies', icon: '§', label: 'Policies' },
  { to: '/letters', icon: '◎', label: 'My Offer Letters' },
  { to: '/appointment', icon: '◈', label: 'Appointment Order' },
  { to: '/documents', icon: '⬡', label: 'My Documents' },
  { to: '/exit', icon: '⇥', label: 'Exit & Relieving' },
  { to: '/approvals', icon: '✓', label: 'Approvals' },
  { to: '/leave-tracker', icon: '▤', label: 'Leave Tracker' },
  { to: '/attendance', icon: '◷', label: 'Attendance' },
  { to: '/payslip-management', icon: '₹', label: 'Payslips' },
  { to: '/expenses', icon: '⊟', label: 'Expense Claims' },
  { to: '/support', icon: '☎', label: 'HRM Support' },
];

const ROLE_COLOR = {
  admin: '#3E7BFA',
  hr_head: '#3E7BFA',
  hr: '#27AE60',
  manager: '#7C6FE0',
  employee: '#0E9F94',
};

const ROLE_BG = {
  admin: 'rgba(62,123,250,.10)',
  hr_head: 'rgba(62,123,250,.10)',
  hr: 'rgba(39,174,96,.10)',
  manager: 'rgba(124,111,224,.10)',
  employee: 'rgba(14,159,148,.10)',
};

const TABS = ['Personal', 'Corporate', 'Emergency', 'Password', 'Accounts'];

// ─── NavLink — logic identical, styles updated ────────────────────────────
function NavLink({ to, icon, label, currentPath, badge }) {
  const isActive = currentPath === to;
  return (
    <button
      onClick={() => { window.location.hash = to; }}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%',
        padding: '11px 12px', borderRadius: 12, marginBottom: 1,
        fontSize: 13, fontWeight: isActive ? 600 : 500,
        color: isActive ? '#3E7BFA' : '#8A94A6',
        background: isActive ? '#ECF2FE' : 'transparent',
        border: 'none',
        transition: 'background .15s, color .15s', cursor: 'pointer', textAlign: 'left',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.color = '#232B3A';
          e.currentTarget.style.background = '#F0F5FE';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.color = '#8A94A6';
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <span style={{
        width: 20, height: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, flexShrink: 0,
        opacity: isActive ? 1 : 0.7,
      }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge > 0 && (
        <span style={{
          background: '#EB5757', color: '#fff',
          fontSize: 10, fontWeight: 700,
          borderRadius: 99, minWidth: 18, height: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 5px', lineHeight: 1, flexShrink: 0,
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

// ─── NavGroup — collapsible section with sub-items ─────────────────────────
function NavGroup({ group, icon, items, currentPath }) {
  const containsActive = items.some(it => it.to === currentPath);
  const [open, setOpen] = useState(containsActive);

  // Auto-expand when navigation lands on one of this group's items.
  useEffect(() => { if (containsActive) setOpen(true); }, [containsActive]);

  return (
    <div style={{ marginBottom: 1 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 11, width: '100%',
          padding: '11px 12px', borderRadius: 12,
          fontSize: 13, fontWeight: containsActive ? 600 : 500,
          color: containsActive ? '#3E7BFA' : '#8A94A6',
          background: 'transparent', border: 'none',
          transition: 'background .15s, color .15s', cursor: 'pointer', textAlign: 'left',
        }}
        onMouseEnter={e => { if (!containsActive) e.currentTarget.style.background = '#F0F5FE'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{
          width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, flexShrink: 0, opacity: containsActive ? 1 : 0.7,
        }}>
          {icon}
        </span>
        <span style={{ flex: 1 }}>{group}</span>
        <span style={{
          fontSize: 10, color: '#AEB7C4', flexShrink: 0,
          transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s',
        }}>
          ›
        </span>
      </button>
      {open && (
        <div style={{ marginLeft: 18, borderLeft: '1.5px solid #EEF1F6', paddingLeft: 6 }}>
          {items.map(item => (
            <NavLink key={item.to} {...item} currentPath={currentPath} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Field — logic identical ───────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', half }) {
  return (
    <div className="form-group" style={{ margin: 0, gridColumn: half ? 'auto' : '1 / -1' }}>
      <label className="form-label">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

// ─── NotificationBell — unified notification center dropdown ──────────────
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = () => {
    axios.get('/api/notifications/')
      .then(r => { setNotifs(r.data.notifications || []); setUnread(r.data.unread_count || 0); })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  const markAllRead = async () => {
    await axios.post('/api/notifications/mark-all-read');
    setNotifs(n => n.map(x => ({ ...x, read: true })));
    setUnread(0);
  };

  const openNotif = async (n) => {
    if (!n.read) {
      await axios.post(`/api/notifications/${n._id}/read`);
      setNotifs(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
      setUnread(u => Math.max(0, u - 1));
    }
    if (n.link) window.location.hash = n.link.replace(/^#/, '');
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        style={{
          width: 32, height: 32, borderRadius: 10, border: '1px solid #EEF1F6',
          background: '#fff', cursor: 'pointer', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#5B6576',
        }}
        title="Notifications"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M13.7 20a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#EB5757', color: '#fff', fontSize: 9.5, fontWeight: 700,
            borderRadius: 99, minWidth: 16, height: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '0 4px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 38, right: 0, width: 320, maxHeight: 400, overflowY: 'auto',
            background: '#fff', borderRadius: 12, border: '1px solid #EEF1F6',
            boxShadow: '0 12px 32px rgba(31,62,133,.16)', zIndex: 999,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #EEF1F6' }}>
              <span style={{ fontWeight: 700, fontSize: 12.5 }}>Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#3E7BFA', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  Mark all read
                </button>
              )}
            </div>
            {notifs.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#8A94A6', fontSize: 12 }}>No notifications yet</div>
            ) : notifs.map(n => (
              <div key={n._id} onClick={() => openNotif(n)} style={{
                padding: '10px 14px', borderBottom: '1px solid #F3F6FC', cursor: 'pointer',
                background: n.read ? '#fff' : '#F0F5FE',
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#232B3A' }}>{n.title}</div>
                {n.message && <div style={{ fontSize: 11.5, color: '#8A94A6', marginTop: 2 }}>{n.message}</div>}
                <div style={{ fontSize: 10, color: '#AEB7C4', marginTop: 3, fontFamily: 'var(--mono)' }}>
                  {new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ProfileModal — all logic identical, styles updated ───────────────────
function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [acctLoading, setAcctLoading] = useState(false);
  const [acctForm, setAcctForm] = useState({ name: '', email: '', role: 'hr' });
  const [acctSaving, setAcctSaving] = useState(false);
  const [acctError, setAcctError] = useState('');
  const [acctSuccess, setAcctSuccess] = useState('');
  const REQUIRED_FIELDS = ['name', 'phone', 'personal_email', 'gender', 'blood_group', 'birthday', 'address'];

  const isProfileComplete = (u) => u && REQUIRED_FIELDS.every(k => u[k] && String(u[k]).trim() !== '');

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    personal_email: user?.personal_email || user?.email || '',
    gender: user?.gender || '',
    blood_group: user?.blood_group || '',
    birthday: user?.birthday || '',
    address: user?.address || '',
    emergency_contact_name: user?.emergency_contact_name || '',
    emergency_contact_phone: user?.emergency_contact_phone || '',
    emergency_contact_relation: user?.emergency_contact_relation || '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // const REQUIRED_FIELDS = ['name', 'phone', 'personal_email', 'gender', 'blood_group', 'birthday', 'address'];

  const missingFields = REQUIRED_FIELDS.filter(k => !form[k] || String(form[k]).trim() === '');

  const save = async () => {
    if (missingFields.length > 0) {
      setError(`Please fill all required fields: ${missingFields.map(k => ({
        name: 'Full Name', phone: 'Phone Number', personal_email: 'Personal Email',
        gender: 'Gender', blood_group: 'Blood Group', birthday: 'Date of Birth',
        address: 'Residential Address',
      }[k] || k)).join(', ')}`);
      return;
    }
    setError(''); setSuccess('');
    setSaving(true);
    try {
      await axios.put('/api/auth/profile', form);
      // Re-fetch full profile so gate re-evaluates with all fields including employee data
      const fresh = await axios.get('/api/auth/profile');
      const merged = { ...form, ...fresh.data };
      updateUser(merged);
      setForm(merged);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const loadAccounts = async () => {
    setAcctLoading(true);
    try {
      const r = await axios.get('/api/auth/users');
      setAccounts((r.data || []).filter(u => ['hr', 'hr_head'].includes(u.role)));
    } catch { }
    finally { setAcctLoading(false); }
  };

  const createAccount = async () => {
    setAcctError(''); setAcctSuccess('');
    if (!acctForm.name || !acctForm.email) {
      setAcctError('Name and email are required.'); return;
    }
    setAcctSaving(true);
    try {
      const res = await axios.post('/api/auth/users', acctForm);
      setAcctSuccess(res.data.invite_url
        ? `Invite created for ${acctForm.email} — SMTP isn't configured, share this link: ${res.data.invite_url}`
        : `Invite emailed to ${acctForm.email}`);
      setAcctForm({ name: '', email: '', role: 'hr' });
      loadAccounts();
      setTimeout(() => setAcctSuccess(''), 8000);
    } catch (e) {
      setAcctError(e.response?.data?.error || 'Failed to create account');
    } finally { setAcctSaving(false); }
  };

  const deleteAccount = async (id, name) => {
    if (!window.confirm(`Delete account for ${name}? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/auth/users/${id}`);
      setAccounts(a => a.filter(u => u._id !== id));
    } catch (e) {
      setAcctError(e.response?.data?.error || 'Failed to delete account');
    }
  };

  useEffect(() => { if (tab === 4 && user?.role === 'admin') loadAccounts(); }, [tab]);

  const rc = ROLE_COLOR[user?.role] || '#3E7BFA';
  const rbg = ROLE_BG[user?.role] || 'rgba(62,123,250,.10)';

  const changePassword = async () => {
    setPwError(''); setPwSuccess('');
    if (!pwForm.current_password || !pwForm.new_password || !pwForm.confirm_password) {
      setPwError('Please fill all password fields.'); return;
    }
    if (pwForm.new_password.length < 6) {
      setPwError('New password must be at least 6 characters.'); return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError('New passwords do not match.'); return;
    }
    setPwSaving(true);
    try {
      await axios.put('/api/auth/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwSuccess('Password changed successfully!');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setPwSuccess(''), 3000);
    } catch (e) {
      setPwError(e.response?.data?.error || 'Failed to change password');
    } finally { setPwSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => {
      if (e.target !== e.currentTarget) return;
      // Block closing if profile is incomplete for employee/manager
      const isGated = ['employee', 'manager'].includes(user?.role) && missingFields.length > 0;
      if (!isGated) onClose();
    }}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>

        {/* Header */}
        <div style={{ padding: '22px 24px 0', background: '#fff', borderBottom: '1px solid #EEF1F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>

            {/* Avatar */}
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              background: rbg, border: `2px solid ${rc}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: rc,
              fontFamily: 'var(--display)',
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>

            {/* Name + role */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--display)', fontWeight: 700,
                fontSize: 15.5, color: '#232B3A', letterSpacing: '-0.3px',
              }}>
                {user?.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                  textTransform: 'uppercase', color: rc,
                  background: rbg, padding: '2px 8px', borderRadius: 99,
                  border: `1px solid ${rc}30`,
                }}>
                  {user?.role}
                </span>
                {user?.emp_code && (
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: '#AEB7C4' }}>
                    {user.emp_code}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: '#8A94A6', marginTop: 3 }}>
                {user?.email}
              </div>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 7,
                border: '1px solid #EEF1F6', background: 'transparent',
                color: '#8A94A6', cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .13s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F5F7FA'; e.currentTarget.style.color = '#232B3A'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8A94A6'; }}
            >
              ✕
            </button>
          </div>

          {/* Tab strip */}
          <div style={{ display: 'flex' }}>
            {TABS.filter(t => t !== 'Accounts' || user?.role === 'admin').map((t, i) => {
              const realIdx = TABS.indexOf(t);
              return (
                <button
                  key={t}
                  onClick={() => setTab(realIdx)}
                  style={{
                    padding: '8px 18px', fontSize: 12.5, fontWeight: 600,
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: `2px solid ${tab === realIdx ? '#3E7BFA' : 'transparent'}`,
                    color: tab === realIdx ? '#3E7BFA' : '#8A94A6',
                    transition: 'all .13s', letterSpacing: '-0.1px',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Alerts */}
        {error && <div className="alert alert-error" style={{ margin: '14px 24px 0' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ margin: '14px 24px 0' }}>{success}</div>}

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>

          {/* Personal */}
          {tab === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Full Name *" value={form.name} onChange={v => set('name', v)} half />
              <Field label="Phone Number *" value={form.phone} onChange={v => set('phone', v)} half />
              <Field label="Work Email *" value={form.personal_email} onChange={v => set('personal_email', v)} type="email" half />
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Gender *</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Select…</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Blood Group *</label>
                <select value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
                  <option value="">Select…</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <Field label="Date of Birth *" value={form.birthday} onChange={v => set('birthday', v)} type="date" half />
              {/* Joining Date — read only from employee record */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Joining Date</label>
                <input value={(() => {
                  const d = user?.joining_date;
                  if (!d || d === '—') return '—';
                  // Handle DD-MM-YYYY format from backend
                  const parts = d.split(/[-/]/);
                  if (parts.length === 3 && parts[0].length === 2) {
                    return `${parts[0]}-${parts[1]}-${parts[2]}`;
                  }
                  try {
                    const parsed = new Date(d);
                    if (!isNaN(parsed)) return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  } catch { }
                  return d;
                })()} readOnly
                  style={{ background: 'var(--surface-2)', color: 'var(--text-dim)', cursor: 'not-allowed' }} />
              </div>
              <Field label="Residential Address *" value={form.address} onChange={v => set('address', v)} />
            </div>
          )}

          {/* Corporate */}
          {tab === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Personal Email', user?.email],
                ['Employee ID', user?.emp_code],
                ['Designation', user?.designation],
                ['Department', user?.department],
                ['Joining Date', user?.joining_date],
                ['Role', user?.role],
              ].map(([label, val]) => (
                <div key={label} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{label}</label>
                  <input
                    value={val || '—'} readOnly
                    style={{ background: '#F3F6FC', color: '#AEB7C4', cursor: 'not-allowed', border: '1.5px solid #EEF1F6' }}
                  />
                </div>
              ))}
              <div style={{
                gridColumn: '1 / -1', padding: '10px 14px',
                background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: 8, fontSize: 12, color: '#3E7BFA', fontWeight: 500,
              }}>
                Corporate details are managed by HR and cannot be edited here.
              </div>
            </div>
          )}

          {/* Emergency */}
          {tab === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Contact Name" value={form.emergency_contact_name} onChange={v => set('emergency_contact_name', v)} half />
              <Field label="Contact Phone" value={form.emergency_contact_phone} onChange={v => set('emergency_contact_phone', v)} half />
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Relation</label>
                <select value={form.emergency_contact_relation}
                  onChange={e => set('emergency_contact_relation', e.target.value)}>
                  <option value="">Select…</option>
                  {['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div style={{
                gridColumn: '1 / -1', padding: '10px 14px',
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: 8, fontSize: 12, color: '#d97706', fontWeight: 500,
              }}>
                This information is used only in case of emergency and kept strictly confidential.
              </div>
            </div>
          )}

          {/* Password */}
          {tab === 3 && (
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {pwError && <div className="alert alert-error">{pwError}</div>}
              {pwSuccess && <div className="alert alert-success">{pwSuccess}</div>}
              <div style={{ padding: '12px 16px', background: '#f0f4ff', borderRadius: 8, fontSize: 12.5, color: '#374151', lineHeight: 1.6 }}>
                Choose a strong password with at least 6 characters. You'll need to log in again after changing it.
              </div>
              {[
                { label: 'Current Password', key: 'current_password', placeholder: 'Enter your current password' },
                { label: 'New Password', key: 'new_password', placeholder: 'Enter new password (min 6 chars)' },
                { label: 'Confirm Password', key: 'confirm_password', placeholder: 'Re-enter new password' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{label} *</label>
                  <input
                    type="password"
                    value={pwForm[key]}
                    onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    autoComplete="new-password"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Accounts — admin only */}
          {tab === 4 && user?.role === 'admin' && (
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Existing accounts list */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                  HR Accounts
                </div>
                {acctLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: 13 }}>Loading…</div>
                ) : accounts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: 13 }}>No HR accounts found</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {accounts.map(acc => (
                      <div key={acc._id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', background: '#F3F6FC',
                        border: '1px solid #EEF1F6', borderRadius: 9,
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: acc.role === 'hr_head' ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'linear-gradient(135deg,#10b981,#059669)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 12, fontWeight: 700,
                        }}>
                          {acc.name?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#232B3A' }}>{acc.name}</div>
                          <div style={{ fontSize: 11.5, color: '#8A94A6', fontFamily: 'monospace' }}>{acc.email}</div>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8,
                          padding: '2px 8px', borderRadius: 99,
                          background: acc.role === 'hr_head' ? '#eef4ff' : '#ecfdf5',
                          color: acc.role === 'hr_head' ? '#3538cd' : '#0a7c4f',
                          border: `1px solid ${acc.role === 'hr_head' ? '#c7d7fe' : '#a7f3d0'}`,
                        }}>
                          {acc.role === 'hr_head' ? 'HR Head' : 'HR'}
                        </span>
                        <button onClick={() => deleteAccount(acc._id, acc.name)} style={{
                          width: 28, height: 28, border: '1px solid #fecdd3', borderRadius: 7,
                          background: '#fff1f3', color: '#c01048', cursor: 'pointer',
                          fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all .13s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#c01048'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff1f3'; e.currentTarget.style.color = '#c01048'; }}
                          title="Delete account"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: '#EEF1F6' }} />

              {/* Create account form */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                  Create New Account
                </div>
                {acctError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{acctError}</div>}
                {acctSuccess && <div className="alert alert-success" style={{ marginBottom: 12 }}>{acctSuccess}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Full Name', key: 'name', type: 'text', placeholder: 'e.g. Priya Sharma' },
                    { label: 'Email', key: 'email', type: 'email', placeholder: 'e.g. priya@infopace.com' },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{label} *</label>
                      <input
                        type={type}
                        value={acctForm[key]}
                        onChange={e => setAcctForm(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Role *</label>
                    <select value={acctForm.role} onChange={e => setAcctForm(p => ({ ...p, role: e.target.value }))}>
                      <option value="hr">HR (Recruiter)</option>
                      <option value="hr_head">HR Head (Manager)</option>
                    </select>
                  </div>
                </div>
                <p style={{ fontSize: 11.5, color: '#8A94A6', margin: '10px 0 0' }}>
                  They'll get an email to set their own password — no password is set here.
                </p>
                <button
                  onClick={createAccount}
                  disabled={acctSaving}
                  style={{
                    marginTop: 8, padding: '9px 20px',
                    background: 'linear-gradient(135deg,#444ce7,#6172f3)',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    color: '#fff', cursor: 'pointer', width: '100%',
                    opacity: acctSaving ? 0.6 : 1,
                  }}
                >
                  {acctSaving ? 'Sending invite…' : '+ Invite Account'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid #EEF1F6',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          background: '#F3F6FC', position: 'sticky', bottom: 0,
        }}>
          {(!['employee', 'manager'].includes(user?.role) || missingFields.length === 0) && (
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          )}
          {tab === 3 ? (
            <button className="btn btn-primary" onClick={changePassword} disabled={pwSaving}>
              {pwSaving ? 'Changing…' : 'Change Password'}
            </button>
          ) : tab === 4 ? null : tab !== 1 && (
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────
const REQUIRED_PROFILE_FIELDS = ['name', 'phone', 'personal_email', 'gender', 'blood_group', 'birthday', 'address'];

const isProfileComplete = (u) =>
  u && REQUIRED_PROFILE_FIELDS.every(k => u[k] && String(u[k]).trim() !== '');

export default function Layout({ children, currentPath }) {
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [approvalCount, setApprovalCount] = useState(0);
  const rc = ROLE_COLOR[user?.role] || '#4f8ef7';

  const needsProfileGate = ['employee', 'manager'].includes(user?.role) && !isProfileComplete(user);
  const rbg = ROLE_BG[user?.role] || 'rgba(62,123,250,.10)';

  // Fetch total pending approval count for sidebar badge (only when logged in)
  useEffect(() => {
    if (!user?._id || user.role === 'employee') return;
    const role = user.role;
    const isMgr = role === 'manager';
    const isHR = ['admin', 'hr_head', 'hr'].includes(role);

    Promise.all([
      isHR ? axios.get('/api/approvals/pending').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      isHR ? axios.get('/api/appointment-orders/').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      isHR ? axios.get('/api/documents/submissions?status=pending_hr').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      isMgr ? axios.get('/api/approvals/pending').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      isMgr ? axios.get('/api/exit/pending-approvals').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ]).then(([pending, ao, docs, mgrPending, resign]) => {
      const pendingCount = (pending.data || []).length;
      const aoCount = (ao.data || []).filter(o => o.status === 'pending_hr_head').length;
      const docsCount = (docs.data || []).length;
      const resignCount = (resign.data || []).length;
      setApprovalCount(pendingCount + aoCount + docsCount + resignCount);
    });
  }, [user?._id]);

  const canManageRoles = (user?.permissions || []).includes('roles.manage');
  const canManageWorkflows = (user?.permissions || []).includes('workflows.manage');
  const canViewAudit = (user?.permissions || []).includes('audit.view');
  const canRunPayroll = (user?.permissions || []).includes('payroll.run');
  const canConfigurePayroll = (user?.permissions || []).includes('payroll.configure');
  const canViewReports = (user?.permissions || []).includes('reports.view');
  const canManageIntegrations = (user?.permissions || []).includes('integrations.manage');
  const NAV = (user?.role === 'employee' ? NAV_EMPLOYEE
    : user?.role === 'manager' ? NAV_MANAGER
      : NAV_HR
  ).map(item => item.group
    ? { ...item, items: item.items.filter(it =>
        (it.to !== '/organization/roles' || canManageRoles) &&
        (it.to !== '/organization/workflows' || canManageWorkflows) &&
        (it.to !== '/organization/audit-log' || canViewAudit) &&
        (it.to !== '/payroll/run' || canRunPayroll) &&
        (it.to !== '/payroll/settings' || canConfigurePayroll) &&
        (it.to !== '/organization/analytics' || canViewReports) &&
        (it.to !== '/organization/integrations' || canManageIntegrations)
      ) }
    : item
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F3F6FC' }}>

      {/* ══ Sidebar ══ */}
      <aside style={{
        width: 224, flexShrink: 0,
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 8px 24px rgba(113,144,175,.12)',
        margin: '16px 8px 16px 16px',
        height: 'calc(100vh - 32px)',
        display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box',
      }}>

        {/* Logo */}
        <div style={{
          padding: '18px 16px 16px',
          borderBottom: '1px solid #EEF1F6',
          display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <img
            src="/infopace-logo.webp"
            alt="Logo"
            style={{
              height: 34, width: 'auto', maxWidth: 74, flexShrink: 0,
              objectFit: 'contain'
            }}
          />
          <div>
            <div style={{
              fontFamily: 'var(--display)', fontWeight: 600,
              fontSize: 14, color: '#232B3A', lineHeight: 1.2,
            }}>
              HR Automation
            </div>
            <div style={{
              fontSize: 9.5, color: '#8A94A6',
              fontFamily: 'var(--mono)', marginTop: 2,
              textTransform: 'uppercase', letterSpacing: '1px',
            }}>
              {user?.role === 'employee' ? 'Employee Portal'
                : user?.role === 'manager' ? 'Manager Portal'
                  : 'Infopace '}
            </div>
          </div>
          </div>
          <NotificationBell />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
          <div style={{
            fontSize: 9.5, fontWeight: 700, color: '#AEB7C4',
            textTransform: 'uppercase', letterSpacing: '1.2px',
            padding: '8px 12px 5px',
          }}>
            Menu
          </div>
          {NAV.map(item => item.group ? (
            <NavGroup key={item.group} {...item} currentPath={currentPath} />
          ) : (
            <NavLink
              key={item.to}
              {...item}
              currentPath={currentPath}
              badge={item.to === '/approvals' ? approvalCount : 0}
            />
          ))}
        </nav>

        {/* User block */}
        <div style={{ padding: '10px 10px 12px', borderTop: '1px solid #EEF1F6' }}>

          {/* Profile button — click handler unchanged */}
          <button
            onClick={() => setShowProfile(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', marginBottom: 6,
              padding: '8px 10px', borderRadius: 12,
              background: 'transparent', border: 'none',
              cursor: 'pointer', transition: 'background .13s', textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F0F5FE'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Avatar */}
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: rbg, border: `1.5px solid ${rc}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, color: rc,
              fontFamily: 'var(--display)',
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>

            {/* Name / role */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: '#232B3A',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.name}
              </div>
              <div style={{
                fontSize: 10.5, color: '#8A94A6', fontFamily: 'var(--mono)',
                textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 1,
              }}>
                {user?.role}
              </div>
            </div>

            <span style={{ fontSize: 12, color: '#AEB7C4', flexShrink: 0 }}>›</span>
          </button>

          {/* Sign out — click handler unchanged */}
          <button
            onClick={() => { logout(); window.location.hash = '/'; }}
            style={{
              width: '100%', padding: '10px 10px', borderRadius: 12,
              background: 'transparent', border: 'none',
              color: '#8A94A6', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'background .13s, color .13s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#EB5757';
              e.currentTarget.style.background = '#FDECEA';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#8A94A6';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ fontSize: 12 }}>⇥</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* ══ Main ══ */}
      <main style={{
        flex: 1, overflow: 'auto',
        background: '#F3F6FC',
        padding: '16px 24px 32px 8px',
      }}>
        {children}
      </main>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* ── Mandatory profile gate ── */}
      {/* ── Mandatory profile gate ── */}
      {needsProfileGate && !showProfile && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(35,43,58,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16,
            padding: '32px 36px', maxWidth: 480, width: '92%',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>
                Complete Your Profile
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                Please fill in all your personal details before continuing.
                This information is required to proceed.
              </p>
            </div>

            <div style={{
              background: 'var(--surface-2)', borderRadius: 10,
              padding: '14px 18px', marginBottom: 24,
            }}>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 10 }}>
                Missing Fields
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {REQUIRED_PROFILE_FIELDS
                  .filter(k => !user?.[k] || String(user[k]).trim() === '')
                  .map(k => ({
                    name: 'Full Name', phone: 'Phone Number',
                    personal_email: 'Personal Email', gender: 'Gender',
                    blood_group: 'Blood Group', birthday: 'Date of Birth',
                    address: 'Residential Address',
                  }[k] || k))
                  .map(label => (
                    <span key={label} style={{
                      padding: '3px 10px', borderRadius: 20,
                      background: 'rgba(235,87,87,.1)',
                      border: '1px solid rgba(235,87,87,.25)',
                      fontSize: 12, color: '#EB5757',
                    }}>
                      {label}
                    </span>
                  ))}
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px 0', fontSize: 14 }}
              onClick={() => setShowProfile(true)}
            >
              Fill in My Details →
            </button>
          </div>
        </div>
      )}

      {/* Profile modal renders on top of gate with higher z-index */}
      {needsProfileGate && showProfile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
          <ProfileModal onClose={() => setShowProfile(false)} />
        </div>
      )}
    </div>
  );
}
