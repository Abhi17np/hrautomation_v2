import { useEffect, useState } from 'react';
import api from '../api';

// Standalone super-admin surface for provisioning tenants. Deliberately not
// part of the main app's Layout/nav — reachable only at #/platform, and
// authenticated separately from tenant users via its own `platform_token`
// (see frontend/src/api.js and backend/routes/platform.py). A tenant login
// session and a platform-admin session can coexist in the same browser
// without interfering with each other.

function LoginForm({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/platform/login', { email, password });
      localStorage.setItem('platform_token', res.data.token);
      onLoggedIn(res.data.admin);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h2>Platform Admin</h2>
      {error && <div style={{ color: '#c0392b', marginBottom: 12 }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
               placeholder="Email" required style={{ padding: 10 }} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
               placeholder="Password" required style={{ padding: 10 }} />
        <button type="submit" disabled={loading} style={{ padding: 10 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

function CompanyForm({ onCreated }) {
  const [form, setForm] = useState({
    name: '', slug: '', admin_name: '', admin_email: '', admin_password: '',
    contact_name: '', contact_email: '', contact_phone: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/platform/companies', form);
      setForm({ name: '', slug: '', admin_name: '', admin_email: '', admin_password: '',
                contact_name: '', contact_email: '', contact_phone: '' });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create company');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 640, marginBottom: 32 }}>
      <input value={form.name} onChange={set('name')} placeholder="Company name" required style={{ padding: 8 }} />
      <input value={form.slug} onChange={set('slug')} placeholder="Slug (login code, e.g. acme)" required style={{ padding: 8 }} />
      <input value={form.admin_name} onChange={set('admin_name')} placeholder="Admin full name" required style={{ padding: 8 }} />
      <input value={form.admin_email} onChange={set('admin_email')} type="email" placeholder="Admin email" required style={{ padding: 8 }} />
      <input value={form.admin_password} onChange={set('admin_password')} type="password" placeholder="Admin temp password" required style={{ padding: 8 }} />
      <input value={form.contact_email} onChange={set('contact_email')} type="email" placeholder="Contact email (optional)" style={{ padding: 8 }} />
      <input value={form.contact_name} onChange={set('contact_name')} placeholder="Contact name (optional)" style={{ padding: 8 }} />
      <input value={form.contact_phone} onChange={set('contact_phone')} placeholder="Contact phone (optional)" style={{ padding: 8 }} />
      {error && <div style={{ color: '#c0392b', gridColumn: '1 / -1' }}>{error}</div>}
      <button type="submit" disabled={saving} style={{ padding: 10, gridColumn: '1 / -1' }}>
        {saving ? 'Creating…' : 'Create company'}
      </button>
    </form>
  );
}

function CompanyList({ companies, onToggleStatus }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', maxWidth: 800 }}>
      <thead>
        <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
          <th style={{ padding: 8 }}>Name</th>
          <th style={{ padding: 8 }}>Slug</th>
          <th style={{ padding: 8 }}>Status</th>
          <th style={{ padding: 8 }}>Created</th>
          <th style={{ padding: 8 }}></th>
        </tr>
      </thead>
      <tbody>
        {companies.map(c => (
          <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: 8 }}>{c.name}</td>
            <td style={{ padding: 8 }}><code>{c.slug}</code></td>
            <td style={{ padding: 8 }}>{c.status}</td>
            <td style={{ padding: 8 }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
            <td style={{ padding: 8 }}>
              <button onClick={() => onToggleStatus(c)} style={{ padding: '4px 10px' }}>
                {c.status === 'suspended' ? 'Reactivate' : 'Suspend'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PlatformAdminPage() {
  const [admin, setAdmin] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [checking, setChecking] = useState(true);

  const loadCompanies = () => {
    api.get('/platform/companies').then(res => setCompanies(res.data)).catch(() => {});
  };

  useEffect(() => {
    const token = localStorage.getItem('platform_token');
    if (!token) { setChecking(false); return; }
    api.get('/platform/companies')
      .then(res => { setCompanies(res.data); setAdmin({}); })
      .catch(() => localStorage.removeItem('platform_token'))
      .finally(() => setChecking(false));
  }, []);

  const toggleStatus = async (company) => {
    const status = company.status === 'suspended' ? 'active' : 'suspended';
    await api.put(`/platform/companies/${company.id}`, { status });
    loadCompanies();
  };

  if (checking) return null;
  if (!admin) return <LoginForm onLoggedIn={(a) => { setAdmin(a); loadCompanies(); }} />;

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      <h2>Platform Admin — Companies</h2>
      <CompanyForm onCreated={loadCompanies} />
      <CompanyList companies={companies} onToggleStatus={toggleStatus} />
    </div>
  );
}
