/**
 * AnalyticsPage.jsx — Organization > Reports > Analytics
 *
 * Headcount/attrition trend (12 months), department/designation
 * distribution, and a statutory compliance register (PF/ESI/PT/TDS
 * actually withheld via payroll runs — a filing-reference summary, not
 * a substitute for the statutory returns themselves).
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function fmtINR(n) { return `₹${Math.round(n || 0).toLocaleString('en-IN')}`; }

function BarChart({ data, valueKey, labelKey, color = '#3E7BFA', height = 140 }) {
  const max = Math.max(1, ...data.map(d => d[valueKey]));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>{d[valueKey]}</div>
          <div style={{
            width: '100%', maxWidth: 22, borderRadius: '4px 4px 0 0', background: color,
            height: `${Math.max(2, (d[valueKey] / max) * (height - 34))}px`,
          }} />
          <div style={{ fontSize: 9, color: 'var(--text-dim)', whiteSpace: 'nowrap', transform: 'rotate(0deg)' }}>{d[labelKey]}</div>
        </div>
      ))}
    </div>
  );
}

function DistBar({ items }) {
  const total = items.reduce((s, i) => s + i.count, 0) || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.slice(0, 8).map((it, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span>{it.label}</span><span style={{ fontWeight: 600 }}>{it.count}</span>
          </div>
          <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(it.count / total) * 100}%`, background: '#3E7BFA', borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const canView = (user?.permissions || []).includes('reports.view');

  const [headcount, setHeadcount] = useState(null);
  const [register, setRegister] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      axios.get('/api/analytics/headcount'),
      axios.get('/api/analytics/compliance-register', { params: { year } }),
    ]).then(([h, r]) => { setHeadcount(h.data); setRegister(r.data); })
      .catch(() => setError('Could not load analytics.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [year]);

  if (!canView) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <div style={{ fontWeight: 600 }}>You don't have access to Analytics.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Headcount, attrition, and statutory compliance registers.</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Loading…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{headcount.current_headcount}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Current Headcount</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{headcount.trend.reduce((s, t) => s + t.hires, 0)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Hires (12mo)</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{headcount.trend.reduce((s, t) => s + t.exits, 0)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Exits (12mo)</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>
                {(headcount.trend.reduce((s, t) => s + t.attrition_rate, 0) / 12).toFixed(1)}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Avg Monthly Attrition</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Headcount Trend (12 months)</div>
              <BarChart data={headcount.trend} valueKey="headcount" labelKey="label" />
            </div>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>By Department</div>
              <DistBar items={headcount.by_department} />
            </div>
          </div>

          <div className="card" style={{ padding: 18, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Statutory Compliance Register — {year}</div>
              <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width: 90, padding: 4 }} />
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '0 0 12px' }}>
              Totals actually withheld via payroll runs — a filing-reference summary, not a substitute for the statutory returns themselves.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Month</th><th>Employees</th><th>Gross</th>
                    <th>PF (Employer)</th><th>PF (Employee)</th>
                    <th>ESI (Employer)</th><th>ESI (Employee)</th>
                    <th>Prof. Tax</th><th>TDS</th>
                  </tr>
                </thead>
                <tbody>
                  {register.months.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)' }}>No payroll runs for {year} yet</td></tr>
                  ) : register.months.map(m => (
                    <tr key={m.month}>
                      <td>{m.month}</td><td>{m.employee_count}</td><td>{fmtINR(m.gross_salary)}</td>
                      <td>{fmtINR(m.employer_pf)}</td><td>{fmtINR(m.employee_pf)}</td>
                      <td>{fmtINR(m.employer_esi)}</td><td>{fmtINR(m.employee_esi)}</td>
                      <td>{fmtINR(m.professional_tax)}</td><td>{fmtINR(m.tds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
