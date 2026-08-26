/**
 * ui.jsx — shared presentational components, extracted from DashboardPage.jsx
 * so new pages (Reports, Assets, Expenses, Holidays, ...) don't have to
 * re-implement the same stat-tile / card / section-header markup.
 */
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

// Validated categorical/status palette (dataviz skill — fixed order, never
// cycled; run through scripts/validate_palette.js). Slot 1 sits close to the
// app's own accent blue so charts feel native rather than bolted on. Shared
// across Reports and Org Chart so both pages draw from the same source.
export const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
export const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' };
export const NEUTRAL_GRAY = '#AEB7C4';

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
export const ICONS = {
  users: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  check: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  clock: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  target: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
  file: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
  clipboard: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>,
  mail: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  bell: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  alert: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="10.29 3.86 1.82 18 22.18 18" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>,
  refresh: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>,
  folder: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
  exit: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  money: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M9 9.5c0-1.1 1.34-2 3-2s3 .9 3 2-1.34 2-3 2-3 .9-3 2 1.34 2 3 2 3-.9 3-2" /></svg>,
  chart: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
};

// Map old emoji strings to icon keys
export function resolveIcon(icon, accentColor) {
  const color = accentColor || '#64748b';
  const map = {
    '👥': ICONS.users, '✅': ICONS.check, '⏳': ICONS.clock, '🎯': ICONS.target,
    '📄': ICONS.file, '📋': ICONS.clipboard, '✉️': ICONS.mail, '🔔': ICONS.bell,
    '⚠️': ICONS.alert, '🔄': ICONS.refresh, '🗂': ICONS.folder, '💰': ICONS.money,
    '📊': ICONS.chart,
  };
  const fn = map[icon] || ICONS.file;
  return fn(color);
}

export function StatCard({ value, label, sub, gradient, icon, onClick, urgent }) {
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

export function SectionTitle({ children, action, actionLabel }) {
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

export function PipelineBar({ stages }) {
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

export function Card({ children, style = {}, onClick }) {
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

// ─── Donut with a centered total + legend ──────────────────────────────────
// Part-to-whole composition (dataviz skill): "no data" slices must always be
// passed in as a distinct neutral gray by the caller, never a categorical hue
// competing as if it were a real category.
export function DonutCard({ title, data, centerLabel }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const empty = total === 0;
  return (
    <Card style={{ padding: 20 }}>
      <SectionTitle>{title}</SectionTitle>
      {empty ? (
        <div className="empty-state" style={{ padding: '32px 16px' }}><p style={{ margin: 0 }}>Not enough data yet.</p></div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 150, height: 150, position: 'relative', flexShrink: 0 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70}
                     paddingAngle={data.length > 1 ? 2 : 0} strokeWidth={0}>
                  {data.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} (${Math.round((v / total) * 100)}%)`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--display)' }}>{total}</div>
              {centerLabel && <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{centerLabel}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, flex: 1 }}>
            {data.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--mono)' }}>{d.value}</span>
                <span style={{ color: 'var(--text-faint)', fontSize: 11, width: 34, textAlign: 'right' }}>
                  {Math.round((d.value / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
