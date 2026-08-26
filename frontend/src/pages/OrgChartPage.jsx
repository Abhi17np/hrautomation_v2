import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
}

// A lot of employee records carry a literal "Not Specified" placeholder
// string rather than an empty value — treat that (and similar placeholders)
// as no value at all, same as EmployeesPage.jsx does by simply omitting the line.
function hasValue(v) {
  if (!v) return false;
  const t = String(v).trim().toLowerCase();
  return t !== '' && t !== 'not specified' && t !== 'n/a' && t !== 'none';
}

function Avatar({ name, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--accent)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, fontFamily: 'var(--display)',
    }}>{initials(name)}</div>
  );
}

function MiniStat({ value, label }) {
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--display)', color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function buildTree(employees, connectedIds) {
  const byId = {};
  employees.forEach(e => { if (connectedIds.has(e._id)) byId[e._id] = { ...e, children: [] }; });
  const roots = [];
  Object.values(byId).forEach(node => {
    if (node.manager_id && byId[node.manager_id]) {
      byId[node.manager_id].children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortByName = list => { list.sort((a, b) => a.name.localeCompare(b.name)); list.forEach(n => sortByName(n.children)); };
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

function TreeNode({ node, depth, highlightIds, selfId }) {
  const [open, setOpen] = useState(depth < 1 || highlightIds.has(node._id));
  const hasChildren = node.children.length > 0;
  const isSelf = node._id === selfId;
  const designation = hasValue(node.designation) ? node.designation : null;
  const department = hasValue(node.department) ? node.department : null;
  const subtitle = [designation, department].filter(Boolean).join(' · ');

  return (
    <div>
      <div
        onClick={() => hasChildren && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', marginLeft: depth * 28, marginBottom: 6,
          borderRadius: 10, cursor: hasChildren ? 'pointer' : 'default',
          background: isSelf ? 'var(--accent-dim)' : 'var(--surface)',
          border: `1px solid ${isSelf ? 'var(--accent)' : 'var(--border)'}`,
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--text-faint)', width: 10, flexShrink: 0, textAlign: 'center' }}>
          {hasChildren ? (open ? '▾' : '▸') : ''}
        </span>
        <Avatar name={node.name} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>
            {node.name}{isSelf && <span style={{ color: 'var(--accent)', fontWeight: 600 }}> (You)</span>}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{subtitle || '—'}</div>
        </div>
        {hasChildren && (
          <span className="badge badge-blue" style={{ flexShrink: 0 }}>
            {node.children.length} report{node.children.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      {hasChildren && open && node.children.map(c => (
        <TreeNode key={c._id} node={c} depth={depth + 1} highlightIds={highlightIds} selfId={selfId} />
      ))}
    </div>
  );
}

function EmployeeChip({ emp }) {
  const designation = hasValue(emp.designation) ? emp.designation : null;
  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <Avatar name={emp.name} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{emp.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{designation || 'No designation on file'}</div>
      </div>
    </div>
  );
}

export default function OrgChartPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    axios.get('/api/org-chart/').then(r => setEmployees(r.data)).finally(() => setLoading(false));
  }, []);

  const selfId = user?.employee_ref || null;

  // "Connected" = has a real edge to someone else (a resolvable manager, or
  // is someone else's resolvable manager). Everyone else is isolated — most
  // of this dataset, since manager_id isn't populated for most employees —
  // and gets shown grouped by department instead of as a flat alphabetical dump.
  const { connectedIds, isolated, stats } = useMemo(() => {
    const byId = {};
    employees.forEach(e => { byId[e._id] = e; });
    const hasRealManager = e => e.manager_id && byId[e.manager_id];
    const managerIds = new Set(employees.filter(hasRealManager).map(e => e.manager_id));
    const connected = new Set();
    employees.forEach(e => {
      if (hasRealManager(e) || managerIds.has(e._id)) connected.add(e._id);
    });
    const isolatedList = employees.filter(e => !connected.has(e._id));
    return {
      connectedIds: connected,
      isolated: isolatedList,
      stats: {
        total: employees.length,
        departments: new Set(employees.filter(e => hasValue(e.department)).map(e => e.department)).size,
        withManager: employees.filter(hasRealManager).length,
        unassigned: isolatedList.length,
      },
    };
  }, [employees]);

  const tree = useMemo(() => buildTree(employees, connectedIds), [employees, connectedIds]);
  const highlightIds = useMemo(() => selfId ? ancestorIds(employees, selfId) : new Set(), [employees, selfId]);

  const byDept = useMemo(() => {
    const groups = {};
    isolated.forEach(e => {
      const dept = hasValue(e.department) ? e.department : 'Unassigned Department';
      (groups[dept] = groups[dept] || []).push(e);
    });
    Object.values(groups).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, [isolated]);

  const term = q.trim().toLowerCase();

  const filteredTree = useMemo(() => {
    if (!term) return tree;
    const matches = employees.filter(e => connectedIds.has(e._id) && e.name.toLowerCase().includes(term));
    const ids = new Set();
    matches.forEach(m => ancestorIds(employees, m._id).forEach(id => ids.add(id)));
    const prune = nodes => nodes.filter(n => ids.has(n._id)).map(n => ({ ...n, children: prune(n.children) }));
    return prune(tree);
  }, [term, tree, employees, connectedIds]);

  const filteredByDept = useMemo(() => {
    if (!term) return byDept;
    const out = {};
    Object.entries(byDept).forEach(([dept, list]) => {
      const matched = list.filter(e => e.name.toLowerCase().includes(term));
      if (matched.length) out[dept] = matched;
    });
    return out;
  }, [term, byDept]);

  const deptEntries = Object.entries(filteredByDept).sort((a, b) => b[1].length - a[1].length);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Org Chart</div>
          <div className="page-subtitle">Reporting structure across the company, built from each employee's manager.</div>
        </div>
        <input placeholder="Search by name…" value={q} onChange={e => setQ(e.target.value)} style={{ width: 220 }} />
      </div>

      {loading ? (
        <div className="empty-state" style={{ padding: '40px 16px' }}><p>Loading…</p></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
            <MiniStat value={stats.total} label="Total Employees" />
            <MiniStat value={stats.departments} label="Departments" />
            <MiniStat value={stats.withManager} label="Have a manager set" />
            <MiniStat value={stats.unassigned} label="No manager assigned" />
          </div>

          {filteredTree.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-dim)', marginBottom: 12 }}>
                Reporting Structure
              </div>
              {filteredTree.map(n => (
                <TreeNode key={n._id} node={n} depth={0} highlightIds={highlightIds} selfId={selfId} />
              ))}
            </div>
          )}

          {deptEntries.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-dim)', marginBottom: 4 }}>
                No Manager Assigned
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 14 }}>
                Grouped by department — set a manager on the Employees page to move someone into the reporting structure above.
              </div>
              {deptEntries.map(([dept, list]) => (
                <div key={dept} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {dept}
                    <span style={{ fontSize: 11, background: 'var(--surface-2)', borderRadius: 20, padding: '1px 8px', color: 'var(--text-dim)' }}>{list.length}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {list.map(e => <EmployeeChip key={e._id} emp={e} />)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredTree.length === 0 && deptEntries.length === 0 && (
            <div className="empty-state" style={{ padding: '40px 16px' }}>
              <p style={{ margin: 0 }}>{q ? 'No matching employees.' : 'No active employees found.'}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
