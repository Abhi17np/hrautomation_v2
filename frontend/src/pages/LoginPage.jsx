import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// ─── Original illustration: person beside a dashboard tablet + plant ────────
// (Composition inspired by common "welcome" sign-in illustrations, drawn
// fresh as flat-color SVG shapes — not a reproduction of any stock asset.)
function HeroIllustration() {
  return (
    <svg width="270" height="230" viewBox="0 0 270 230" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* soft decorative hex shapes behind */}
      <polygon points="220,20 240,32 240,56 220,68 200,56 200,32" fill="#ffffff" opacity=".08" />
      <polygon points="248,60 265,70 265,90 248,100 231,90 231,70" fill="#ffffff" opacity=".10" />
      <polygon points="205,110 222,120 222,140 205,150 188,140 188,120" fill="#ffffff" opacity=".07" />
      <circle cx="40" cy="30" r="16" fill="#ffffff" opacity=".08" />

      {/* ground shadow */}
      <ellipse cx="120" cy="214" rx="95" ry="10" fill="#0B2E86" opacity=".14" />

      {/* tablet / dashboard card, slightly tilted */}
      <g transform="translate(60,30) rotate(-6 90 95)">
        <rect x="0" y="0" width="180" height="150" rx="14" fill="#ffffff" />
        <rect x="0" y="0" width="180" height="150" rx="14" fill="url(#tabletShade)" opacity=".5" />
        {/* top bar with traffic dots */}
        <circle cx="16" cy="16" r="3.5" fill="#F2994A" />
        <circle cx="28" cy="16" r="3.5" fill="#F7C948" />
        <circle cx="40" cy="16" r="3.5" fill="#27AE60" />
        <rect x="60" y="12" width="60" height="8" rx="4" fill="#DDE9FD" />

        {/* mini bar chart */}
        <rect x="14" y="100" width="12" height="34" rx="3" fill="#3E7BFA" />
        <rect x="30" y="86" width="12" height="48" rx="3" fill="#6E9DFC" />
        <rect x="46" y="112" width="12" height="22" rx="3" fill="#B9D0FB" />
        <rect x="62" y="94" width="12" height="40" rx="3" fill="#3E7BFA" />

        {/* avatar badge */}
        <circle cx="30" cy="70" r="14" fill="#ECF2FE" />
        <circle cx="30" cy="66" r="5" fill="#3E7BFA" />
        <path d="M20 78c2-5 6-7 10-7s8 2 10 7" stroke="#3E7BFA" strokeWidth="2.4" strokeLinecap="round" fill="none" />

        {/* line chart panel */}
        <rect x="92" y="60" width="76" height="44" rx="8" fill="#101A33" />
        <polyline points="98,92 112,80 126,88 140,68 154,76 162,64"
          fill="none" stroke="#EB5757" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="162" cy="64" r="3" fill="#EB5757" />

        {/* text lines */}
        <rect x="92" y="112" width="50" height="6" rx="3" fill="#EEF1F6" />
        <rect x="92" y="124" width="66" height="6" rx="3" fill="#EEF1F6" />
      </g>

      {/* person */}
      <g transform="translate(8,60)">
        {/* legs */}
        <rect x="20" y="120" width="12" height="46" rx="5" fill="#232B3A" />
        <rect x="38" y="120" width="12" height="46" rx="5" fill="#3D4759" />
        {/* torso / shirt */}
        <path d="M10 70c0-14 12-24 26-24s26 10 26 24l4 54H6z" fill="#EB6B5E" />
        {/* arm crossed */}
        <path d="M14 82c-6 8-8 18-4 28" stroke="#EB6B5E" strokeWidth="12" strokeLinecap="round" fill="none" />
        <path d="M58 82c6 8 8 18 4 28" stroke="#EB6B5E" strokeWidth="12" strokeLinecap="round" fill="none" />
        {/* neck + head */}
        <rect x="30" y="38" width="12" height="14" fill="#F2B28C" />
        <circle cx="36" cy="30" r="17" fill="#F7CBA4" />
        {/* hair + beard */}
        <path d="M19 26a17 17 0 0134-2c0-3-6-14-17-14S19 20 19 24z" fill="#232B3A" />
        <path d="M22 34c1 7 6 12 14 12s13-5 14-12c-3 3-9 5-14 5s-11-2-14-5z" fill="#232B3A" opacity=".85" />
      </g>

      {/* plant pot */}
      <g transform="translate(4,168)">
        <path d="M4 18h28l-4 20H8z" fill="#E08E3E" />
        <path d="M18 18c0-14-10-20-16-22 8 2 14 10 14 22z" fill="#27AE60" />
        <path d="M18 18c0-16 12-22 20-24-10 2-18 12-18 24z" fill="#34C976" />
        <path d="M18 18c0-10-6-16-10-18 6 1 10 8 10 18z" fill="#1F9450" />
      </g>

      <defs>
        <linearGradient id="tabletShade" x1="0" y1="0" x2="180" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#F3F6FC" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      window.location.hash = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#EAF2FE', position: 'relative', overflow: 'hidden', padding: 24,
      fontFamily: 'var(--font)',
    }}>
      {/* ── decorative blurred circles on the page background ── */}
      <div style={{ position: 'absolute', top: -130, left: -110, width: 360, height: 360, borderRadius: '50%', background: 'rgba(255,255,255,.55)' }} />
      <div style={{ position: 'absolute', bottom: -160, left: '14%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(184,209,250,.55)' }} />
      <div style={{ position: 'absolute', top: '10%', right: '6%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.45)' }} />
      <div style={{ position: 'absolute', bottom: '6%', right: '18%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(62,123,250,.10)' }} />

      {/* ── floating card ── */}
      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 900,
        background: '#fff', borderRadius: 28,
        boxShadow: '0 30px 70px rgba(31,62,133,.18), 0 8px 20px rgba(31,62,133,.08)',
        display: 'flex', overflow: 'hidden', minHeight: 560,
      }}>

        {/* Left — illustrated brand panel */}
        <div style={{
          flex: '1 1 45%', minWidth: 300,
          background: 'linear-gradient(160deg, #3E7BFA 0%, #2F68E0 100%)',
          padding: '40px 40px 0', position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', color: '#fff',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '10px 18px', borderRadius: 12, flexShrink: 0,
            background: '#fff', boxShadow: '0 4px 14px rgba(15,35,90,.18)',
            marginBottom: 30, alignSelf: 'flex-start',
          }}>
            <img src="/infopace-logo.webp" alt="Infopace" style={{ height: 34, width: 'auto', maxWidth: 150, objectFit: 'contain', display: 'block' }} />
          </div>

          <h1 style={{
            fontFamily: 'var(--display)', fontSize: 25, fontWeight: 700,
            lineHeight: 1.35, margin: '0 0 8px', maxWidth: 230,
          }}>
            One place for all your HR needs.
          </h1>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.78)', maxWidth: 220, margin: 0 }}>
            Offer letters, appointment orders, exits, approvals & leave — all in one portal.
          </p>

          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', paddingBottom: 4 }}>
            <HeroIllustration />
          </div>
        </div>

        {/* Right — sign-in form */}
        <div style={{
          flex: '1 1 55%', minWidth: 300, padding: '52px 52px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 21, fontWeight: 700, color: '#232B3A', margin: '0 0 5px' }}>
            Sign in
          </h2>
          <p style={{ fontSize: 12.5, color: '#8A94A6', margin: '0 0 26px' }}>
            Welcome back to the HR Automation System
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 18 }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email Address"
              required
              autoFocus
              style={{ padding: '13px 16px', fontSize: 13.5, borderRadius: 12 }}
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              style={{ padding: '13px 16px', fontSize: 13.5, borderRadius: 12 }}
            />

            <p style={{ fontSize: 11.5, color: '#AEB7C4', lineHeight: 1.6, margin: '2px 0 4px' }}>
              This portal is for Infopace India employees only. Contact HR if you
              believe you should have access but can't sign in.
            </p>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '13px', fontSize: 13.5, borderRadius: 12, marginTop: 4 }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ borderColor: 'rgba(255,255,255,.35)', borderTopColor: '#fff' }} />
                  Signing in…
                </>
              ) : 'Sign in →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 12, color: '#AEB7C4', fontWeight: 500 }}>
            Contact your administrator if you need access
          </p>
        </div>
      </div>
    </div>
  );
}
