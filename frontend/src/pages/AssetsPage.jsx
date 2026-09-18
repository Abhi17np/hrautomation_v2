/**
 * AssetsPage.jsx — Organization > Assets
 *
 * Company equipment inventory: list, create, assign / unassign to
 * employees, filter by status. admin / hr / hr_head can manage;
 * manager / employee get a read-only table.
 */

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const MANAGE_ROLES = ['admin', 'hr', 'hr_head'];

const CATEGORIES = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'phone', label: 'Phone' },
  { value: 'peripheral', label: 'Peripheral' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'other', label: 'Other' },
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

const STATUS_BADGE = {
  available: { cls: 'badge-green', label: 'Available' },
  assigned: { cls: 'badge-blue', label: 'Assigned' },
  maintenance: { cls: 'badge-amber', label: 'Maintenance' },
  retired: { cls: 'badge-gray', label: 'Retired' },
};

const STATUS_FILTERS = [
  ['all', 'All'],
  ['available', 'Available'],
  ['assigned', 'Assigned'],
  ['maintenance', 'Maintenance'],
  ['retired', 'Retired'],
];

const EMPTY_FORM = { name: '', category: 'laptop', serial_number: '', purchase_date: '', notes: '' };

function Badge({ status }) {
  const c = STATUS_BADGE[status] || { cls: 'badge-gray', label: status || '—' };
  return <span className={`badge ${c.cls}`}>{c.label}</span>;
}

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

// ─── Add Asset Modal ──────────────────────────────────────────────────────────
function AddAssetModal({ onClose, onDone }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await axios.post('/api/assets/', form);
      onDone('Asset added.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create asset');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Add Asset</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Asset Name *</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. MacBook Air M2" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Serial Number</label>
              <input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Purchase Date</label>
            <input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create Asset'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────
function AssignModal({ asset, onClose, onDone }) {
  const [employees, setEmployees] = useState([]);
  const [loadingEmp, setLoadingEmp] = useState(true);
  const [empId, setEmpId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/employees/')
      .then(r => setEmployees(r.data || []))
      .catch(() => setEmployees([]))
      .finally(() => setLoadingEmp(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!empId) { setError('Select an employee to assign this asset to.'); return; }
    setError(''); setLoading(true);
    try {
      await axios.post(`/api/assets/${asset._id}/assign`, { employee_id: empId });
      onDone(`${asset.name} assigned.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not assign asset');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Assign Asset</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
          Assigning <strong style={{ color: 'var(--text)' }}>{asset.name}</strong>
          {asset.serial_number ? ` (${asset.serial_number})` : ''}
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Employee *</label>
            {loadingEmp ? (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 0' }}>Loading employees…</div>
            ) : (
              <select required value={empId} onChange={e => setEmpId(e.target.value)}>
                <option value="">— Select employee —</option>
                {employees.map(e => (
                  <option key={e._id} value={e._id}>
                    {e.name}{e.employee_id ? ` (${e.employee_id})` : ''}{e.designation ? ` — ${e.designation}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || loadingEmp}>{loading ? 'Assigning…' : 'Assign'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main AssetsPage ──────────────────────────────────────────────────────────
export default function AssetsPage() {
  const { user } = useAuth();
  const canManage = MANAGE_ROLES.includes(user?.role);

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [assignAsset, setAssignAsset] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = (status = statusFilter) => {
    setLoading(true);
    const params = status !== 'all' ? { status } : {};
    axios.get('/api/assets/', { params })
      .then(r => setAssets(r.data || []))
      .catch(() => setError('Could not load assets.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(statusFilter); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  const notify = (msg) => { setSuccess(msg); setShowAdd(false); setAssignAsset(null); load(); setTimeout(() => setSuccess(''), 3000); };

  const unassign = async (asset) => {
    setError(''); setBusyId(asset._id);
    try {
      await axios.post(`/api/assets/${asset._id}/unassign`);
      notify(`${asset.name} unassigned.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not unassign asset');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return assets;
    const q = search.toLowerCase();
    return assets.filter(a =>
      a.name?.toLowerCase().includes(q) ||
      a.serial_number?.toLowerCase().includes(q) ||
      a.assigned_to_name?.toLowerCase().includes(q) ||
      CATEGORY_LABEL[a.category]?.toLowerCase().includes(q)
    );
  }, [assets, search]);

  const counts = useMemo(() => ({
    all: assets.length,
    available: assets.filter(a => a.status === 'available').length,
    assigned: assets.filter(a => a.status === 'assigned').length,
  }), [assets]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Assets</h1>
          <p className="page-subtitle">{counts.all} total · {counts.available} available · {counts.assigned} assigned</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Asset</button>
        )}
      </div>

      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Search name, serial, assignee…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 180 }}>
          {STATUS_FILTERS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🖥</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No assets found</div>
              {canManage && statusFilter === 'all' && !search && (
                <p>Click <strong>+ Add Asset</strong> to register your first item.</p>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Serial Number</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td>{CATEGORY_LABEL[a.category] || a.category}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{a.serial_number || '—'}</td>
                    <td><Badge status={a.status} /></td>
                    <td>{a.assigned_to_name || '—'}</td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {a.status !== 'assigned' && (
                            <button className="btn btn-sm btn-secondary" onClick={() => setAssignAsset(a)}>Assign</button>
                          )}
                          {a.status === 'assigned' && (
                            <button className="btn btn-sm btn-secondary" disabled={busyId === a._id}
                              onClick={() => unassign(a)}>
                              {busyId === a._id ? 'Unassigning…' : 'Unassign'}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAdd && <AddAssetModal onClose={() => setShowAdd(false)} onDone={notify} />}
      {assignAsset && <AssignModal asset={assignAsset} onClose={() => setAssignAsset(null)} onDone={notify} />}
    </div>
  );
}
