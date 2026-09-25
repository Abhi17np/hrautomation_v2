/**
 * DashboardPage.jsx — Role-specific dashboards (Redesigned)
 *
 * admin / hr_head  → HR Command Centre
 * manager          → Team Dashboard
 * employee         → My Portal
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const nav = (path) => { window.location.hash = path; };

function greetingFor(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const TODAY = new Date().toLocaleDateString('en-IN', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  try {
    const parts = d.split(/[-/]/);
    let date;
    if (parts.length === 3 && parts[0].length === 2) {
      date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      date = new Date(d);
    }
    if (isNaN(date)) return d;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
}

const STATUS_CONFIG = {
  active: { label: 'Active', bg: '#E9F8F0', color: '#27AE60', dot: '#34C976' },
  approved: { label: 'Approved', bg: '#E9F8F0', color: '#27AE60', dot: '#34C976' },
  issued: { label: 'Issued', bg: '#E9F8F0', color: '#27AE60', dot: '#34C976' },
  pending_hr_head: { label: 'Pending HR', bg: '#FEF3E7', color: '#F2994A', dot: '#F7B679' },
  pending_manager: { label: 'Pending Manager', bg: '#FEF3E7', color: '#F2994A', dot: '#F7B679' },
  resignation_pending: { label: 'Resignation', bg: '#FEF3E7', color: '#F2994A', dot: '#F7B679' },
  notice_period: { label: 'Notice Period', bg: '#FEF3E7', color: '#F2994A', dot: '#F7B679' },
  clearance_pending: { label: 'Clearance', bg: '#F1EEFC', color: '#7C6FE0', dot: '#9B90E8' },
  clearance_complete: { label: 'All Cleared', bg: '#ECF2FE', color: '#3E7BFA', dot: '#6E9DFC' },
  rejected: { label: 'Rejected', bg: '#FDECEA', color: '#E4574B', dot: '#EB5757' },
  exited: { label: 'Exited', bg: '#F3F6FC', color: '#5B6576', dot: '#AEB7C4' },
  inactive: { label: 'Inactive', bg: '#F3F6FC', color: '#5B6576', dot: '#AEB7C4' },
  draft: { label: 'Draft', bg: '#F3F6FC', color: '#5B6576', dot: '#AEB7C4' },
};

function Badge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status?.replace(/_/g, ' ') || '—', bg: '#F5F7FA', color: '#475569', dot: '#AEB7C4' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
// gradient prop format: "linear-gradient(...)" — we extract the accent color from it
// to pick a small icon-badge tint. The card itself stays flat white (per reference),
// no more full-card colored backgrounds.
const ACCENT_COLORS = {
  blue: { bg: '#ECF2FE', icon: '#3E7BFA' },
  green: { bg: '#E9F8F0', icon: '#27AE60' },
  amber: { bg: '#FEF3E7', icon: '#F2994A' },
  purple: { bg: '#F1EEFC', icon: '#7C6FE0' },
  orange: { bg: '#FEF3E7', icon: '#F2994A' },
  pink: { bg: '#FDECEA', icon: '#E4574B' },
  slate: { bg: '#F3F6FC', icon: '#8A94A6' },
  red: { bg: '#FDECEA', icon: '#E4574B' },
};

function getAccent(gradient) {
  if (!gradient) return ACCENT_COLORS.blue;
  if (gradient.includes('#8b5cf6') || gradient.includes('#7c3aed') || gradient.includes('#6366f1') || gradient.includes('#764ba2')) return ACCENT_COLORS.purple;
  if (gradient.includes('#10b981') || gradient.includes('#059669')) return ACCENT_COLORS.green;
  if (gradient.includes('#f59e0b') && !gradient.includes('#ef4444') && !gradient.includes('#dc2626')) return ACCENT_COLORS.amber;
  if (gradient.includes('#f97316') || gradient.includes('#ea580c')) return ACCENT_COLORS.orange;
  if (gradient.includes('#ec4899') || gradient.includes('#be185d')) return ACCENT_COLORS.pink;
  if (gradient.includes('#ef4444') || gradient.includes('#dc2626')) return ACCENT_COLORS.red;
  if (gradient.includes('#94a3b8') || gradient.includes('#64748b')) return ACCENT_COLORS.slate;
  return ACCENT_COLORS.blue;
}

// SVG icon set — clean, professional, no emojis
const ICONS = {
  users: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  check: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  clock: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  target: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
  file: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
  clipboard: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>,
  mail: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  bell: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  alert: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><triangle points="10.29 3.86 1.82 18 22.18 18" /><path d="M10.29 3.86 1.82 18 22.18 18H1.82" /><path d="M12 9v4" /><path d="M12 17h.01" /><polygon points="10.29 3.86 1.82 18 22.18 18" /></svg>,
  refresh: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>,
  folder: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
  exit: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
};

// Map old emoji strings to icon keys
function resolveIcon(icon, accentColor) {
  const color = accentColor || '#64748b';
  const map = {
    '👥': ICONS.users, '✅': ICONS.check, '⏳': ICONS.clock, '🎯': ICONS.target,
    '📄': ICONS.file, '📋': ICONS.clipboard, '✉️': ICONS.mail, '🔔': ICONS.bell,
    '⚠️': ICONS.alert, '🔄': ICONS.refresh, '🗂': ICONS.folder,
  };
  const fn = map[icon] || ICONS.file;
  return fn(color);
}

function StatCard({ value, label, sub, gradient, icon, onClick, urgent }) {
  const ac = getAccent(gradient);
  return (
    <div onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 16, padding: 20,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .18s, box-shadow .18s',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(113,144,175,.12)',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(113,144,175,.16)'; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(113,144,175,.12)'; }}
    >
      {urgent && (
        <div style={{ position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: '50%', background: '#EB5757', boxShadow: '0 0 6px #EB5757' }} />
      )}
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: ac.bg, color: ac.icon,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
      }}>
        {resolveIcon(icon, ac.icon)}
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: '#232B3A' }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: '#232B3A' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#8A94A6', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionTitle({ children, action, actionLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 3, height: 14, background: '#3E7BFA', borderRadius: 2 }} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#3D4759' }}>
          {children}
        </span>
      </div>
      {action && (
        <a onClick={action} style={{ fontSize: 12, fontWeight: 600, color: '#3E7BFA', cursor: 'pointer' }}>
          {actionLabel || 'View all →'}
        </a>
      )}
    </div>
  );
}

// ─── Pipeline Bar ─────────────────────────────────────────────────────────────
function PipelineBar({ stages }) {
  const total = stages.reduce((a, s) => a + s.count, 0) || 1;
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {stages.map(s => (
        <div key={s.label} style={{ flex: 1, minWidth: 90 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#8A94A6', fontWeight: 500 }}>{s.label}</span>
            <span style={{
              fontWeight: 700, fontSize: 12.5,
              background: s.count > 0 ? s.color + '18' : 'transparent',
              color: s.count > 0 ? s.color : '#AEB7C4',
              padding: '1px 7px', borderRadius: 6,
            }}>{s.count}</span>
          </div>
          <div style={{ height: 6, background: '#EEF1F6', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.max((s.count / total) * 100, s.count > 0 ? 5 : 0)}%`,
              background: s.color, borderRadius: 99, transition: 'width .6s cubic-bezier(.4,0,.2,1)',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 16, border: 'none',
      boxShadow: '0 8px 24px rgba(113,144,175,.12)',
      transition: onClick ? 'box-shadow .15s, transform .15s' : undefined,
      cursor: onClick ? 'pointer' : 'default',
      overflow: 'hidden',
      ...style,
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = '0 10px 28px rgba(113,144,175,.16)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.boxShadow = '0 8px 24px rgba(113,144,175,.12)'; e.currentTarget.style.transform = 'none'; } }}
    >
      {children}
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#8A94A6', textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap', background: '#F5F7FA' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #EEF1F6', transition: 'background .1s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F5F7FA'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '11px 16px', verticalAlign: 'middle', color: '#232B3A' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ padding: '36px 20px', textAlign: 'center' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%', background: '#F3F6FC', color: '#8A94A6',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
      }}>
        {resolveIcon(icon, '#8A94A6')}
      </div>
      <div style={{ fontWeight: 600, color: '#232B3A', fontSize: 13.5 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: '#8A94A6', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────
function AlertBanner({ icon, title, sub, color, btnLabel, btnColor, onBtn }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, boxShadow: '0 8px 24px rgba(113,144,175,.12)',
      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: color + '18', color: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {resolveIcon(icon, color)}
      </div>
      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: color }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: '#8A94A6', marginTop: 1 }}>{sub}</div>}
      </div>
      {btnLabel && (
        <button onClick={onBtn} style={{
          padding: '9px 20px', background: btnColor || color, border: 'none',
          borderRadius: 999, fontSize: 12.5, fontWeight: 600, color: '#fff',
          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {btnLabel}
        </button>
      )}
    </div>
  );
}

// ─── Birthdays & Anniversaries widget ──────────────────────────────────────────
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtMonthDay(month, day) {
  if (!month || !day) return '—';
  const label = MONTH_SHORT[month - 1];
  return label ? `${label} ${day}` : `${day}/${month}`;
}

function ordinal(n) {
  const v = Number(n) || 0;
  const rem100 = v % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${v}th`;
  switch (v % 10) {
    case 1: return `${v}st`;
    case 2: return `${v}nd`;
    case 3: return `${v}rd`;
    default: return `${v}th`;
  }
}

function WishItem({ item }) {
  const isBirthday = item.type === 'birthday';
  const icon = isBirthday ? '🎂' : '🎉';
  const isToday = item.days_until === 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '9px 4px',
      borderBottom: '1px solid #F5F7FA',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0, fontSize: 15,
        background: isBirthday ? '#ECF2FE' : '#F1EEFC',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#232B3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
        <div style={{ fontSize: 11.5, color: '#8A94A6', marginTop: 1 }}>
          {isBirthday ? 'Birthday' : `${ordinal(item.years)} Work Anniversary`}
        </div>
      </div>
      {isToday ? (
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: '#27AE60', background: '#E9F8F0',
          borderRadius: 99, padding: '3px 10px', flexShrink: 0, whiteSpace: 'nowrap',
        }}>Today!</span>
      ) : (
        <span style={{ fontSize: 11.5, color: '#8A94A6', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {fmtMonthDay(item.month, item.day)}
        </span>
      )}
    </div>
  );
}

function BirthdaysWidget() {
  const [wishes, setWishes] = useState({ today: [], upcoming: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/employees/wishes')
      .then(r => setWishes({ today: r.data?.today || [], upcoming: r.data?.upcoming || [] }))
      .catch(() => setWishes({ today: [], upcoming: [] }))
      .finally(() => setLoading(false));
  }, []);

  const { today, upcoming } = wishes;
  const isEmpty = !loading && today.length === 0 && upcoming.length === 0;

  return (
    <Card style={{ padding: '22px 24px' }}>
      <SectionTitle>Birthdays &amp; Anniversaries</SectionTitle>
      {loading ? (
        <div style={{ fontSize: 12.5, color: '#8A94A6', padding: '10px 4px' }}>Loading…</div>
      ) : isEmpty ? (
        <EmptyState icon="🔔" title="Nothing coming up" sub="No birthdays or work anniversaries in the next few days." />
      ) : (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {today.map(item => <WishItem key={`${item.employee_id}-${item.type}`} item={item} />)}
          {upcoming.map(item => <WishItem key={`${item.employee_id}-${item.type}`} item={item} />)}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HR HEAD / ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function HRDashboard({ user }) {
  const [data, setData] = useState({
    employees: [], letterStats: {}, aoOrders: [], exitEmployees: [],
    pendingResign: [], pendingLetters: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      axios.get('/api/employees/'),
      axios.get('/api/approvals/stats'),
      axios.get('/api/appointment-orders/'),
      axios.get('/api/exit/'),
      axios.get('/api/exit/pending-approvals'),
      axios.get('/api/approvals/pending'),
    ]).then(([emps, stats, ao, exit, resign, pending]) => {
      setData({
        employees: Array.isArray(emps.value?.data) ? emps.value.data : [],
        letterStats: (stats.value?.data && typeof stats.value.data === 'object') ? stats.value.data : {},
        aoOrders: Array.isArray(ao.value?.data) ? ao.value.data : [],
        exitEmployees: Array.isArray(exit.value?.data) ? exit.value.data : [],
        pendingResign: Array.isArray(resign.value?.data) ? resign.value.data : [],
        pendingLetters: Array.isArray(pending.value?.data) ? pending.value.data : [],
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #EEF1F6', borderTopColor: '#4f8ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 13, color: '#8A94A6' }}>Loading dashboard…</div>
      </div>
    </div>
  );

  const { employees, letterStats, aoOrders, exitEmployees, pendingResign, pendingLetters } = data;

  const active = employees.filter(e => e.status === 'active').length;
  const exiting = employees.filter(e => ['resignation_pending', 'notice_period', 'clearance_pending', 'clearance_complete'].includes(e.status)).length;
  const exited = employees.filter(e => e.status === 'exited').length;
  const totalEmp = employees.length;
  const pendingAO = aoOrders.filter(o => o.status === 'pending_hr_head').length;
  const totalAO = aoOrders.length;
  const approvedAO = aoOrders.filter(o => o.status === 'approved').length;
  const pendingLetCount = pendingLetters.length;
  const totalPending = pendingLetCount + pendingAO + pendingResign.length;
  const allCleared = exitEmployees.filter(e => e.status === 'clearance_complete').length;
  const noticePeriod = exitEmployees.filter(e => e.status === 'notice_period').length;
  const recentLetters = [...(data.pendingLetters || [])].slice(0, 5);

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: '#8A94A6', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
          HR Command Centre
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, color: '#232B3A', letterSpacing: -0.5 }}>
              {greetingFor()}, {user?.name?.split(' ')[0]}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#8A94A6' }}>{TODAY}</p>
          </div>
          {totalPending > 0 && (
            <AlertBanner
              icon="🔔"
              title={`${totalPending} items need your attention`}
              sub="Pending approvals across all modules"
              color="#ef4444"
              btnLabel="Review Now →"
              onBtn={() => nav('/approvals')}
            />
          )}
        </div>
      </div>

      {/* ── Org Snapshot ── */}
      <SectionTitle action={() => nav('/employees')} actionLabel="View employees →">Organisation Snapshot</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
        <StatCard value={totalEmp} label="Total Employees" sub="all records" gradient="linear-gradient(135deg, #4f8ef7 0%, #6366f1 100%)" icon="👥" onClick={() => nav('/employees')} />
        <StatCard value={active} label="Active" sub="currently employed" gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)" icon="✅" onClick={() => nav('/employees')} />
        <StatCard value={exiting} label="In Exit Pipeline" sub="notice to clearance" gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" icon="⏳" onClick={() => nav('/exit')} urgent={exiting > 0} />
        <StatCard value={allCleared} label="Ready to Relieve" sub="all clearances done" gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" icon="🎯" onClick={() => nav('/exit')} urgent={allCleared > 0} />
      </div>

      {/* ── Pending Actions ── */}
      <SectionTitle action={() => nav('/approvals')} actionLabel="Go to Approvals →">Pending Actions</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
        <StatCard value={pendingLetCount} label="Offer Letters" sub="awaiting HR approval" gradient="linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)" icon="📄" onClick={() => nav('/approvals')} urgent={pendingLetCount > 0} />
        <StatCard value={pendingAO} label="Appointment Orders" sub="awaiting HR approval" gradient="linear-gradient(135deg, #f97316 0%, #E4574B 100%)" icon="📋" onClick={() => nav('/approvals')} urgent={pendingAO > 0} />
        <StatCard value={pendingResign.length} label="Resignations" sub="pending approval" gradient="linear-gradient(135deg, #ec4899 0%, #E4574B 100%)" icon="✉️" onClick={() => nav('/approvals')} urgent={pendingResign.length > 0} />
      </div>

      {/* ── Two column ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>

        {/* Exit pipeline */}
        <Card style={{ padding: '22px 24px' }}>
          <SectionTitle action={() => nav('/exit')} actionLabel="Manage →">Exit Pipeline</SectionTitle>
          <PipelineBar stages={[
            { label: 'Notice Period', count: noticePeriod, color: '#f59e0b' },
            { label: 'Clearance', count: exitEmployees.filter(e => e.status === 'clearance_pending').length, color: '#ec4899' },
            { label: 'All Cleared', count: allCleared, color: '#10b981' },
            { label: 'Exited', count: exited, color: '#AEB7C4' },
          ]} />
          {allCleared > 0 && (
            <div style={{ marginTop: 16, padding: '10px 14px', background: '#E9F8F0', border: '1px solid #BEEBD1', borderRadius: 10, fontSize: 12, color: '#1F9450', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              {allCleared} employee{allCleared !== 1 ? 's' : ''} cleared — generate relieving letter
            </div>
          )}
        </Card>

        {/* Letter pipeline */}
        <Card style={{ padding: '22px 24px' }}>
          <SectionTitle action={() => nav('/letters')} actionLabel="View letters →">Offer Letter Pipeline</SectionTitle>
          <PipelineBar stages={[
            { label: 'Draft', count: letterStats.draft || 0, color: '#AEB7C4' },
            { label: 'Pending', count: letterStats.pending_hr_head || 0, color: '#f59e0b' },
            { label: 'Approved', count: letterStats.approved || 0, color: '#4f8ef7' },
            { label: 'Issued', count: letterStats.issued || 0, color: '#10b981' },
          ]} />
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Total Orders', value: totalAO, color: '#4f8ef7' },
              { label: 'Approved Orders', value: approvedAO, color: '#10b981' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: color + '0d', border: '1px solid ' + color + '30', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: '#8A94A6', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>Appointment {label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Birthdays & Anniversaries ── */}
      <div style={{ marginBottom: 20 }}>
        <BirthdaysWidget />
      </div>

      {/* ── Pending Resignations ── */}
      {pendingResign.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #F5F7FA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#232B3A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#FDECEA', borderRadius: '50%' }}>{ICONS.alert('#E4574B')}</span>
                Pending Resignations
              </div>
              <div style={{ fontSize: 12, color: '#8A94A6', marginTop: 2 }}>Requires your review and action</div>
            </div>
            <button onClick={() => nav('/approvals')} style={{ padding: '7px 16px', background: '#FDECEA', border: '1.5px solid #F7CFC9', borderRadius: 9, fontSize: 12, fontWeight: 700, color: '#E4574B', cursor: 'pointer' }}>
              Review All →
            </button>
          </div>
          <Table
            headers={['Employee', 'Designation', 'Resigned On', 'Last Working Day', 'Reason']}
            rows={pendingResign.slice(0, 5).map(e => [
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#232B3A' }}>{e.name}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#8A94A6' }}>{e.employee_id}</div>
              </div>,
              <span style={{ color: '#3D4759', fontSize: 13 }}>{e.designation}</span>,
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#3D4759' }}>{fmtDate(e.resignation_date)}</span>,
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#d97706', fontWeight: 600 }}>{fmtDate(e.last_working_day)}</span>,
              <span style={{ fontSize: 12, color: '#8A94A6' }}>{e.exit_reason || '—'}</span>,
            ])}
          />
        </Card>
      )}

      {/* ── Recent Offer Letters ── */}
      <Card>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #F5F7FA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#232B3A' }}>Recent Pending Offer Letters</div>
            <div style={{ fontSize: 12, color: '#8A94A6', marginTop: 2 }}>Submitted for your review</div>
          </div>
          <button onClick={() => nav('/approvals')} style={{ padding: '7px 16px', background: '#F3F6FC', border: '1.5px solid #EEF1F6', borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#4f8ef7', cursor: 'pointer' }}>
            View all →
          </button>
        </div>
        {recentLetters.length === 0 ? (
          <EmptyState icon="✅" title="No pending offer letters" sub="All caught up! Nothing needs your approval." />
        ) : (
          <Table
            headers={['Employee', 'Designation', 'Status', 'Submitted']}
            rows={recentLetters.map(l => [
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#232B3A' }}>{l.employee_name}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#8A94A6' }}>{l.employee_code}</div>
              </div>,
              <span style={{ color: '#3D4759', fontSize: 13 }}>{l.designation || '—'}</span>,
              <Badge status={l.status} />,
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#8A94A6' }}>{fmtDate(l.created_at)}</span>,
            ])}
          />
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MANAGER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function ManagerDashboard({ user }) {
  const [data, setData] = useState({ pendingResign: [], exitPipeline: [], aoOrders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      axios.get('/api/exit/pending-approvals'),
      axios.get('/api/exit/'),
      axios.get('/api/appointment-orders/'),
    ]).then(([resign, exit, ao]) => {
      setData({
        pendingResign: Array.isArray(resign.value?.data) ? resign.value.data : [],
        exitPipeline: Array.isArray(exit.value?.data) ? exit.value.data : [],
        aoOrders: Array.isArray(ao.value?.data) ? ao.value.data : [],
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #EEF1F6', borderTopColor: '#4f8ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 13, color: '#8A94A6' }}>Loading dashboard…</div>
      </div>
    </div>
  );

  const { pendingResign, exitPipeline, aoOrders } = data;
  const inNotice = exitPipeline.filter(e => e.status === 'notice_period').length;
  const inClearance = exitPipeline.filter(e => ['clearance_pending', 'clearance_complete'].includes(e.status)).length;
  const aoMine = aoOrders.filter(o => o.status === 'approved').length;

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: '#8A94A6', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Team Dashboard</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, color: '#232B3A', letterSpacing: -0.5 }}>
              Hi, {user?.name?.split(' ')[0]}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#8A94A6' }}>{TODAY}</p>
          </div>
          {pendingResign.length > 0 && (
            <AlertBanner
              icon="⚠️"
              title={`${pendingResign.length} resignation${pendingResign.length !== 1 ? 's' : ''} awaiting your approval`}
              sub="Action required from you as manager"
              color="#f59e0b"
              btnLabel="Review →"
              btnColor="#d97706"
              onBtn={() => nav('/approvals')}
            />
          )}
        </div>
      </div>

      {/* ── Metrics ── */}
      <SectionTitle>Team Overview</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
        <StatCard value={pendingResign.length} label="Pending Resignations" sub="need your approval" gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" icon="✉️" onClick={() => nav('/approvals')} urgent={pendingResign.length > 0} />
        <StatCard value={inNotice} label="Serving Notice" sub="in notice period" gradient="linear-gradient(135deg, #f97316 0%, #ea580c 100%)" icon="⏳" onClick={() => nav('/exit')} />
        <StatCard value={inClearance} label="In Clearance" sub="dept clearances" gradient="linear-gradient(135deg, #4f8ef7 0%, #6366f1 100%)" icon="🔄" onClick={() => nav('/exit')} />
        <StatCard value={aoMine} label="Orders Approved" sub="appointment orders" gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)" icon="✅" onClick={() => nav('/appointment')} />
      </div>

      {/* ── Pending Resignations Table ── */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #F5F7FA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#232B3A' }}>Team Resignation Requests</div>
            <div style={{ fontSize: 12, color: '#8A94A6', marginTop: 2 }}>Approve or reject your team's resignation applications</div>
          </div>
          <button onClick={() => nav('/approvals')} style={{ padding: '7px 16px', background: '#ECF2FE', border: '1.5px solid #DDE9FD', borderRadius: 9, fontSize: 12, fontWeight: 700, color: '#3E7BFA', cursor: 'pointer' }}>
            Go to Approvals →
          </button>
        </div>
        {pendingResign.length === 0 ? (
          <EmptyState icon="✅" title="No pending resignations" sub="Your team has no pending resignation requests." />
        ) : (
          <Table
            headers={['Employee', 'Designation', 'Resignation Date', 'Last Working Day', 'Reason', 'Action']}
            rows={pendingResign.map(e => [
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#232B3A' }}>{e.name}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#8A94A6' }}>{e.employee_id}</div>
              </div>,
              <span style={{ fontSize: 13, color: '#3D4759' }}>{e.designation}</span>,
              <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtDate(e.resignation_date)}</span>,
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#d97706', fontWeight: 600 }}>{fmtDate(e.last_working_day)}</span>,
              <span style={{ fontSize: 12, color: '#8A94A6' }}>{e.exit_reason || '—'}</span>,
              <button onClick={() => nav('/approvals')} style={{ padding: '5px 12px', background: '#ECF2FE', border: '1.5px solid #DDE9FD', borderRadius: 7, fontSize: 11, fontWeight: 600, color: '#3E7BFA', cursor: 'pointer' }}>Review</button>,
            ])}
          />
        )}
      </Card>

      {/* ── Birthdays & Anniversaries ── */}
      <div style={{ marginBottom: 20 }}>
        <BirthdaysWidget />
      </div>

      {/* ── Exit Pipeline ── */}
      {exitPipeline.length > 0 && (
        <Card>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #F5F7FA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#232B3A' }}>Team Exit Pipeline</div>
            <button onClick={() => nav('/exit')} style={{ padding: '7px 16px', background: '#F3F6FC', border: '1.5px solid #EEF1F6', borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#4f8ef7', cursor: 'pointer' }}>View →</button>
          </div>
          <Table
            headers={['Employee', 'Status', 'Last Working Day']}
            rows={exitPipeline.slice(0, 5).map(e => [
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#232B3A' }}>{e.name}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#8A94A6' }}>{e.employee_id}</div>
              </div>,
              <Badge status={e.status} />,
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#d97706', fontWeight: 600 }}>{fmtDate(e.last_working_day)}</span>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function EmployeeDashboard({ user }) {
  const [data, setData] = useState({ letters: [], aoOrders: [], exitStatus: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      axios.get('/api/letters/'),
      axios.get('/api/appointment-orders/'),
      axios.get('/api/exit/my-status'),
    ]).then(([letters, ao, exit]) => {
      setData({
        letters: Array.isArray(letters.value?.data) ? letters.value.data : [],
        aoOrders: Array.isArray(ao.value?.data) ? ao.value.data : [],
        exitStatus: (exit.value?.data && typeof exit.value.data === 'object') ? exit.value.data : null,
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #EEF1F6', borderTopColor: '#4f8ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 13, color: '#8A94A6' }}>Loading your portal…</div>
      </div>
    </div>
  );

  const { letters, aoOrders, exitStatus } = data;
  const offerLetters = letters.filter(l => l.letter_type === 'offer');
  const latestLetter = offerLetters[0];
  const latestAO = aoOrders[0];
  const inExit = exitStatus?.in_exit_pipeline;
  const exitSt = exitStatus?.status;
  const isExited = exitSt === 'exited';
  const isPending = exitSt === 'resignation_pending';
  const approvedAOs = aoOrders.filter(o => o.status === 'approved').length;
  const pendingAOs = aoOrders.filter(o => o.status === 'pending_hr_head').length;
  const rejectedAOs = aoOrders.filter(o => o.status === 'rejected').length;

  const greeting = greetingFor();

  const download = async (id, fmt, name) => {
    try {
      const r = await axios.get(`/api/exit/relieving/${id}/download?format=${fmt}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url; a.download = `${name}.${fmt}`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Download failed'); }
  };

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto' }}>

      {/* ── Topbar: search + notifications + user chip ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{
          flex: '1 1 220px', maxWidth: 380, display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', borderRadius: 999, padding: '10px 18px',
          boxShadow: '0 8px 24px rgba(113,144,175,.10)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A94A6" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input placeholder="Search" style={{ border: 'none', background: 'transparent', flex: 1, fontSize: 13, color: '#232B3A', minWidth: 0, padding: 0 }} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button aria-label="Notifications" style={{
            position: 'relative', width: 40, height: 40, borderRadius: '50%', border: 'none',
            background: '#fff', boxShadow: '0 8px 24px rgba(113,144,175,.10)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A94A6',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22a2.5 2.5 0 002.5-2.5h-5A2.5 2.5 0 0012 22zm6-6v-5a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2z" />
            </svg>
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9, background: '#fff', borderRadius: 999,
            padding: '5px 14px 5px 5px', boxShadow: '0 8px 24px rgba(113,144,175,.10)',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: '#ECF2FE', color: '#3E7BFA',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13,
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#232B3A' }}>{user?.name?.split(' ')[0]}</span>
          </div>
        </div>
      </div>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#232B3A' }}>
          {greeting}, {user?.name?.split(' ')[0]}
        </h1>
        <div style={{ fontSize: 12.5, color: '#8A94A6', marginTop: 2 }}>{TODAY}</div>
      </div>

      {/* ── Exit status banner ── */}
      {inExit && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          background: '#fff', borderRadius: 16, boxShadow: '0 8px 24px rgba(113,144,175,.12)',
          padding: '16px 20px', marginBottom: 20,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: isPending ? '#FEF3E7' : isExited ? '#E9F8F0' : '#ECF2FE',
            color: isPending ? '#F2994A' : isExited ? '#27AE60' : '#3E7BFA',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>
            {isPending ? '⏳' : isExited ? '✅' : '🔄'}
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={{
              fontSize: 13.5, fontWeight: 600,
              color: isPending ? '#F2994A' : isExited ? '#27AE60' : '#3E7BFA',
            }}>
              {isPending ? 'Your resignation is awaiting manager approval'
                : isExited ? 'Exit process complete — relieving letter ready'
                  : `Exit in progress — ${exitSt?.replace(/_/g, ' ')}`}
            </div>
            <div style={{ fontSize: 12, color: '#8A94A6', marginTop: 1 }}>
              {[
                exitStatus?.resignation_date && `Resignation ${fmtDate(exitStatus.resignation_date)}`,
                exitStatus?.last_working_day && `Last working day ${fmtDate(exitStatus.last_working_day)}`,
              ].filter(Boolean).join(' · ')}
            </div>
          </div>
          {(isExited && exitStatus?.relieving_letter_id && exitStatus.has_pdf) ? (
            <button
              onClick={() => download(exitStatus.relieving_letter_id, 'pdf', 'relieving_letter')}
              className="btn btn-primary"
            >
              Download PDF
            </button>
          ) : (!isExited && !isPending) ? (
            <button onClick={() => nav('/exit')} className="btn btn-primary">View details →</button>
          ) : null}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
        <div onClick={() => nav('/letters')} style={{ cursor: 'pointer', background: '#fff', borderRadius: 16, boxShadow: '0 8px 24px rgba(113,144,175,.12)', padding: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ECF2FE', color: '#3E7BFA', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 17 }}>📄</div>
          <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: '#232B3A' }}>{offerLetters.length}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: '#232B3A' }}>Offer letters</div>
          <div style={{ fontSize: 11, color: '#8A94A6' }}>All versions</div>
        </div>
        <div onClick={() => nav('/appointment')} style={{ cursor: 'pointer', background: '#fff', borderRadius: 16, boxShadow: '0 8px 24px rgba(113,144,175,.12)', padding: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E9F8F0', color: '#27AE60', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 17 }}>✓</div>
          <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: '#232B3A' }}>{approvedAOs}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: '#232B3A' }}>Appointment orders</div>
          <div style={{ fontSize: 11, color: '#8A94A6' }}>Approved &amp; ready</div>
        </div>
        <div onClick={() => nav('/appointment')} style={{ cursor: 'pointer', background: '#fff', borderRadius: 16, boxShadow: '0 8px 24px rgba(113,144,175,.12)', padding: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14, fontSize: 17,
            background: (pendingAOs + rejectedAOs) > 0 ? '#FEF3E7' : '#F3F6FC',
            color: (pendingAOs + rejectedAOs) > 0 ? '#F2994A' : '#8A94A6',
          }}>🔔</div>
          <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: '#232B3A' }}>{pendingAOs + rejectedAOs}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: '#232B3A' }}>Needs action</div>
          <div style={{ fontSize: 11, color: '#8A94A6' }}>Pending or rejected</div>
        </div>
      </div>

      {/* ── Two column: latest letter / latest AO ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginTop: 16 }}>

        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 24px rgba(113,144,175,.12)', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#232B3A' }}>My latest offer letter</div>
            <a onClick={() => nav('/letters')} style={{ fontSize: 12, fontWeight: 600, color: '#3E7BFA', cursor: 'pointer' }}>View all →</a>
          </div>
          {!latestLetter ? (
            <div style={{ textAlign: 'center', padding: '22px 12px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F3F6FC', color: '#8A94A6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 19 }}>📄</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#232B3A' }}>No offer letters yet</div>
              <div style={{ fontSize: 12, color: '#8A94A6', marginTop: 4, maxWidth: '32ch', marginLeft: 'auto', marginRight: 'auto' }}>Your offer letter will appear here once HR creates one.</div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <Badge status={latestLetter.status} />
                <span style={{ fontSize: 11.5, color: '#8A94A6' }}>v{latestLetter.version} · issued {fmtDate(latestLetter.created_at)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '14px 20px' }}>
                {[
                  ['Designation', latestLetter.context?.designation],
                  ['Department', latestLetter.context?.department],
                  ['CTC', latestLetter.context?.ctc ? `₹${Number(latestLetter.context.ctc).toLocaleString('en-IN')}` : null],
                  ['Joining date', fmtDate(latestLetter.context?.joining_date)],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: '#8A94A6' }}>{k}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2, color: '#232B3A' }}>{v}</div>
                  </div>
                ))}
              </div>
              {latestLetter.status === 'rejected' && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: '#FDECEA', borderRadius: 10, fontSize: 12, color: '#E4574B', fontWeight: 500 }}>
                  Letter was rejected — check Offer Letters for details
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 24px rgba(113,144,175,.12)', padding: 22, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#232B3A' }}>My latest appointment order</div>
            <a onClick={() => nav('/appointment')} style={{ fontSize: 12, fontWeight: 600, color: '#3E7BFA', cursor: 'pointer' }}>View all →</a>
          </div>
          {!latestAO ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '22px 12px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F3F6FC', color: '#8A94A6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 19 }}>📋</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#232B3A' }}>No appointment orders yet</div>
              <div style={{ fontSize: 12, color: '#8A94A6', marginTop: 4, maxWidth: '32ch' }}>Your appointment order will appear here once HR creates one.</div>
            </div>
          ) : (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <Badge status={latestAO.status} />
                <span style={{ fontSize: 11.5, color: '#8A94A6' }}>{latestAO.reference_number} · {fmtDate(latestAO.created_at)}</span>
              </div>
              {latestAO.status === 'rejected' && (
                <div style={{ padding: '12px 14px', background: '#FDECEA', borderRadius: 10, fontSize: 12, color: '#E4574B', marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Rejected — you can edit and resubmit</div>
                  <button onClick={() => nav('/appointment')} className="btn btn-secondary btn-sm">✎ Edit &amp; Resubmit</button>
                </div>
              )}
              {latestAO.status === 'pending_hr_head' && (
                <div style={{ padding: '12px 14px', background: '#FEF3E7', borderRadius: 10, fontSize: 12, color: '#F2994A', fontWeight: 500 }}>
                  ⏳ Submitted — awaiting HR Head approval
                </div>
              )}
              {latestAO.status === 'approved' && (
                <div style={{ padding: '12px 14px', background: '#E9F8F0', borderRadius: 10, fontSize: 12, color: '#27AE60' }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Approved — download your appointment order</div>
                  <button onClick={() => nav('/appointment')} className="btn btn-primary btn-sm">Download</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Birthdays & Anniversaries ── */}
      <div style={{ marginTop: 16 }}>
        <BirthdaysWidget />
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
        {[
          { label: 'Appointment orders', path: '/appointment', bg: '#ECF2FE', hoverBg: '#DDE9FD', color: '#3E7BFA' },
          { label: 'My offer letters', path: '/letters', bg: '#E9F8F0', hoverBg: '#D9F2E5', color: '#27AE60' },
          { label: 'My documents', path: '/documents', bg: '#FEF3E7', hoverBg: '#FCE9D4', color: '#F2994A' },
          ...(!inExit ? [{ label: 'Apply for resignation', path: '/exit', bg: '#FDECEA', hoverBg: '#FBDAD6', color: '#E4574B' }] : []),
        ].map(a => (
          <button
            key={a.label}
            onClick={() => nav(a.path)}
            style={{
              border: 'none', cursor: 'pointer', background: a.bg, color: a.color,
              borderRadius: 999, padding: '10px 20px', fontSize: 12.5, fontWeight: 600,
              transition: 'background .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = a.hoverBg; }}
            onMouseLeave={e => { e.currentTarget.style.background = a.bg; }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Root router ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  if (['admin', 'hr_head'].includes(role)) return <HRDashboard user={user} />;
  if (role === 'manager') return <ManagerDashboard user={user} />;
  return <EmployeeDashboard user={user} />;
}
