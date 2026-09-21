/**
 * WorkflowsPage.jsx — Organization > Approval Workflows
 *
 * Lets a company admin configure the stage chain for each approval
 * process (offer letters, appointment orders, exit resignations):
 * reorder stages, rename them, pick which role approves each one, add/
 * remove stages, and toggle self-approval. Backed by workflow_engine.py —
 * every stage's status strings are computed server-side on save so the
 * rest of the app (status badges, doc-gen gates) keeps working.
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const PROCESS_LABEL = {
  offer_letter:      { name: 'Offer Letters',      desc: 'Approval chain a generated offer letter goes through before it can be sent to a candidate.' },
  appointment_order:  { name: 'Appointment Orders', desc: 'Approval chain an appointment order goes through before it can be issued.' },
  exit_resignation:   { name: 'Exit / Resignation', desc: 'Approval chain an employee’s resignation goes through before notice period begins.' },
};

function emptyStage(n) {
  return {
    stage_key: `stage_${n}`, name: '', approver_role_id: '',
    allow_self_approval: true,
  };
}

function ProcessCard({ definition, roles, onSave, onReset }) {
  const [stages, setStages] = useState(definition.stages.map(s => ({ ...s })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const meta = PROCESS_LABEL[definition.process_type] || { name: definition.process_type, desc: '' };

  useEffect(() => { setStages(definition.stages.map(s => ({ ...s }))); }, [definition]);

  const update = (i, field, value) => setStages(s => s.map((st, idx) => idx === i ? { ...st, [field]: value } : st));

  const move = (i, dir) => setStages(s => {
    const arr = [...s];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return arr;
  });

  const removeStage = (i) => setStages(s => s.length <= 1 ? s : s.filter((_, idx) => idx !== i));
  const addStage = () => setStages(s => [...s, emptyStage(s.length + 1)]);

  const save = async () => {
    setError('');
    if (stages.some(s => !s.name.trim() || !s.approver_role_id)) {
      setError('Every stage needs a name and an approver role.');
      return;
    }
    setSaving(true);
    try {
      await onSave(definition.process_type, stages);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save workflow');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 20, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{meta.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{meta.desc}</div>
        </div>
        <button className="btn btn-sm btn-secondary" onClick={() => onReset(definition.process_type)}>
          Restore Default
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ margin: '12px 0' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {stages.map((stage, i) => (
          <div key={stage.stage_key} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent, #3E7BFA)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {i + 1}
            </div>
            <input
              value={stage.name}
              onChange={e => update(i, 'name', e.target.value)}
              placeholder="Stage name, e.g. HR Associate Review"
              style={{ flex: 2, minWidth: 0 }}
            />
            <select
              value={stage.approver_role_id}
              onChange={e => update(i, 'approver_role_id', e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            >
              <option value="">— Approver role —</option>
              {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, whiteSpace: 'nowrap', color: 'var(--text-dim)' }}>
              <input
                type="checkbox"
                checked={!stage.allow_self_approval}
                onChange={e => update(i, 'allow_self_approval', !e.target.checked)}
              />
              Block self-approval
            </label>
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <button type="button" className="btn-icon" disabled={i === 0} onClick={() => move(i, -1)} title="Move up">↑</button>
              <button type="button" className="btn-icon" disabled={i === stages.length - 1} onClick={() => move(i, 1)} title="Move down">↓</button>
              <button type="button" className="btn-icon" disabled={stages.length <= 1} onClick={() => removeStage(i)} title="Remove stage">✕</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
        <button type="button" className="btn btn-sm btn-secondary" onClick={addStage}>+ Add Stage</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save Workflow'}
        </button>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const { user } = useAuth();
  const canManage = (user?.permissions || []).includes('workflows.manage');

  const [definitions, setDefinitions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([axios.get('/api/workflows/'), axios.get('/api/roles/')])
      .then(([wfRes, rolesRes]) => {
        setDefinitions(wfRes.data || []);
        setRoles(rolesRes.data || []);
      })
      .catch(() => setError('Could not load workflow configuration.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const notify = (msg) => { setSuccess(msg); load(); setTimeout(() => setSuccess(''), 3000); };

  const saveWorkflow = async (processType, stages) => {
    await axios.put(`/api/workflows/${processType}`, { stages });
    notify('Workflow updated.');
  };

  const resetWorkflow = async (processType) => {
    if (!window.confirm('Restore the default single-stage workflow for this process? Custom stages will be lost.')) return;
    try {
      await axios.post(`/api/workflows/${processType}/reset`);
      notify('Workflow restored to default.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset workflow');
    }
  };

  if (!canManage) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <div style={{ fontWeight: 600 }}>You don't have access to Approval Workflows.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Approval Workflows</h1>
          <p className="page-subtitle">Configure who approves what, and in how many stages, for each process.</p>
        </div>
      </div>

      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Loading…</div>
      ) : (
        definitions.map(def => (
          <ProcessCard
            key={def.process_type}
            definition={def}
            roles={roles}
            onSave={saveWorkflow}
            onReset={resetWorkflow}
          />
        ))
      )}
    </div>
  );
}
