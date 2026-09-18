/**
 * ReportsPage.jsx — Organization > Reports
 *
 * Lightweight hub that surfaces existing HR data (attendance, leave
 * balances, payroll) as three summary cards. Each card launches the
 * full detail page for that area — this page does not build new
 * reporting logic of its own.
 *
 * Visible to admin / hr / hr_head / manager. Some underlying endpoints
 * (attendance monthly-summary, leave balances) are HR/Admin-only on the
 * backend, so a manager sees a friendly "restricted" note on those
 * cards instead of a crash, and can still open the linked page.
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const nav = (path) => { window.location.hash = path; };

const NOW = new Date();
const MONTH_LABEL = NOW.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

function ReportCard({ title, subtitle, icon, accent, onClick, children }) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{ cursor: 'pointer', transition: 'box-shadow .15s, transform .15s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 1 }}>{subtitle}</div>
        </div>
      </div>
      {children}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
        View details →
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Restricted({ note }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px' }}>
      {note}
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();

  const [attendance, setAttendance] = useState({ loading: true, error: false, present: 0, onLeave: 0, absent: 0, workingDays: 0 });
  const [leaves, setLeaves] = useState({ loading: true, error: false, employeeCount: 0, totalLpDays: 0 });
  const [payroll, setPayroll] = useState({ loading: true, error: false, draft: 0, generated: 0, approved: 0, released: 0, total: 0 });

  useEffect(() => {
    // ── Attendance summary (current month) ──
    axios.get('/api/attendance/monthly-summary', { params: { year: NOW.getFullYear(), month: NOW.getMonth() + 1 } })
      .then(r => {
        const rows = r.data?.employees || [];
        const present = rows.reduce((s, e) => s + (e.present || 0), 0);
        const onLeave = rows.reduce((s, e) => s + (e.on_leave || 0), 0);
        const absent = rows.reduce((s, e) => s + (e.absent || 0), 0);
        setAttendance({ loading: false, error: false, present, onLeave, absent, workingDays: r.data?.total_working_days || 0 });
      })
      .catch(() => setAttendance(s => ({ ...s, loading: false, error: true })));

    // ── Leave balances ──
    axios.get('/api/leaves/balances')
      .then(r => {
        const rows = r.data || [];
        const totalLpDays = rows.reduce((s, e) => s + (e.lp_days_taken || 0), 0);
        setLeaves({ loading: false, error: false, employeeCount: rows.length, totalLpDays });
      })
      .catch(() => setLeaves(s => ({ ...s, loading: false, error: true })));

    // ── Payroll summary (current month) ──
    axios.get('/api/payslips/', { params: { year: NOW.getFullYear(), month: NOW.getMonth() + 1 } })
      .then(r => {
        const rows = r.data || [];
        const byStatus = { draft: 0, generated: 0, approved: 0, released: 0 };
        rows.forEach(p => { if (p.status in byStatus) byStatus[p.status] += 1; });
        setPayroll({ loading: false, error: false, ...byStatus, total: rows.length });
      })
      .catch(() => setPayroll(s => ({ ...s, loading: false, error: true })));
  }, []);

  if (user?.role === 'employee') {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <div style={{ fontWeight: 600 }}>Reports are only available to managers and HR.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">A quick look across attendance, leave and payroll for {MONTH_LABEL}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>

        <ReportCard
          title="Attendance Summary"
          subtitle={MONTH_LABEL}
          icon="📅"
          accent="var(--accent-dim)"
          onClick={() => nav('/attendance')}
        >
          {attendance.loading ? (
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Loading…</div>
          ) : attendance.error ? (
            <Restricted note="This summary is visible to HR / Admin. Open Attendance for your team's view." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <Stat label="Present" value={attendance.present} color="var(--green)" />
              <Stat label="On Leave" value={attendance.onLeave} color="var(--amber)" />
              <Stat label="Absent" value={attendance.absent} color="var(--red)" />
            </div>
          )}
        </ReportCard>

        <ReportCard
          title="Leave Balances"
          subtitle="Across the organization"
          icon="🗓"
          accent="var(--green-dim)"
          onClick={() => nav('/leave-management')}
        >
          {leaves.loading ? (
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Loading…</div>
          ) : leaves.error ? (
            <Restricted note="Leave balances are visible to HR / Admin. Open Leave Management for your team's requests." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <Stat label="Employees Tracked" value={leaves.employeeCount} />
              <Stat label="LP Days (YTD)" value={leaves.totalLpDays} color="var(--red)" />
            </div>
          )}
        </ReportCard>

        <ReportCard
          title="Payroll Summary"
          subtitle={MONTH_LABEL}
          icon="💰"
          accent="var(--amber-dim, #FEF3E7)"
          onClick={() => nav('/payslip-management')}
        >
          {payroll.loading ? (
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Loading…</div>
          ) : payroll.error ? (
            <Restricted note="Could not load payroll data. Open Payslip Management for details." />
          ) : payroll.total === 0 ? (
            <Restricted note="No payslips generated for this month yet." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <Stat label="Draft" value={payroll.draft} />
              <Stat label="Generated" value={payroll.generated} color="var(--accent)" />
              <Stat label="Approved" value={payroll.approved} color="var(--green)" />
              <Stat label="Released" value={payroll.released} color="var(--green)" />
            </div>
          )}
        </ReportCard>

      </div>
    </div>
  );
}
