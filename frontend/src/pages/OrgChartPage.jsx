import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { DonutCard, CATEGORICAL, NEUTRAL_GRAY } from '../components/ui';

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

function MiniStat({ value, label, accent }) {
  return (
    <div className="card" style={{ padding: '16px 20px', borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--display)', color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function countDescendants(node) {
  return node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
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

const LINE_COLOR = '#d7dce2';

// ─── One row in the vertical tree ──────────────────────────────────────────
function OrgNodeRow({ node, isSelf, isOnChain, reportCount, totalCount, deptColor, onClick }) {
  const designation = hasValue(node.designation) ? node.designation : null;
  const department = hasValue(node.department) ? node.department : null;
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
        background: 'var(--surface)', borderRadius: 10, padding: '10px 14px',
        border: `1.5px solid ${isSelf ? 'var(--accent)' : 'var(--border)'}`,
        borderLeft: `3px solid ${isSelf ? 'var(--accent)' : deptColor || 'var(--border)'}`,
        boxShadow: isSelf ? '0 0 0 3px var(--accent-dim)' : isOnChain ? '0 0 0 2px var(--surface-2)' : 'none',
        transition: 'background .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; }}
    >
      <Avatar name={node.name} size={36} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}{isSelf && <span style={{ color: 'var(--accent)' }}> (You)</span>}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{designation || 'No designation on file'}</span>
          {department && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-faint)' }}>
              · <span style={{ width: 6, height: 6, borderRadius: '50%', background: deptColor || NEUTRAL_GRAY, flexShrink: 0 }} />{department}
            </span>
          )}
        </div>
      </div>
      {reportCount > 0 && (
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <span className="badge badge-blue">{reportCount} direct</span>
          {totalCount > reportCount && (
            <span className="badge badge-gray">{totalCount} in team</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Recursive vertical tree — every person on their own row, children
// nested underneath with indentation, never side by side. The indent rail
// (borderLeft) is what shows the reporting relationship, so there's no
// ambiguity about who reports to whom regardless of how many siblings a
// manager has or how wide/narrow the window is. ───────────────────────────
function OrgTreeNode({ node, highlightIds, selfId, deptColorMap, onSelect }) {
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <OrgNodeRow
        node={node} isSelf={node._id === selfId} isOnChain={highlightIds.has(node._id)}
        reportCount={node.children.length} totalCount={countDescendants(node)}
        deptColor={hasValue(node.department) ? deptColorMap[node.department] : null}
        onClick={() => onSelect(node)}
      />
      {hasChildren && (
        <div style={{ marginLeft: 17, paddingLeft: 23, borderLeft: `2px solid ${LINE_COLOR}`, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {node.children.map(c => (
            <OrgTreeNode key={c._id} node={c} highlightIds={highlightIds} selfId={selfId} deptColorMap={deptColorMap} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmployeeChip({ emp, onClick, canAssign, managerOptions, onAssigned }) {
  const designation = hasValue(emp.designation) ? emp.designation : null;
  const [saving, setSaving] = useState(false);

  const assign = async (managerId) => {
    if (!managerId) return;
    setSaving(true);
    try {
      await axios.put(`/api/employees/${emp._id}`, { manager_id: managerId });
      onAssigned();
    } catch {
      alert('Could not assign manager. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <Avatar name={emp.name} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{emp.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{designation || 'No designation on file'}</div>
        </div>
      </div>
      {canAssign && (
        <select
          value=""
          disabled={saving}
          onClick={e => e.stopPropagation()}
          onChange={e => assign(e.target.value)}
          style={{ marginTop: 10, width: '100%', fontSize: 11.5, padding: '5px 8px' }}
        >
          <option value="">{saving ? 'Saving…' : '+ Assign manager…'}</option>
          {managerOptions.map(m => (
            <option key={m._id} value={m._id}>
              {m.name}{m.designation ? ` — ${m.designation}` : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, borderBottom: '1px solid var(--surface-2)', paddingBottom: 8 }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ─── Click-through detail slide-over ───────────────────────────────────────
function DetailPanel({ emp, onClose, onSelect }) {
  const designation = hasValue(emp.designation) ? emp.designation : null;
  const department = hasValue(emp.department) ? emp.department : null;
  const reports = emp.children || [];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(35,43,58,0.45)', zIndex: 299 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, maxWidth: '92vw',
        background: 'var(--surface)', boxShadow: '-8px 0 32px rgba(0,0,0,.18)',
        padding: '28px 24px', overflowY: 'auto', zIndex: 300,
      }}>
        <button onClick={onClose} aria-label="Close"
          style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-faint)' }}>
          ✕
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 24 }}>
          <Avatar name={emp.name} size={64} />
          <div style={{ fontWeight: 700, fontSize: 17, marginTop: 12, fontFamily: 'var(--display)' }}>{emp.name}</div>
          {designation && <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>{designation}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <DetailRow label="Employee Code" value={emp.employee_id || '—'} />
          <DetailRow label="Department" value={department || 'Not set'} />
          <DetailRow label="Status" value={emp.status === 'active' ? 'Active' : emp.status} />
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-dim)', marginBottom: 10 }}>
            Direct Reports ({reports.length})
          </div>
          {reports.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>No direct reports.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {reports.map(r => (
                <div key={r._id} onClick={() => onSelect(r)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 8px', borderRadius: 8 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Avatar name={r.name} size={28} />
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function OrgChartPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);

  const refresh = () => axios.get('/api/org-chart/').then(r => setEmployees(r.data));

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, []);

  const canAssign = user?.role === 'admin';
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

  // Shared department → color mapping so the donut, the tree nodes, and the
  // "No Manager Assigned" section headers all draw from the same palette.
  const deptColorMap = useMemo(() => {
    const depts = Array.from(new Set(employees.filter(e => hasValue(e.department)).map(e => e.department))).sort();
    const map = {};
    depts.forEach((d, i) => { map[d] = CATEGORICAL[i % CATEGORICAL.length]; });
    return map;
  }, [employees]);

  const deptDonutData = useMemo(() => {
    const counts = {};
    employees.forEach(e => {
      const key = hasValue(e.department) ? e.department : 'Not Set';
      counts[key] = (counts[key] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries.map(([name, value]) => ({
      name, value, color: name === 'Not Set' ? NEUTRAL_GRAY : deptColorMap[name],
    }));
  }, [employees, deptColorMap]);

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

  const openIsolated = emp => setSelected({ ...emp, children: [] });

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
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 24, alignItems: 'stretch' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              <MiniStat value={stats.total} label="Total Employees" accent={CATEGORICAL[0]} />
              <MiniStat value={stats.departments} label="Departments" accent={CATEGORICAL[1]} />
              <MiniStat value={stats.withManager} label="Have a manager set" accent={CATEGORICAL[2]} />
              <MiniStat value={stats.unassigned} label="No manager assigned" accent={NEUTRAL_GRAY} />
            </div>
            <DonutCard title="Department Mix" data={deptDonutData} centerLabel="employees" />
          </div>

          {filteredTree.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-dim)', marginBottom: 14 }}>
                Reporting Structure
              </div>
              <div className="card" style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                  {filteredTree.map((n, i) => (
                    <div key={n._id} style={{ paddingTop: i > 0 ? 22 : 0, borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                      <OrgTreeNode node={n} highlightIds={highlightIds} selfId={selfId} deptColorMap={deptColorMap} onSelect={setSelected} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {deptEntries.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-dim)', marginBottom: 4 }}>
                No Manager Assigned
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 14 }}>
                {canAssign
                  ? 'Grouped by department — pick a manager right on a card below, or set one on the Employees page.'
                  : "Grouped by department — set a manager on the Employees page to move someone into the reporting structure above."}
              </div>
              {deptEntries.map(([dept, list]) => (
                <div key={dept} style={{ marginBottom: 20 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                    borderLeft: `4px solid ${dept === 'Unassigned Department' ? NEUTRAL_GRAY : deptColorMap[dept]}`,
                    paddingLeft: 10,
                  }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{dept}</span>
                    <span style={{ fontSize: 11, background: 'var(--surface-2)', borderRadius: 20, padding: '1px 8px', color: 'var(--text-dim)' }}>{list.length}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {list.map(e => (
                      <EmployeeChip
                        key={e._id} emp={e} onClick={() => openIsolated(e)}
                        canAssign={canAssign}
                        managerOptions={employees.filter(m => m._id !== e._id)}
                        onAssigned={refresh}
                      />
                    ))}
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

      {selected && <DetailPanel emp={selected} onClose={() => setSelected(null)} onSelect={setSelected} />}
    </div>
  );
}
