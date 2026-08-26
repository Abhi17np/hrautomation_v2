import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { StatCard, Card, SectionTitle, DonutCard, CATEGORICAL, STATUS, NEUTRAL_GRAY } from '../components/ui';

function money(v) {
  const n = Number(v) || 0;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${n.toLocaleString()}`;
}

function ChartCard({ title, children, empty, span }) {
  return (
    <Card style={{ padding: 20, gridColumn: span ? 'span 2' : undefined }}>
      <SectionTitle>{title}</SectionTitle>
      {empty ? (
        <div className="empty-state" style={{ padding: '32px 16px' }}><p style={{ margin: 0 }}>Not enough data yet.</p></div>
      ) : (
        <div style={{ width: '100%', height: 260 }}>{children}</div>
      )}
    </Card>
  );
}

const ATTENTION_ICON = { leave: '▤', expense: '◧', document: '⬡', exit: '⇥', appointment_order: '◈', letter: '⧉' };

function AttentionPanel({ items, loading }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <Card style={{ padding: 20 }}>
      <SectionTitle>Needs Your Attention</SectionTitle>
      {loading ? (
        <div className="empty-state" style={{ padding: '20px 0' }}><p style={{ margin: 0 }}>Loading…</p></div>
      ) : total === 0 ? (
        <div className="empty-state" style={{ padding: '20px 0' }}>
          <p style={{ margin: 0 }}>Nothing pending — you're all caught up.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.filter(i => i.count > 0).map(i => (
            <div key={i.key}
              onClick={() => { if (i.link) window.location.hash = i.link; }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, background: 'rgba(250,178,25,0.12)', cursor: i.link ? 'pointer' : 'default',
              }}
            >
              <span style={{ fontSize: 14, color: STATUS.warning, width: 18, textAlign: 'center' }}>{ATTENTION_ICON[i.key] || '•'}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{i.label}</span>
              <span style={{
                fontWeight: 700, fontSize: 12, color: '#fff', background: STATUS.warning,
                borderRadius: 999, padding: '2px 9px', minWidth: 22, textAlign: 'center',
              }}>{i.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const EVENT_ICON = { birthday: '◉', anniversary: '⬢' };

function UpcomingEventsCard({ events, loading }) {
  return (
    <Card style={{ padding: 20 }}>
      <SectionTitle>Upcoming Birthdays & Anniversaries</SectionTitle>
      {loading ? (
        <div className="empty-state" style={{ padding: '20px 0' }}><p style={{ margin: 0 }}>Loading…</p></div>
      ) : events.length === 0 ? (
        <div className="empty-state" style={{ padding: '20px 0' }}><p style={{ margin: 0 }}>Nothing in the next 30 days.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
          {events.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
              <span style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: e.type === 'birthday' ? 'rgba(232,123,164,0.15)' : 'rgba(42,120,214,0.12)',
                color: e.type === 'birthday' ? '#e87ba4' : '#2a78d6',
              }}>{EVENT_ICON[e.type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {e.type === 'birthday' ? 'Birthday' : `${e.years_label} work anniversary`}
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', textAlign: 'right', flexShrink: 0 }}>
                {e.days_until === 0 ? 'Today' : e.days_until === 1 ? 'Tomorrow' : `In ${e.days_until}d`}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const isHRTier = ['admin', 'hr', 'hr_head'].includes(role);
  const isManager = role === 'manager';

  const [headcount, setHeadcount] = useState(null);
  const [attrition, setAttrition] = useState(null);
  const [payrollCost, setPayrollCost] = useState(null);
  const [leaveLiability, setLeaveLiability] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [attention, setAttention] = useState([]);
  const [attentionLoading, setAttentionLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const calls = [
      axios.get('/api/analytics/headcount').then(r => setHeadcount(r.data)),
      axios.get('/api/analytics/attrition').then(r => setAttrition(r.data)),
    ];
    if (isHRTier) {
      calls.push(axios.get('/api/analytics/payroll-cost').then(r => setPayrollCost(r.data)));
      calls.push(axios.get('/api/analytics/leave-liability').then(r => setLeaveLiability(r.data)));
    }
    Promise.all(calls)
      .catch(() => setError('Could not load some reports'))
      .finally(() => setLoading(false));

    axios.get('/api/analytics/upcoming-events').then(r => setEvents(r.data)).catch(() => {}).finally(() => setEventsLoading(false));
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (role === 'employee') { setAttentionLoading(false); return; }
    const noop = Promise.resolve({ data: [] });
    const calls = {
      letter: isHRTier ? axios.get('/api/approvals/pending').catch(() => noop) : noop,
      appointment_order: isHRTier ? axios.get('/api/appointment-orders/').catch(() => noop) : noop,
      document: isHRTier ? axios.get('/api/documents/submissions?status=pending_hr').catch(() => noop) : noop,
      exit: (isHRTier || isManager) ? axios.get('/api/exit/pending-approvals').catch(() => noop) : noop,
      leave: isHRTier
        ? axios.get('/api/leaves/all?status=pending_hr_head').catch(() => noop)
        : isManager ? axios.get('/api/leaves/team-pending').catch(() => noop) : noop,
      expense: isHRTier
        ? axios.get('/api/expenses/?status=pending_hr').catch(() => noop)
        : isManager ? axios.get('/api/expenses/?status=pending_manager').catch(() => noop) : noop,
    };
    Promise.all(Object.values(calls)).then(([letter, ao, doc, ex, leave, expense]) => {
      const aoCount = (ao.data || []).filter(o => o.status === 'pending_hr_head').length;
      setAttention([
        { key: 'leave', label: 'Leave requests pending', count: (leave.data || []).length, link: isHRTier ? '/leave-management' : '/leave-tracker' },
        { key: 'expense', label: 'Expenses pending', count: (expense.data || []).length, link: '/expenses' },
        { key: 'exit', label: 'Resignations pending approval', count: (ex.data || []).length, link: '/exit' },
        { key: 'letter', label: 'Offer letters pending HR Head review', count: (letter.data || []).length, link: '/letters' },
        { key: 'appointment_order', label: 'Appointment orders pending review', count: aoCount, link: '/appointment' },
        { key: 'document', label: 'Document submissions pending review', count: (doc.data || []).length, link: '/documents' },
      ]);
    }).finally(() => setAttentionLoading(false));
    // eslint-disable-next-line
  }, [role]);

  const totalPending = useMemo(() => attention.reduce((s, i) => s + i.count, 0), [attention]);

  const statusDonut = useMemo(() => {
    if (!headcount) return [];
    return [
      { name: 'Active', value: headcount.active, color: STATUS.good },
      { name: 'On Notice', value: headcount.on_notice, color: STATUS.warning },
      { name: 'Exited', value: headcount.exited, color: NEUTRAL_GRAY },
    ].filter(d => d.value > 0);
  }, [headcount]);

  const deptDonut = useMemo(() => {
    if (!headcount) return [];
    let colorIdx = 0;
    return headcount.by_department.map(d => {
      if (d.department === 'Unassigned') return { name: 'Not Set', value: d.count, color: NEUTRAL_GRAY };
      return { name: d.department, value: d.count, color: CATEGORICAL[colorIdx++ % CATEGORICAL.length] };
    });
  }, [headcount]);

  const tenureData = useMemo(() => {
    if (!headcount) return [];
    return headcount.tenure_bands.map(b => ({ ...b, color: b.band === 'Unknown' ? NEUTRAL_GRAY : CATEGORICAL[0] }));
  }, [headcount]);

  if (loading) {
    return (
      <div>
        <div className="page-header"><div className="page-title">Reports</div></div>
        <div className="empty-state" style={{ padding: '40px 16px' }}><p>Loading…</p></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Reports</div>
          <div className="page-subtitle">
            {isHRTier ? 'Headcount, attrition, payroll cost, and leave liability across the company.'
                       : 'Headcount and attrition for your team.'}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {headcount && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
          <StatCard value={headcount.total} label="Total Employees" icon="👥" />
          <StatCard value={headcount.active} label="Active" icon="✅" />
          <StatCard value={headcount.new_joiners_this_month} label="New Joiners" sub="This month" icon="🔄" />
          <StatCard value={totalPending} label="Open Approvals" sub="Across all modules" icon="⏳" urgent={totalPending > 0} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
        <DonutCard title="Employee Status" data={statusDonut} centerLabel="employees" />
        <DonutCard title="Department Mix" data={deptDonut} centerLabel="employees" />
      </div>

      {headcount && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
          <ChartCard title="Hires vs Exits (12 months)" empty={headcount.trend.every(t => t.hires === 0 && t.exits === 0)}>
            <ResponsiveContainer>
              <LineChart data={headcount.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10.5 }} stroke="#c3c2b7" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#c3c2b7" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="hires" name="Hires" stroke={STATUS.good} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="exits" name="Exits" stroke={CATEGORICAL[7]} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {attrition && (
            <ChartCard title="Attrition Rate (12 months)" empty={attrition.trend.every(t => t.exits === 0)}>
              <ResponsiveContainer>
                <LineChart data={attrition.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10.5 }} stroke="#c3c2b7" />
                  <YAxis tick={{ fontSize: 11 }} unit="%" stroke="#c3c2b7" />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="rate_pct" name="Attrition %" stroke={CATEGORICAL[1]} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
        {headcount && (
          <ChartCard title="Tenure Distribution">
            <ResponsiveContainer>
              <BarChart data={tenureData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="band" tick={{ fontSize: 11 }} stroke="#c3c2b7" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#c3c2b7" />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {tenureData.map(d => <Cell key={d.band} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {attrition && attrition.top_reasons.length > 0 && (
          <ChartCard title="Top Exit Reasons">
            <ResponsiveContainer>
              <BarChart data={attrition.top_reasons} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e1e0d9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#c3c2b7" />
                <YAxis type="category" dataKey="reason" width={130} tick={{ fontSize: 10.5 }} stroke="#c3c2b7" />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {attrition.top_reasons.map((d, i) => <Cell key={d.reason} fill={CATEGORICAL[i % CATEGORICAL.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {role !== 'employee' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
          <AttentionPanel items={attention} loading={attentionLoading} />
          <UpcomingEventsCard events={events} loading={eventsLoading} />
        </div>
      )}
      {role === 'employee' && (
        <div style={{ marginBottom: 20 }}>
          <UpcomingEventsCard events={events} loading={eventsLoading} />
        </div>
      )}

      {isHRTier && payrollCost && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
            <StatCard value={money(payrollCost.total_gross)} label="Total Gross Payroll" sub="Approved + released payslips" icon="💰" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
            <ChartCard title="Payroll Cost by Month" empty={payrollCost.monthly.length === 0}>
              <ResponsiveContainer>
                <BarChart data={payrollCost.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10.5 }} stroke="#c3c2b7" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#c3c2b7" tickFormatter={money} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="gross" name="Gross" fill={CATEGORICAL[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <DonutCard
              title="Payroll Cost by Department"
              data={payrollCost.by_department.map((d, i) => ({
                name: d.department === 'Unassigned' ? 'Not Set' : d.department,
                value: d.gross,
                color: d.department === 'Unassigned' ? NEUTRAL_GRAY : CATEGORICAL[i % CATEGORICAL.length],
              }))}
              centerLabel="total ₹"
            />
          </div>
        </>
      )}

      {isHRTier && leaveLiability && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
            <StatCard value={leaveLiability.total_lp_days} label="LP Days (Unpaid Leave)" sub={`Year ${leaveLiability.year}`} icon="⏳" />
            <StatCard value={`${leaveLiability.utilization_pct}%`} label="Paid Leave Utilization" icon="📊" />
          </div>
          <ChartCard title="Leave-Without-Pay Days by Department" empty={leaveLiability.lp_by_department.length === 0}>
            <ResponsiveContainer>
              <BarChart data={leaveLiability.lp_by_department}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 11 }} stroke="#c3c2b7" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#c3c2b7" />
                <Tooltip />
                <Bar dataKey="lp_days" fill={CATEGORICAL[7]} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}
