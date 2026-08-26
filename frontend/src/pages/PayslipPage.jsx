/**
 * PayslipPage.jsx
 * Employee payslip viewer
 * - View monthly payslips
 * - Year/month filtering
 * - Salary breakdown display
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATUS_META = {
  draft: { label: 'Draft', cls: 'badge-gray', icon: '◯' },
  generated: { label: 'Generated', cls: 'badge-blue', icon: '●' },
  approved: { label: 'Approved', cls: 'badge-amber', icon: '◐' },
  released: { label: 'Released', cls: 'badge-green', icon: '◉' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, cls: 'badge-gray', icon: '?' };
  return <span className={`badge ${meta.cls}`}>{meta.icon} {meta.label}</span>;
}

function formatCurrency(value) {
  if (!value && value !== 0) return '—';
  return '₹' + parseFloat(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function PayslipModal({ payslip, onClose }) {
  const [downloading, setDownloading] = useState(false);
  if (!payslip) return null;

  const monthName = MONTH_NAMES[payslip.month - 1];

  const onDownload = async () => {
    setDownloading(true);
    try {
      const res = await axios.get(`/api/payslips/${payslip._id}/download`, {
        params: { format: 'pdf' },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${monthName}_${payslip.year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      let msg = 'Download failed.';
      try {
        const text = await err.response?.data?.text?.();
        if (text) msg = JSON.parse(text).error || msg;
      } catch { /* blob wasn't JSON */ }
      alert(msg);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius)', padding: 40,
        maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,.2)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0', fontSize: 24 }}>Payslip</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
              {monthName} {payslip.year}
            </p>
          </div>
          <StatusBadge status={payslip.status} />
        </div>

        {/* Employee Info */}
        <div style={{
          background: 'var(--bg-secondary)', padding: 20, borderRadius: 'var(--radius)',
          marginBottom: 25, fontSize: 14,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <div>
              <p style={{ margin: '0 0 5px 0', color: 'var(--text-secondary)', fontSize: 12 }}>Employee Name</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{payslip.employee_name}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', color: 'var(--text-secondary)', fontSize: 12 }}>Employee ID</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{payslip.employee_code}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', color: 'var(--text-secondary)', fontSize: 12 }}>Designation</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{payslip.designation || '—'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', color: 'var(--text-secondary)', fontSize: 12 }}>Department</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{payslip.department || '—'}</p>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div style={{ marginBottom: 25 }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Earnings
          </h3>
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}>
            {[
              { label: 'Basic', value: payslip.basic },
              { label: 'HRA', value: payslip.hra },
              { label: 'DA', value: payslip.da },
              { label: 'Allowances', value: payslip.allowances },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', padding: '12px 15px',
                borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
                fontSize: 14,
              }}>
                <span>{item.label}</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(item.value)}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '12px 15px',
              background: 'rgba(37, 99, 235, 0.05)', fontWeight: 600, fontSize: 14,
              borderTop: '2px solid var(--border)',
            }}>
              <span>Gross Salary</span>
              <span style={{ color: '#2563eb' }}>{formatCurrency(payslip.gross_salary)}</span>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div style={{ marginBottom: 25 }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Deductions
          </h3>
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}>
            {[
              { label: 'Provident Fund', value: payslip.pf_deduction },
              { label: 'ESI', value: payslip.esi_deduction },
              { label: 'Income Tax', value: payslip.income_tax },
              { label: 'Other Deductions', value: payslip.other_deductions },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', padding: '12px 15px',
                borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
                fontSize: 14,
              }}>
                <span>{item.label}</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(item.value)}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '12px 15px',
              background: 'rgba(217, 119, 6, 0.05)', fontWeight: 600, fontSize: 14,
              borderTop: '2px solid var(--border)',
            }}>
              <span>Total Deductions</span>
              <span style={{ color: '#d97706' }}>{formatCurrency(payslip.total_deductions)}</span>
            </div>
          </div>
        </div>

        {/* Net Salary */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,.1) 0%, rgba(34,197,94,.05) 100%)',
          border: '2px solid #22c55e', borderRadius: 'var(--radius)',
          padding: 20, marginBottom: 25, textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
            Net Salary (Take Home)
          </p>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#22c55e' }}>
            {formatCurrency(payslip.net_salary)}
          </p>
        </div>

        {/* Attendance */}
        {(payslip.working_days || payslip.present_days || payslip.absent_days || payslip.leave_days) && (
          <div style={{ marginBottom: 25 }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Attendance
            </h3>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10,
            }}>
              {[
                { label: 'Working Days', value: payslip.working_days, color: '#3b82f6' },
                { label: 'Present', value: payslip.present_days, color: '#22c55e' },
                { label: 'Absent', value: payslip.absent_days, color: '#ef4444' },
                { label: 'Leave', value: payslip.leave_days, color: '#f59e0b' },
              ].map((item, i) => (
                <div key={i} style={{
                  background: `rgba(${item.color}, 0.1)`, border: `1px solid ${item.color}30`,
                  borderRadius: 'var(--radius)', padding: 12, textAlign: 'center',
                }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {item.label}
                  </p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: item.color }}>
                    {item.value || '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remarks */}
        {payslip.remarks && (
          <div style={{
            background: 'var(--bg-secondary)', padding: 15, borderRadius: 'var(--radius)',
            marginBottom: 25, fontSize: 14,
          }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Remarks</p>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{payslip.remarks}</p>
          </div>
        )}

        {/* Timestamps */}
        <div style={{
          fontSize: 12, color: 'var(--text-secondary)', paddingTop: 15,
          borderTop: '1px solid var(--border)',
        }}>
          {payslip.released_at && (
            <p style={{ margin: '5px 0' }}>
              Released on {new Date(payslip.released_at).toLocaleDateString()}
            </p>
          )}
          {payslip.approved_at && (
            <p style={{ margin: '5px 0' }}>
              Approved on {new Date(payslip.approved_at).toLocaleDateString()}
            </p>
          )}
          {payslip.created_at && (
            <p style={{ margin: '5px 0' }}>
              Created on {new Date(payslip.created_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 25 }}>
          <button
            onClick={onDownload}
            disabled={downloading}
            style={{
              flex: 1, padding: '12px 20px',
              background: '#2563eb', border: 'none', color: 'white',
              borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 600,
              cursor: downloading ? 'not-allowed' : 'pointer', opacity: downloading ? 0.7 : 1,
            }}
          >
            {downloading ? 'Preparing…' : '⬇ Download PDF'}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px 20px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', color: 'var(--text-primary)',
            }}
            onMouseEnter={e => e.target.style.background = 'var(--border)'}
            onMouseLeave={e => e.target.style.background = 'var(--bg-secondary)'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PayslipPage() {
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [payslips, setPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPayslips();
  }, [year]);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('/api/payslips', {
        params: { year }
      });
      setPayslips(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load payslips');
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Group payslips by month
  const payslipsByMonth = {};
  payslips.forEach(ps => {
    payslipsByMonth[ps.month] = ps;
  });

  return (
    <div style={{ padding: '20px 30px' }}>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: 28, fontWeight: 700 }}>Payslips</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          View and download your monthly salary slips
        </p>
      </div>

      {/* Year Selector */}
      <div style={{ marginBottom: 25, display: 'flex', gap: 10 }}>
        {yearOptions.map(y => (
          <button
            key={y}
            onClick={() => setYear(y)}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius)',
              border: y === year ? '2px solid #2563eb' : '1px solid var(--border)',
              background: y === year ? 'rgba(37,99,235,.1)' : 'transparent',
              color: y === year ? '#2563eb' : 'var(--text-primary)',
              fontWeight: y === year ? 600 : 400, cursor: 'pointer', fontSize: 14,
            }}
            onMouseEnter={e => !!(y !== year) && (e.target.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => !!(y !== year) && (e.target.style.background = 'transparent')}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{
          textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)',
        }}>
          ⏳ Loading payslips...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
          borderRadius: 'var(--radius)', padding: 15, marginBottom: 20,
          color: '#dc2626', fontSize: 14,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && payslips.length === 0 && !error && (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)',
        }}>
          <p style={{ fontSize: 48, margin: '0 0 10px 0' }}>📄</p>
          <p style={{ margin: 0, fontSize: 16 }}>No payslips available for {year}</p>
        </div>
      )}

      {/* Payslips Grid */}
      {!loading && payslips.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
            const ps = payslipsByMonth[month];
            const monthName = MONTH_NAMES[month - 1];

            return (
              <div
                key={month}
                onClick={() => ps && setSelectedPayslip(ps)}
                style={{
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  padding: 20, cursor: ps ? 'pointer' : 'default',
                  background: ps ? 'white' : 'var(--bg-secondary)',
                  transition: 'all 0.2s',
                  opacity: ps ? 1 : 0.5,
                }}
                onMouseEnter={e => ps && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.1)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ marginBottom: 15 }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: 16, fontWeight: 600 }}>
                    {monthName}
                  </h3>
                  {ps && <StatusBadge status={ps.status} />}
                  {!ps && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Not available</span>}
                </div>

                {ps && (
                  <>
                    <div style={{ marginBottom: 15, fontSize: 14 }}>
                      <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>
                        Gross Salary
                      </p>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#2563eb' }}>
                        {formatCurrency(ps.gross_salary)}
                      </p>
                    </div>

                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      paddingTop: 15, borderTop: '1px solid var(--border)',
                      fontSize: 14,
                    }}>
                      <div>
                        <p style={{ margin: '0 0 5px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
                          Deductions
                        </p>
                        <p style={{ margin: 0, fontWeight: 600 }}>
                          {formatCurrency(ps.total_deductions)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 5px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
                          Net Salary
                        </p>
                        <p style={{ margin: 0, fontWeight: 700, color: '#22c55e', fontSize: 16 }}>
                          {formatCurrency(ps.net_salary)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedPayslip(ps);
                      }}
                      style={{
                        width: '100%', marginTop: 15, padding: '8px 12px',
                        background: '#2563eb', color: 'white', border: 'none',
                        borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => e.target.style.background = '#1d4ed8'}
                      onMouseLeave={e => e.target.style.background = '#2563eb'}
                    >
                      View Details
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payslip Detail Modal */}
      <PayslipModal payslip={selectedPayslip} onClose={() => setSelectedPayslip(null)} />
    </div>
  );
}
