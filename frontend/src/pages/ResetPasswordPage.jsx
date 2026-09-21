import { useState } from 'react';
import axios from 'axios';

function getTokenFromHash() {
  const q = window.location.hash.split('?')[1] || '';
  return new URLSearchParams(q).get('token') || '';
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const token = getTokenFromHash();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EAF2FE', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, padding: 36, boxShadow: '0 30px 70px rgba(31,62,133,.18)' }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Reset your password</h2>
        <p style={{ fontSize: 12.5, color: '#8A94A6', margin: '0 0 24px' }}>Choose a new password for your account.</p>

        {!token && <div className="alert alert-error">This reset link is missing a token.</div>}

        {done ? (
          <div>
            <div className="alert alert-success" style={{ marginBottom: 16 }}>Password reset — you can now log in.</div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { window.location.hash = '/'; }}>
              Go to login
            </button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div className="alert alert-error">{error}</div>}
            <input type="password" required minLength={8} placeholder="New password"
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ padding: '13px 16px', fontSize: 13.5, borderRadius: 12 }} />
            <input type="password" required placeholder="Confirm password"
              value={confirm} onChange={e => setConfirm(e.target.value)}
              style={{ padding: '13px 16px', fontSize: 13.5, borderRadius: 12 }} />
            <p style={{ fontSize: 11.5, color: '#AEB7C4', margin: '0 0 4px' }}>
              At least 8 characters, with a letter and a digit.
            </p>
            <button type="submit" className="btn btn-primary" disabled={loading || !token} style={{ width: '100%', padding: 13 }}>
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
