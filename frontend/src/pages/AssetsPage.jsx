import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const STATUS_META = {
  available:   { label: 'Available',   cls: 'badge-green' },
  assigned:    { label: 'Assigned',    cls: 'badge-blue' },
  maintenance: { label: 'Maintenance', cls: 'badge-amber' },
  retired:     { label: 'Retired',     cls: 'badge-gray' },
};

function StatusPill({ status }) {
  const m = STATUS_META[status] || { label: status, cls: 'badge-gray' };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

// ─── Add asset modal ─────────────────────────────────────────────────────────
function AddAssetModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ category: '', brand: '', model: '', serial_number: '', purchase_date: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.category.trim()) { setError('Category is required'); return; }
    setSaving(true); setError('');
    try {
      await axios.post('/api/assets/', form);
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not add asset');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <h3 className="modal-title">Add Asset</h3>
        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
        <div className="form-group">
          <label className="form-label">Category</label>
          <input value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Laptop, Access Card, SIM" />
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Brand</label><input value={form.brand} onChange={e => set('brand', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Model</label><input value={form.model} onChange={e => set('model', e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Serial Number</label><input value={form.serial_number} onChange={e => set('serial_number', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Purchase Date</label><input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add Asset'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign modal ─────────────────────────────────────────────────────────────
function AssignModal({ asset, onClose, onSaved }) {
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/employees/', { params: { status: 'active' } }).then(r => setEmployees(r.data)).catch(() => {});
  }, []);

  const save = async () => {
    if (!employeeId) { setError('Select an employee'); return; }
    setSaving(true); setError('');
    try {
      await axios.post(`/api/assets/${asset._id}/assign`, { employee_id: employeeId });
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not assign asset');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <h3 className="modal-title">Assign {asset.asset_tag}</h3>
        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
        <div className="form-group">
          <label className="form-label">Employee</label>
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
            <option value="">Select…</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.employee_id})</option>)}
          </select>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Assigning…' : 'Assign'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Return modal ─────────────────────────────────────────────────────────────
function ReturnModal({ asset, onClose, onSaved }) {
  const [condition, setCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      await axios.post(`/api/assets/${asset._id}/return`, { condition, notes });
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not process return');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <h3 className="modal-title">Return {asset.asset_tag}</h3>
        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
        <div className="form-group">
          <label className="form-label">Condition on return</label>
          <select value={condition} onChange={e => setCondition(e.target.value)}>
            <option value="good">Good</option>
            <option value="needs_repair">Needs Repair</option>
            <option value="damaged">Damaged</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Confirm Return'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Asset table (shared by all views) ────────────────────────────────────────
function AssetTable({ assets, showActions, onAssign, onReturn }) {
  if (assets.length === 0) {
    return <div className="empty-state" style={{ padding: '32px 16px' }}><p style={{ margin: 0 }}>No assets found.</p></div>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tag</th><th>Category</th><th>Brand / Model</th><th>Serial</th>
            <th>Status</th><th>Assigned To</th>{showActions && <th></th>}
          </tr>
        </thead>
        <tbody>
          {assets.map(a => (
            <tr key={a._id}>
              <td style={{ fontFamily: 'var(--mono)' }}>{a.asset_tag}</td>
              <td>{a.category}</td>
              <td>{[a.brand, a.model].filter(Boolean).join(' ') || '—'}</td>
              <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{a.serial_number || '—'}</td>
              <td><StatusPill status={a.status} /></td>
              <td>{a.assigned_to_name || '—'}</td>
              {showActions && (
                <td style={{ textAlign: 'right' }}>
                  {a.status === 'assigned' ? (
                    <button className="btn btn-secondary btn-sm" onClick={() => onReturn(a)}>Return</button>
                  ) : a.status === 'available' ? (
                    <button className="btn btn-primary btn-sm" onClick={() => onAssign(a)}>Assign</button>
                  ) : null}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Employee: My Assets ──────────────────────────────────────────────────────
function MyAssetsView() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/assets/my').then(r => setAssets(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">My Assets</div>
          <div className="page-subtitle">Company equipment currently assigned to you.</div>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state" style={{ padding: '32px 16px' }}><p>Loading…</p></div>
          : <AssetTable assets={assets} showActions={false} />}
      </div>
    </div>
  );
}

// ─── Manager: Team + own assets (read-only) ───────────────────────────────────
function TeamAssetsView() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/assets/').then(r => setAssets(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Team Assets</div>
          <div className="page-subtitle">Equipment assigned to you and your direct reports.</div>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state" style={{ padding: '32px 16px' }}><p>Loading…</p></div>
          : <AssetTable assets={assets} showActions={false} />}
      </div>
    </div>
  );
}

// ─── Admin / HR / HR Head: full register ──────────────────────────────────────
function RegisterView() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | {assign: asset} | {return: asset}
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    axios.get('/api/assets/', { params: statusFilter ? { status: statusFilter } : {} })
      .then(r => setAssets(r.data))
      .catch(() => setError('Could not load assets'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  const counts = assets.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Asset Register</div>
          <div className="page-subtitle">Company equipment — laptops, access cards, SIMs, and more.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add Asset</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['', `All (${assets.length})`], ['available', `Available (${counts.available || 0})`],
          ['assigned', `Assigned (${counts.assigned || 0})`], ['maintenance', `Maintenance (${counts.maintenance || 0})`],
          ['retired', `Retired (${counts.retired || 0})`]].map(([val, lbl]) => (
          <button key={val} className={`btn btn-sm ${statusFilter === val ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(val)}>
            {lbl}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <div className="empty-state" style={{ padding: '32px 16px' }}><p>Loading…</p></div>
          : <AssetTable assets={assets} showActions
              onAssign={a => setModal({ assign: a })}
              onReturn={a => setModal({ return: a })} />}
      </div>

      {modal === 'add' && <AddAssetModal onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.assign && <AssignModal asset={modal.assign} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.return && <ReturnModal asset={modal.return} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}

export default function AssetsPage() {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  if (['admin', 'hr', 'hr_head'].includes(role)) return <RegisterView />;
  if (role === 'manager') return <TeamAssetsView />;
  return <MyAssetsView />;
}
