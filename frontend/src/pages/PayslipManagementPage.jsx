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
  const [autoFilled, setAutoFilled] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillError, setAutoFillError] = useState('');
  const [salaryInfo, setSalaryInfo] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Suggest real earnings + attendance for this employee/month — the
  // employee's salary structure (from CTC) and actual attendance, so HR
  // reviews real numbers instead of typing from memory. Any field HR
  // edits afterward is respected; this only fills the starting point.
  useEffect(() => {
    if (!formData.employee_id || !formData.month || !formData.year) return;
    setAutoFilling(true);
    setAutoFillError('');
    axios.get('/api/payslips/auto-fill', {
      params: { employee_id: formData.employee_id, month: formData.month, year: formData.year },
    })
      .then(res => {
        // has_salary_source/ctc_annual/*_monthly_full/proration are UI-only
        // hints, not payslip fields — pull them out before merging the rest
        // (basic/hra/da/attendance) into the editable form.
        const { has_salary_source, ctc_annual, basic_monthly_full, hra_monthly_full, da_monthly_full, proration, ...fields } = res.data;
        setFormData(prev => ({ ...prev, ...fields }));
        setSalaryInfo({ has_salary_source, ctc_annual, basic_monthly_full, hra_monthly_full, da_monthly_full, proration });
        setAutoFilled(true);
      })
      .catch(err => {
        setAutoFilled(false);
        setSalaryInfo(null);
        setAutoFillError(
          err.response?.status === 404
            ? 'Auto-fill isn\'t available yet — the backend may need to be restarted after the update.'
            : (err.response?.data?.error || 'Could not load suggested values — you can still enter them manually.')
        );
      })
      .finally(() => setAutoFilling(false));
  }, [formData.employee_id, formData.month, formData.year]);

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
            {formData.employee_id && (
              <div style={{ fontSize: 11.5, marginTop: 5, color: (autoFillError || (autoFilled && salaryInfo && !salaryInfo.has_salary_source)) ? '#d97706' : 'var(--text-secondary)' }}>
                {autoFilling ? 'Loading salary structure and attendance…'
                  : autoFillError ? `⚠ ${autoFillError}`
                  : autoFilled && salaryInfo && !salaryInfo.has_salary_source
                    ? '⚠ No CTC or offer letter on file for this employee — enter Basic/HRA/DA manually below.'
                  : autoFilled ? '✓ Earnings and attendance below are auto-filled from this employee\'s CTC and actual attendance — review and adjust before saving.'
                  : null}
              </div>
            )}

            {/* CTC breakdown — the salary structure the Basic/HRA/DA fields
                below were derived from, so HR can see where the numbers
                came from instead of just the filled-in totals. Refreshes
                automatically whenever employee/month/year changes. */}
            {autoFilled && salaryInfo?.has_salary_source && (
              <div style={{
                marginTop: 8, padding: '10px 12px', background: 'var(--bg-secondary)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  CTC Breakdown — {formatCurrency(salaryInfo.ctc_annual)} / year
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <div><div style={{ color: 'var(--text-secondary)' }}>Basic /mo</div>{formatCurrency(salaryInfo.basic_monthly_full)}</div>
                  <div><div style={{ color: 'var(--text-secondary)' }}>HRA /mo</div>{formatCurrency(salaryInfo.hra_monthly_full)}</div>
                  <div><div style={{ color: 'var(--text-secondary)' }}>DA /mo</div>{formatCurrency(salaryInfo.da_monthly_full)}</div>
                </div>
                {salaryInfo.proration < 1 && (
                  <div style={{ marginTop: 6, color: '#d97706' }}>
                    ⚠ Prorated to {Math.round(salaryInfo.proration * 100)}% for this month's attendance — the amounts below are lower than the full monthly figures above.
                  </div>
                )}
              </div>
            )}
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
function PayslipActions({ payslip, onApprove, onRelease, onDownload, userRole }) {
  const canApprove = ['hr_head', 'admin'].includes(userRole) && payslip.status === 'generated';
  const canRelease = ['hr', 'hr_head', 'admin'].includes(userRole) && payslip.status === 'approved';

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      <button
        onClick={() => onDownload(payslip)}
        style={{
          padding: '6px 12px', background: 'white', color: '#374151',
          border: '1px solid var(--border)', borderRadius: '4px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        ⬇ PDF
      </button>
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

// Run Payroll Modal — generates the whole month for every active employee
// in one action, the way an actual payroll cycle works, instead of
// creating payslips one employee at a time.
function RunPayrollModal({ onClose, onRun }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/payslips/run', { month, year });
      onRun(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Payroll run failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius)', padding: 30,
        maxWidth: 420, width: '100%',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 20 }}>Run Payroll</h2>
        <p style={{ margin: '0 0 20px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
          Generates a draft payslip for every active employee for the selected month, using each
          employee's salary structure and actual attendance. Employees who already have a payslip
          for that month are skipped, not overwritten.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
            borderRadius: 'var(--radius)', padding: 12, marginBottom: 16,
            color: '#dc2626', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Month</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}
            >
              {MONTH_NAMES.map((m, i) => (<option key={i} value={i + 1}>{m}</option>))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Year</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}
            >
              {yearOptions.map(y => (<option key={y} value={y}>{y}</option>))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={submit}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 16px', background: '#2563eb', color: 'white',
              border: 'none', borderRadius: 'var(--radius)', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Running…' : 'Run Payroll'}
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
      </div>
    </div>
  );
}

export default function PayslipManagementPage() {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRunPayroll, setShowRunPayroll] = useState(false);

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

  const handlePayrollRun = (result) => {
    alert(result.message);
    fetchPayslips();
  };

  const downloadPayslip = async (payslip) => {
    try {
      const res = await axios.get(`/api/payslips/${payslip._id}/download`, {
        params: { format: 'pdf' },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${payslip.employee_code || payslip.employee_id}_${payslip.month}_${payslip.year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      let msg = 'Download failed.';
      try {
        const text = await err.response?.data?.text?.();
        if (text) msg = JSON.parse(text).error || msg;
      } catch { /* blob wasn't JSON */ }
      alert(msg);
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
          <button
            onClick={() => setShowRunPayroll(true)}
            style={{
              padding: '10px 20px', background: 'white', color: '#2563eb',
              border: '1.5px solid #2563eb', borderRadius: 'var(--radius)', fontWeight: 600,
              cursor: 'pointer', fontSize: 14,
            }}
          >
            ▶ Run Payroll
          </button>
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
                      onDownload={downloadPayslip}
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

      {/* Run Payroll Modal */}
      {showRunPayroll && (
        <RunPayrollModal
          onClose={() => setShowRunPayroll(false)}
          onRun={handlePayrollRun}
        />
      )}
    </div>
  );
}
