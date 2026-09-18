/**
 * PayslipManagementPage.jsx
 * Payslip management for HR, Managers
 * - Create payslips
 * - List and filter payslips
 * - Edit payslips
 * - Approve/Release payslips
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

// Formats an ISO period_start/period_end pair into a short human range,
// e.g. "26 Sep – 25 Oct 2026".
function formatPeriodRange(periodStart, periodEnd) {
  if (!periodStart || !periodEnd) return null;
  const start = new Date(periodStart + 'T00:00:00');
  const end = new Date(periodEnd + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

// Downloads the generated payslip document (PDF if available, else DOCX)
// via an authenticated axios request and triggers a browser save, mirroring
// the blob-download pattern used elsewhere in the app (see TemplatesPage.jsx).
async function downloadPayslipDocument(payslipId, fallbackName) {
  const res = await axios.get(`/api/payslips/${payslipId}/download`, { responseType: 'blob' });
  const cd = res.headers && res.headers['content-disposition'];
  const match = cd && cd.match(/filename="?([^"]+)"?/);
  const filename = (match && match[1]) || fallbackName || 'payslip';
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Create Payslip Modal
function CreatePayslipModal({ employees, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basic: '',
    hra: '',
    da: '',
    allowances: '',
    pf_deduction: '',
    esi_deduction: '',
    income_tax: '',
    other_deductions: '',
    working_days: '',
    present_days: '',
    absent_days: '',
    leave_days: '',
    remarks: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_id) {
      setError('Please select an employee');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await axios.post('/api/payslips', formData);
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create payslip');
    } finally {
      setLoading(false);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius)', padding: 30,
        maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: 22 }}>Create Payslip</h2>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
            borderRadius: 'var(--radius)', padding: 12, marginBottom: 20,
            color: '#dc2626', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Employee */}
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Employee *
            </label>
            <select
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', fontSize: 14,
              }}
            >
              <option value="">Select employee...</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} - {emp.employee_id}
                </option>
              ))}
            </select>
          </div>

          {/* Month/Year */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Month
              </label>
              <select
                name="month"
                value={formData.month}
                onChange={handleChange}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', fontSize: 14,
                }}
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Year
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', fontSize: 14,
                }}
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Salary Components */}
          <div style={{ background: 'var(--bg-secondary)', padding: 15, borderRadius: 'var(--radius)', marginBottom: 15 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600 }}>Salary Components</h4>
            {[
              { label: 'Basic', name: 'basic' },
              { label: 'HRA', name: 'hra' },
              { label: 'DA', name: 'da' },
              { label: 'Allowances', name: 'allowances' },
            ].map(field => (
              <input
                key={field.name}
                type="number"
                name={field.name}
                placeholder={field.label}
                value={formData[field.name]}
                onChange={handleChange}
                step="0.01"
                style={{
                  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 8,
                }}
              />
            ))}
          </div>

          {/* Deductions */}
          <div style={{ background: 'var(--bg-secondary)', padding: 15, borderRadius: 'var(--radius)', marginBottom: 15 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600 }}>Deductions</h4>
            {[
              { label: 'Provident Fund', name: 'pf_deduction' },
              { label: 'ESI', name: 'esi_deduction' },
              { label: 'Income Tax', name: 'income_tax' },
              { label: 'Other Deductions', name: 'other_deductions' },
            ].map(field => (
              <input
                key={field.name}
                type="number"
                name={field.name}
                placeholder={field.label}
                value={formData[field.name]}
                onChange={handleChange}
                step="0.01"
                style={{
                  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 8,
                }}
              />
            ))}
          </div>

          {/* Attendance */}
          <div style={{ background: 'var(--bg-secondary)', padding: 15, borderRadius: 'var(--radius)', marginBottom: 15 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600 }}>Attendance</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                type="number"
                name="working_days"
                placeholder="Working Days"
                value={formData.working_days}
                onChange={handleChange}
                style={{
                  padding: '8px 10px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', fontSize: 13,
                }}
              />
              <input
                type="number"
                name="present_days"
                placeholder="Present Days"
                value={formData.present_days}
                onChange={handleChange}
                style={{
                  padding: '8px 10px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', fontSize: 13,
                }}
              />
              <input
                type="number"
                name="absent_days"
                placeholder="Absent Days"
                value={formData.absent_days}
                onChange={handleChange}
                style={{
                  padding: '8px 10px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', fontSize: 13,
                }}
              />
              <input
                type="number"
                name="leave_days"
                placeholder="Leave Days"
                value={formData.leave_days}
                onChange={handleChange}
                style={{
                  padding: '8px 10px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* Remarks */}
          <textarea
            name="remarks"
            placeholder="Remarks (optional)"
            value={formData.remarks}
            onChange={handleChange}
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 20,
              minHeight: 80, fontFamily: 'inherit',
            }}
          />

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1, padding: '10px 16px', background: '#2563eb', color: 'white',
                border: 'none', borderRadius: 'var(--radius)', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Creating...' : 'Create Payslip'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '10px 16px', background: 'var(--bg-secondary)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Payslip Action Buttons
