/**
 * OrgChartPage.jsx — Organization > Org Chart
 *
 * Read-only hierarchical view of the workforce, built client-side from
 * /api/employees/ using each employee's manager_id. No charting library —
 * rendered as a simple indented/nested tree.
 */

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

function initials(name) {
  return name?.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

// ─── Build a forest from a flat employee list ────────────────────────────────
function buildTree(employees) {
  const byId = new Map(employees.map(e => [e._id, { ...e, children: [] }]));
  const roots = [];

  byId.forEach(node => {
    const mgrId = node.manager_id;
    if (mgrId && byId.has(mgrId) && mgrId !== node._id) {
      byId.get(mgrId).children.push(node);
    } else {
      // No manager, manager not in the visible set, or self-referential -> root
      roots.push(node);
    }
  });

  const sortByName = (list) => {
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    list.forEach(n => sortByName(n.children));
  };
  sortByName(roots);

  return roots;
}

function countDescendants(node) {
  return node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
}

// ─── Tree node ────────────────────────────────────────────────────────────────
function OrgNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', marginLeft: depth * 28,
        borderLeft: depth > 0 ? '2px solid var(--border)' : 'none',
        position: 'relative',
      }}>
        {hasChildren ? (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              width: 20, height: 20, flexShrink: 0, borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--surface-2)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '−' : '+'}
          </button>
        ) : (
          <span style={{ width: 20, flexShrink: 0 }} />
        )}

        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13,
        }}>
          {initials(node.name)}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>{node.name}</span>
            {node.employee_id && (
              <span style={{ fontSize: 10.5, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>{node.employee_id}</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>
            {node.designation || '—'}{node.department ? ` · ${node.department}` : ''}
          </div>
        </div>

        {hasChildren && (
          <span style={{
            marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-dim)',
            background: 'var(--surface-2)', borderRadius: 20, padding: '2px 8px', flexShrink: 0,
          }}>
            {countDescendants(node)} report{countDescendants(node) === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map(child => (
            <OrgNode key={child._id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main OrgChartPage ────────────────────────────────────────────────────────
export default function OrgChartPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/employees/')
      .then(r => setEmployees(r.data || []))
      .catch(() => setError('Could not load the org chart.'))
      .finally(() => setLoading(false));
  }, []);

  const roots = useMemo(() => buildTree(employees), [employees]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Org Chart</h1>
          <p className="page-subtitle">{employees.length} employee{employees.length === 1 ? '' : 's'} · {roots.length} top-level</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Loading…</div>
        ) : employees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗂</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No employees to display</div>
            <p>The org chart will populate once employees are onboarded.</p>
          </div>
        ) : (
          <div>
            {roots.map(root => (
              <OrgNode key={root._id} node={root} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
