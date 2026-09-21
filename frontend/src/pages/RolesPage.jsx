/**
 * RolesPage.jsx — Organization > Roles & Permissions
 *
 * Lets a company admin see the 5 system roles, edit any role's permission
 * set, and add custom roles (e.g. "HR Associate") that behave as a chosen
 * base role on legacy endpoints while carrying their own permission set
 * for anything permission-gated (the approval workflow engine, this page
 * itself).
 */

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const BASE_ROLE_LABEL = {
  admin: 'Admin', hr: 'HR', hr_head: 'HR Head', manager: 'Manager', employee: 'Employee',
};

function PermissionGrid({ catalog, selected, onToggle, disabled }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Object.entries(catalog).map(([module, perms]) => (
        <div key={module}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
            {module}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {perms.map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: disabled ? 'default' : 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selected.includes(key)}
                  disabled={disabled}
                  onChange={() => onToggle(key)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RoleModal({ role, catalog, baseRoles, onClose, onDone }) {
  const isNew = !role;
  const [name, setName] = useState(role?.name || '');
  const [baseRole, setBaseRole] = useState(role?.base_role || 'employee');
  const [perms, setPerms] = useState(role?.permissions || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (key) => setPerms(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      if (isNew) {
        await axios.post('/api/roles/', { name, base_role: baseRole, permissions: perms });
      } else {
        await axios.put(`/api/roles/${role._id}`, { name, permissions: perms });
      }
      onDone(isNew ? `Role "${name}" created.` : `Role "${name}" updated.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save role');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{isNew ? 'New Role' : `Edit ${role.name}`}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. HR Associate" />
            </div>
            <div className="form-group">
              <label className="form-label">Behaves As *</label>
              <select
                required
                value={baseRole}
                disabled={!isNew}
                onChange={e => setBaseRole(e.target.value)}
              >
                {baseRoles.map(r => <option key={r} value={r}>{BASE_ROLE_LABEL[r] || r}</option>)}
              </select>
            </div>
          </div>
          {isNew && (
            <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '-6px 0 16px' }}>
              Controls access on older pages not yet driven by the permission list below (can't be changed later — create a new role instead).
            </p>
          )}
          <div style={{ fontSize: 12.5, fontWeight: 600, margin: '4px 0 10px' }}>Permissions</div>
          <PermissionGrid catalog={catalog} selected={perms} onToggle={toggle} disabled={role?.is_system && role?.key === 'admin'} />
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Create Role' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RolesPage() {
  const { user } = useAuth();
  const canManage = (user?.permissions || []).includes('roles.manage');

  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState({});
  const [baseRoles, setBaseRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRole, setEditRole] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      axios.get('/api/roles/'),
      axios.get('/api/roles/permissions-catalog'),
    ]).then(([rolesRes, catRes]) => {
      setRoles(rolesRes.data || []);
      setCatalog(catRes.data.catalog || {});
      setBaseRoles(catRes.data.base_roles || []);
    }).catch(() => setError('Could not load roles.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const notify = (msg) => { setSuccess(msg); setEditRole(null); setShowNew(false); load(); setTimeout(() => setSuccess(''), 3000); };

  const del = async (role) => {
    if (!window.confirm(`Delete role "${role.name}"? Users on it must be reassigned first.`)) return;
    setError('');
    try {
      await axios.delete(`/api/roles/${role._id}`);
      notify(`Role "${role.name}" deleted.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete role');
    }
  };

  const permCount = useMemo(() => Object.values(catalog).reduce((n, p) => n + p.length, 0), [catalog]);

  if (!canManage) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <div style={{ fontWeight: 600 }}>You don't have access to Roles & Permissions.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Roles & Permissions</h1>
          <p className="page-subtitle">{roles.length} roles · {permCount} permissions available</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ New Role</button>
      </div>

      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Loading…</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Behaves As</th>
                  <th>Permissions</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(r => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td>{BASE_ROLE_LABEL[r.base_role] || r.base_role}</td>
                    <td>{r.permissions?.length || 0} of {permCount}</td>
                    <td>
                      <span className={`badge ${r.is_system ? 'badge-gray' : 'badge-blue'}`}>
                        {r.is_system ? 'System' : 'Custom'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditRole(r)}>Edit</button>
                        {!r.is_system && (
                          <button className="btn btn-sm btn-secondary" onClick={() => del(r)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(editRole || showNew) && (
        <RoleModal
          role={editRole}
          catalog={catalog}
          baseRoles={baseRoles}
          onClose={() => { setEditRole(null); setShowNew(false); }}
          onDone={notify}
        />
      )}
    </div>
  );
}