function PayslipActions({
  payslip, onUpdate, onApprove, onRelease, userRole,
  onGenerate, onDownload, generating,
}) {
  const [updating, setUpdating] = useState(false);

  const canApprove = ['hr_head', 'admin'].includes(userRole) && payslip.status === 'generated';
  const canRelease = ['hr', 'hr_head', 'admin'].includes(userRole) && payslip.status === 'approved';
  const canGenerate = ['hr', 'hr_head', 'admin'].includes(userRole);
  const hasDoc = !!(payslip.docx_gridfs_id || payslip.pdf_gridfs_id);

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      {canGenerate && (
        <button
          onClick={() => onGenerate(payslip._id)}
          disabled={generating}
          style={{
            padding: '6px 12px', background: '#6366f1', color: 'white',
            border: 'none', borderRadius: '4px', fontSize: 12, fontWeight: 600,
            cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1,
          }}
          onMouseEnter={e => !generating && (e.target.style.background = '#4f46e5')}
          onMouseLeave={e => !generating && (e.target.style.background = '#6366f1')}
        >
          {generating ? 'Generating...' : hasDoc ? 'Regenerate' : 'Generate'}
        </button>
      )}
      {hasDoc && (
        <button
          onClick={() => onDownload(payslip)}
          style={{
            padding: '6px 12px', background: '#0ea5e9', color: 'white',
            border: 'none', borderRadius: '4px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.target.style.background = '#0284c7'}
          onMouseLeave={e => e.target.style.background = '#0ea5e9'}
        >
          Download
        </button>
      )}
      {canApprove && (
        <button
          onClick={() => onApprove(payslip._id)}
          style={{
            padding: '6px 12px', background: '#f59e0b', color: 'white',
            border: 'none', borderRadius: '4px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.target.style.background = '#d97706'}
          onMouseLeave={e => e.target.style.background = '#f59e0b'}
        >
          Approve
        </button>
      )}
      {canRelease && (
        <button
          onClick={() => onRelease(payslip._id)}
          style={{
            padding: '6px 12px', background: '#22c55e', color: 'white',
            border: 'none', borderRadius: '4px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.target.style.background = '#16a34a'}
          onMouseLeave={e => e.target.style.background = '#22c55e'}
        >
          Release
        </button>
      )}
    </div>
  );
}

export default function PayslipManagementPage() {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);

  // Payroll settings (pay-cycle policy)
  const canManagePolicy = ['admin', 'hr_head'].includes(user?.role);
  const [showSettings, setShowSettings] = useState(false);
  const [policy, setPolicy] = useState(null);
  const [policyDraft, setPolicyDraft] = useState(1);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyError, setPolicyError] = useState('');

  // Filters
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState('');

  useEffect(() => {
    fetchPayslips();
    fetchEmployees();
  }, [filterEmployee, filterStatus, filterYear, filterMonth]);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filterEmployee) params.employee_id = filterEmployee;
      if (filterStatus) params.status = filterStatus;
      if (filterYear) params.year = filterYear;
      if (filterMonth) params.month = filterMonth;

      const res = await axios.get('/api/payslips', { params });
      setPayslips(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get('/api/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to load employees');
    }
  };

  const handleApprove = async (payslipId) => {
    try {
      const res = await axios.post(`/api/payslips/${payslipId}/approve`);
      setPayslips(payslips.map(p => p._id === payslipId ? res.data : p));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve');
    }
  };

  const handleRelease = async (payslipId) => {
    try {
      const res = await axios.post(`/api/payslips/${payslipId}/release`);
      setPayslips(payslips.map(p => p._id === payslipId ? res.data : p));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to release');
    }
  };

  const handlePayslipCreated = (newPayslip) => {
    setPayslips([newPayslip, ...payslips]);
    fetchPayslips();
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleGenerate = async (payslipId) => {
    try {
      setGeneratingId(payslipId);
      const res = await axios.post(`/api/payslips/${payslipId}/generate`);
      setPayslips(prev => prev.map(p => p._id === payslipId ? res.data : p));
      showSuccess('Payslip document generated successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate payslip document');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDownload = async (payslip) => {
    try {
      const fallback = `payslip_${payslip.year}_${String(payslip.month).padStart(2, '0')}`;
      await downloadPayslipDocument(payslip._id, fallback);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to download payslip document. It may not have been generated yet.');
    }
  };

  const fetchPolicy = async () => {
    try {
      setPolicyLoading(true);
      setPolicyError('');
      const res = await axios.get('/api/payslips/policy');
      setPolicy(res.data);
      setPolicyDraft(res.data.pay_cycle_start_day);
    } catch (err) {
      setPolicyError(err.response?.data?.error || 'Failed to load payroll settings');
    } finally {
      setPolicyLoading(false);
    }
  };

  const toggleSettings = () => {
    const next = !showSettings;
    setShowSettings(next);
    if (next) fetchPolicy();
  };

  const handleSavePolicy = async () => {
    const day = parseInt(policyDraft, 10);
    if (!day || day < 1 || day > 31) {
      setPolicyError('Please enter a valid day between 1 and 31.');
      return;
    }
    try {
      setPolicySaving(true);
      setPolicyError('');
      const res = await axios.put('/api/payslips/policy', { pay_cycle_start_day: day });
      setPolicy(res.data);
      setPolicyDraft(res.data.pay_cycle_start_day);
      showSuccess('Payroll settings updated.');
    } catch (err) {
      setPolicyError(err.response?.data?.error || 'Failed to save payroll settings');
    } finally {
      setPolicySaving(false);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div style={{ padding: '20px 30px' }}>
      <div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 10px 0', fontSize: 28, fontWeight: 700 }}>Payslip Management</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Create and manage employee payslips
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {canManagePolicy && (
            <button
              onClick={toggleSettings}
              style={{
                padding: '10px 20px', background: showSettings ? 'var(--border)' : 'var(--bg-secondary)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontWeight: 600,
                cursor: 'pointer', fontSize: 14,
              }}
            >
              ⚙ Payroll Settings
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '10px 20px', background: '#2563eb', color: 'white',
              border: 'none', borderRadius: 'var(--radius)', fontWeight: 600,
              cursor: 'pointer', fontSize: 14,
            }}
            onMouseEnter={e => e.target.style.background = '#1d4ed8'}
            onMouseLeave={e => e.target.style.background = '#2563eb'}
          >
            + Create Payslip
          </button>
        </div>
      </div>

      {/* Payroll Settings Panel */}
      {showSettings && canManagePolicy && (
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: 20, marginBottom: 25,
        }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 700 }}>Payroll Settings</h3>
          <p style={{ margin: '0 0 15px 0', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 640 }}>
            Set the day of the month the pay cycle starts on. Day 1 means a standard calendar
            month (1st to the last day). Any other day — e.g. 26 — means the pay period runs
            from that day of one month to one day before that same day the next month
            (e.g. 26 Sep – 25 Oct).
          </p>
          {policyLoading ? (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading...</div>
          ) : (
            <>
              {policyError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
                  borderRadius: 'var(--radius)', padding: 10, marginBottom: 12,
                  color: '#dc2626', fontSize: 13,
                }}>
                  {policyError}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Pay cycle starts on day
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={policyDraft}
                    onChange={e => setPolicyDraft(e.target.value)}
                    style={{
                      width: 100, padding: '8px 10px', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', fontSize: 14,
                    }}
                  />
                </div>
                <button
                  onClick={handleSavePolicy}
                  disabled={policySaving}
                  style={{
                    padding: '9px 18px', background: '#2563eb', color: 'white',
                    border: 'none', borderRadius: 'var(--radius)', fontWeight: 600,
                    cursor: policySaving ? 'not-allowed' : 'pointer', opacity: policySaving ? 0.6 : 1,
                    fontSize: 13,
                  }}
                >
                  {policySaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              {policy && (
                <p style={{ margin: '12px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                  Current setting: day {policy.pay_cycle_start_day}
                  {policy.pay_cycle_start_day === 1 ? ' (calendar month)' : ''}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{
        background: 'var(--bg-secondary)', padding: 20, borderRadius: 'var(--radius)',
        marginBottom: 25, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 15,
      }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Employee
          </label>
          <select
            value={filterEmployee}
            onChange={e => setFilterEmployee(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', fontSize: 13,
            }}
          >
            <option value="">All employees</option>
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Status
          </label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', fontSize: 13,
            }}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="generated">Generated</option>
            <option value="approved">Approved</option>
            <option value="released">Released</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Year
          </label>
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', fontSize: 13,
            }}
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Month
          </label>
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', fontSize: 13,
            }}
          >
            <option value="">All months</option>
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
          borderRadius: 'var(--radius)', padding: 15, marginBottom: 20,
          color: '#dc2626', fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Success */}
      {successMsg && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e',
          borderRadius: 'var(--radius)', padding: 15, marginBottom: 20,
          color: '#16a34a', fontSize: 14,
        }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
          ⏳ Loading payslips...
        </div>
      )}

      {/* Table */}
      {!loading && payslips.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse', fontSize: 14,
          }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: 600 }}>Employee</th>
                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: 600 }}>Month</th>
                <th style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 600 }}>Gross</th>
                <th style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 600 }}>Deductions</th>
                <th style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 600 }}>Net</th>
                <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((ps, i) => (
                <tr key={ps._id} style={{
                  borderBottom: '1px solid var(--border)',
                  background: i % 2 === 0 ? 'white' : 'var(--bg-secondary)',
                }}>
                  <td style={{ padding: '12px 15px' }}>
                    <div style={{ fontWeight: 600 }}>{ps.employee_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ps.employee_code}</div>
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    {MONTH_NAMES[ps.month - 1]} {ps.year}
                    {formatPeriodRange(ps.period_start, ps.period_end) && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {formatPeriodRange(ps.period_start, ps.period_end)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(ps.gross_salary)}
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'right', color: '#d97706' }}>
                    {formatCurrency(ps.total_deductions)}
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>
                    {formatCurrency(ps.net_salary)}
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                    <StatusBadge status={ps.status} />
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                    <PayslipActions
                      payslip={ps}
                      userRole={user?.role}
                      onApprove={handleApprove}
                      onRelease={handleRelease}
                      onGenerate={handleGenerate}
                      onDownload={handleDownload}
                      generating={generatingId === ps._id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && payslips.length === 0 && !error && (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)',
        }}>
          <p style={{ fontSize: 48, margin: '0 0 10px 0' }}>📄</p>
          <p style={{ margin: 0, fontSize: 16 }}>No payslips found</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePayslipModal
          employees={employees}
          onClose={() => setShowCreateModal(false)}
          onCreated={handlePayslipCreated}
        />
      )}
    </div>
  );
}
