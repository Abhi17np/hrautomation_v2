import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
}

function buildTree(employees) {
  const byId = {};
  employees.forEach(e => { byId[e._id] = { ...e, children: [] }; });
  const roots = [];
  employees.forEach(e => {
    const node = byId[e._id];
    if (e.manager_id && byId[e.manager_id]) {
      byId[e.manager_id].children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortByName = list => {
    list.sort((a, b) => a.name.localeCompare(b.name));
    list.forEach(n => sortByName(n.children));
  };
  sortByName(roots);
  return roots;
}

function ancestorIds(employees, startId) {
  const byId = {};
  employees.forEach(e => { byId[e._id] = e; });
  const chain = new Set();
  let cur = byId[startId];
  while (cur) {
    chain.add(cur._id);
    cur = cur.manager_id ? byId[cur.manager_id] : null;
  }
  return chain;
}

function Node({ node, depth, highlightIds, selfId }) {
  const [open, setOpen] = useState(depth < 1 || highlightIds.has(node._id));
  const hasChildren = node.children.length > 0;
  const isSelf = node._id === selfId;
  const isOnChain = highlightIds.has(node._id);

  return (
    <div>
      <div
        onClick={() => hasChildren && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', marginLeft: depth * 26,
          borderRadius: 10, cursor: hasChildren ? 'pointer' : 'default',
          background: isSelf ? 'var(--accent-dim)' : isOnChain ? 'var(--surface-2)' : 'transparent',
          border: isSelf ? '1px solid var(--accent)' : '1px solid transparent',
        }}
      >
        {hasChildren && (
          <span style={{ fontSize: 10, color: 'var(--text-faint)', width: 10, flexShrink: 0 }}>
            {open ? '▾' : '▸'}
          </span>
        )}
        {!hasChildren && <span style={{ width: 10, flexShrink: 0 }} />}
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: isSelf ? 'var(--accent)' : 'var(--surface-2)',
          color: isSelf ? '#fff' : 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--display)',
        }}>{initials(node.name)}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>
            {node.name}{isSelf && <span style={{ color: 'var(--accent)', fontWeight: 600 }}> (You)</span>}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
            {node.designation || '—'}{node.department ? ` · ${node.department}` : ''}
          </div>
        </div>
        {hasChildren && (
          <span style={{ fontSize: 10.5, color: 'var(--text-faint)', marginLeft: 'auto', flexShrink: 0 }}>
            {node.children.length} report{node.children.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      {hasChildren && open && (
        <div>
          {node.children.map(c => (
            <Node key={c._id} node={c} depth={depth + 1} highlightIds={highlightIds} selfId={selfId} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    axios.get('/api/org-chart/')
      .then(r => setEmployees(r.data))
      .finally(() => setLoading(false));
  }, []);

  const selfId = user?.employee_ref || null;
  const tree = useMemo(() => buildTree(employees), [employees]);
  const highlightIds = useMemo(() => selfId ? ancestorIds(employees, selfId) : new Set(), [employees, selfId]);

  const filtered = useMemo(() => {
    if (!q.trim()) return tree;
    const term = q.trim().toLowerCase();
    const matches = employees.filter(e => e.name.toLowerCase().includes(term));
    const ids = new Set();
    matches.forEach(m => ancestorIds(employees, m._id).forEach(id => ids.add(id)));
    const prune = nodes => nodes
      .filter(n => ids.has(n._id))
      .map(n => ({ ...n, children: prune(n.children) }));
    return prune(tree);
  }, [q, tree, employees]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Org Chart</div>
          <div className="page-subtitle">Reporting structure across the company, built from each employee's manager.</div>
        </div>
        <input
          placeholder="Search by name…"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ width: 220 }}
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state" style={{ padding: '40px 16px' }}><p>Loading…</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 16px' }}>
            <p style={{ margin: 0 }}>{q ? 'No matching employees.' : 'No active employees found.'}</p>
          </div>
        ) : (
          <div>
            {filtered.map(n => (
              <Node key={n._id} node={n} depth={0} highlightIds={highlightIds} selfId={selfId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
