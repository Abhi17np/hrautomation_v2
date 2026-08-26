import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { StatCard, SectionTitle } from '../components/ui';

const DEPT_COLORS = ['#3E7BFA', '#27AE60', '#7C6FE0', '#F2994A', '#E4574B', '#0E9F94', '#DB2777', '#8A94A6'];

function ChartCard({ title, children, empty }) {
  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <SectionTitle>{title}</SectionTitle>
      {empty ? (
        <div className="empty-state" style={{ padding: '32px 16px' }}><p style={{ margin: 0 }}>Not enough data yet.</p></div>
      ) : (
        <div style={{ width: '100%', height: 260 }}>{children}</div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const isHRTier = ['admin', 'hr', 'hr_head'].includes(user?.role);
  const [headcount, setHeadcount] = useState(null);
  const [attrition, setAttrition] = useState(null);
  const [payrollCost, setPayrollCost] = useState(null);
  const [leaveLiability, setLeaveLiability] = useState(null);
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
    // eslint-disable-next-line
  }, []);

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          <StatCard value={headcount.total} label="Total Employees" icon="👥" />
          <StatCard value={headcount.active} label="Active" icon="✅" />
          <StatCard value={headcount.on_notice} label="On Notice" icon="⏳" />
          <StatCard value={headcount.exited} label="Exited" icon="🗂" />
        </div>
      )}

      {headcount && (
        <ChartCard title="Headcount by Department" empty={headcount.by_department.length === 0}>
          <ResponsiveContainer>
            <BarChart data={headcount.by_department} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF1F6" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="department" width={110} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {headcount.by_department.map((d, i) => <Cell key={d.department} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {headcount && (
        <ChartCard title="Hires vs Exits (12 months)" empty={headcount.trend.every(t => t.hires === 0 && t.exits === 0)}>
          <ResponsiveContainer>
            <LineChart data={headcount.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
              <XAxis dataKey="label" tick={{ fontSize: 10.5 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="hires" name="Hires" stroke="#27AE60" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="exits" name="Exits" stroke="#E4574B" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {attrition && (
        <ChartCard title="Attrition Rate (12 months)" empty={attrition.trend.every(t => t.exits === 0)}>
          <ResponsiveContainer>
            <LineChart data={attrition.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
              <XAxis dataKey="label" tick={{ fontSize: 10.5 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="rate_pct" name="Attrition %" stroke="#F2994A" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {attrition && attrition.top_reasons.length > 0 && (
        <ChartCard title="Top Exit Reasons">
          <ResponsiveContainer>
            <BarChart data={attrition.top_reasons} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF1F6" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="reason" width={130} tick={{ fontSize: 10.5 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#7C6FE0" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {isHRTier && payrollCost && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <StatCard value={`₹${payrollCost.total_gross.toLocaleString()}`} label="Total Gross Payroll" sub="Approved + released payslips" icon="💰" />
          </div>
          <ChartCard title="Payroll Cost by Month" empty={payrollCost.monthly.length === 0}>
            <ResponsiveContainer>
              <BarChart data={payrollCost.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                <XAxis dataKey="label" tick={{ fontSize: 10.5 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Bar dataKey="gross" name="Gross" fill="#3E7BFA" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Payroll Cost by Department" empty={payrollCost.by_department.length === 0}>
            <ResponsiveContainer>
              <BarChart data={payrollCost.by_department} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF1F6" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="department" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Bar dataKey="gross" radius={[0, 6, 6, 0]}>
                  {payrollCost.by_department.map((d, i) => <Cell key={d.department} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {isHRTier && leaveLiability && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <StatCard value={leaveLiability.total_lp_days} label="LP Days (Unpaid Leave)" sub={`Year ${leaveLiability.year}`} icon="⏳" />
            <StatCard value={`${leaveLiability.utilization_pct}%`} label="Paid Leave Utilization" icon="📊" />
          </div>
          <ChartCard title="Leave-Without-Pay Days by Department" empty={leaveLiability.lp_by_department.length === 0}>
            <ResponsiveContainer>
              <BarChart data={leaveLiability.lp_by_department} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF1F6" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="department" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="lp_days" fill="#E4574B" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}
