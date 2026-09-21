/**
 * PayrollSettingsPage.jsx — Organization > Payroll > Statutory Settings
 *
 * PF / ESI / Professional Tax / TDS configuration. See backend
 * payroll_engine.py's compliance notice — these are editable defaults,
 * not guaranteed-current statutory figures; verify with your
 * finance/compliance team before relying on them for real payroll.
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function PayrollSettingsPage() {
  const { user } = useAuth();
  const canConfigure = (user?.permissions || []).includes('payroll.configure');

  const [config, setConfig] = useState(null);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    axios.get('/api/payroll-config/')
      .then(r => { setConfig(r.data.config); setStates(r.data.available_pt_states || []); })
      .catch(() => setError('Could not load payroll settings.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (section, field, value) => setConfig(c => ({ ...c, [section]: { ...c[section], [field]: value } }));

  const save = async (section) => {
    setError(''); setSaving(true);
    try {
      await axios.put('/api/payroll-config/', { [section]: config[section] });
      setSuccess('Saved.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (!canConfigure) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <div style={{ fontWeight: 600 }}>You don't have access to Payroll Settings.</div>
        </div>
      </div>
    );
  }

  if (loading || !config) {
    return <div className="page-container"><div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Loading…</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Statutory Settings</h1>
          <p className="page-subtitle">PF, ESI, Professional Tax and TDS configuration for payroll runs.</p>
        </div>
      </div>

      <div className="alert" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', marginBottom: 20 }}>
        ⚠️ These rates and slabs are editable defaults, not guaranteed-current statutory figures — confirm them with your
        finance/compliance team before relying on this for real payroll filings.
      </div>

      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* PF */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700 }}>Provident Fund (PF)</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={config.pf.enabled} onChange={e => set('pf', 'enabled', e.target.checked)} />
            Enabled
          </label>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Employer rate</label>
            <input type="number" step="0.01" value={config.pf.employer_rate} onChange={e => set('pf', 'employer_rate', parseFloat(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Employee rate</label>
            <input type="number" step="0.01" value={config.pf.employee_rate} onChange={e => set('pf', 'employee_rate', parseFloat(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Wage ceiling (₹)</label>
            <input type="number" value={config.pf.wage_ceiling} onChange={e => set('pf', 'wage_ceiling', parseFloat(e.target.value))} />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, marginBottom: 12 }}>
          <input type="checkbox" checked={config.pf.apply_ceiling} onChange={e => set('pf', 'apply_ceiling', e.target.checked)} />
          Apply wage ceiling (unchecked = PF on full basic)
        </label>
        <button className="btn btn-sm btn-primary" disabled={saving} onClick={() => save('pf')}>Save PF Settings</button>
      </div>

      {/* ESI */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700 }}>ESI</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={config.esi.enabled} onChange={e => set('esi', 'enabled', e.target.checked)} />
            Enabled
          </label>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Employer rate</label>
            <input type="number" step="0.0001" value={config.esi.employer_rate} onChange={e => set('esi', 'employer_rate', parseFloat(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Employee rate</label>
            <input type="number" step="0.0001" value={config.esi.employee_rate} onChange={e => set('esi', 'employee_rate', parseFloat(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Wage threshold (₹)</label>
            <input type="number" value={config.esi.wage_threshold} onChange={e => set('esi', 'wage_threshold', parseFloat(e.target.value))} />
          </div>
        </div>
        <button className="btn btn-sm btn-primary" disabled={saving} onClick={() => save('esi')}>Save ESI Settings</button>
      </div>

      {/* Professional Tax */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700 }}>Professional Tax</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={config.professional_tax.enabled} onChange={e => set('professional_tax', 'enabled', e.target.checked)} />
            Enabled
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">State</label>
          <select value={config.professional_tax.state || ''} onChange={e => set('professional_tax', 'state', e.target.value)}>
            {states.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
        </div>
        <button className="btn btn-sm btn-primary" disabled={saving} onClick={() => save('professional_tax')}>Save Professional Tax Settings</button>
      </div>

      {/* TDS */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700 }}>TDS (simplified estimate)</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={config.tds.enabled} onChange={e => set('tds', 'enabled', e.target.checked)} />
            Enabled
          </label>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Standard deduction (₹/yr)</label>
            <input type="number" value={config.tds.standard_deduction} onChange={e => set('tds', 'standard_deduction', parseFloat(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Rebate threshold (₹/yr taxable income)</label>
            <input type="number" value={config.tds.rebate_taxable_income_threshold} onChange={e => set('tds', 'rebate_taxable_income_threshold', parseFloat(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Cess rate</label>
            <input type="number" step="0.01" value={config.tds.cess_rate} onChange={e => set('tds', 'cess_rate', parseFloat(e.target.value))} />
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '0 0 12px' }}>
          Slab rates use the built-in default table (editable via the API's <code>slabs</code> field) — not shown here to keep this screen simple.
        </p>
        <button className="btn btn-sm btn-primary" disabled={saving} onClick={() => save('tds')}>Save TDS Settings</button>
      </div>
    </div>
  );
}
