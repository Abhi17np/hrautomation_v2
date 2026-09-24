import './LandingPage.css';

/* ── Minimal line-icon set (no external icon library needed) ─── */
function Icon({ path, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  doc: 'M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5 M9 13h6 M9 17h6',
  users: 'M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.7-3.2 3-5 5.5-5s4.8 1.8 5.5 5 M16 11a3 3 0 1 0 0-6 M17 15c2 .4 3.4 1.9 4 4.5',
  calendar: 'M4 5h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 10h18 M8 3v4 M16 3v4',
  wallet: 'M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2 M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H8a2 2 0 0 0 0 4h11',
  shield: 'M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z M9.5 12l1.8 1.8L15 10',
  chart: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  check: 'M4 12l5 5L20 6',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6l1-8z',
};

const NAV_LINKS = [
  { label: 'Product', target: 'features' },
  { label: 'How it works', target: 'how-it-works' },
  { label: 'Solutions', target: 'solutions' },
];

const FEATURES = [
  {
    icon: 'doc',
    title: 'Offer Letters & Appointment Orders',
    desc: 'Generate branded offer letters, appointment orders and confirmation letters in seconds — no more copy-pasting templates.',
  },
  {
    icon: 'users',
    title: 'Employee Lifecycle',
    desc: 'Track every employee from onboarding to exit with a single source of truth for documents, roles and history.',
  },
  {
    icon: 'calendar',
    title: 'Leave & Attendance',
    desc: 'Biometric sync, shift summaries, holiday calendars and self-serve leave requests, all reconciled automatically.',
  },
  {
    icon: 'wallet',
    title: 'Payroll & Payslips',
    desc: 'Run payroll, generate instant payslips and keep compensation records audit-ready every cycle.',
  },
  {
    icon: 'shield',
    title: 'Approvals & Workflows',
    desc: 'Configurable multi-level approval chains for leave, expenses and letters — routed to the right people automatically.',
  },
  {
    icon: 'chart',
    title: 'Analytics & Reports',
    desc: 'Real-time dashboards across attendance, payroll and headcount to help leadership make faster decisions.',
  },
];

const STATS = [
  { value: '15+', label: 'Integrated HR modules' },
  { value: '100%', label: 'Paperless documentation' },
  { value: 'Role-based', label: 'Secure access control' },
  { value: 'Real-time', label: 'Dashboards & reports' },
];

const STEPS = [
  {
    title: 'Sign in securely',
    desc: 'Employees and HR admins sign in with their company credentials — scoped access, every time.',
  },
  {
    title: 'Manage HR in one place',
    desc: 'HR handles letters, approvals, payroll and the full employee lifecycle from a single dashboard.',
  },
  {
    title: 'Employees self-serve',
    desc: 'Staff request leave, download payslips and track documents without raising a single ticket.',
  },
];

function goTo(hash) {
  window.location.hash = hash;
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function LandingPage() {
  return (
    <div className="landing-page">
      <div className="landing-glow landing-glow-1" />
      <div className="landing-glow landing-glow-2" />
      <div className="landing-glow landing-glow-3" />
      <div className="landing-glow landing-glow-4" />
      <div className="landing-noise" />

      {/* ── Nav ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="landing-logo-badge">
              <img src="/infopace-logo.webp" alt="Infopace" />
            </span>
            <span className="landing-logo-text">HR Automation</span>
          </div>

          <div className="landing-nav-links">
            {NAV_LINKS.map((l) => (
              <button key={l.target} className="landing-nav-link" onClick={() => scrollToId(l.target)}>
                {l.label}
              </button>
            ))}
          </div>

          <div className="landing-nav-actions">
            <button className="lp-btn lp-btn-ghost lp-btn-sm" onClick={() => goTo('/login')}>
              Sign in
            </button>
            <button className="lp-btn lp-btn-primary lp-btn-sm" onClick={() => goTo('/login')}>
              Get started <Icon path={ICONS.arrow} size={15} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="landing-hero">
        <span className="landing-badge">
          <span className="landing-badge-pill">NEW</span>
          Payroll, letters &amp; approvals now in one workspace
        </span>

        <h1 className="landing-hero-title">
          One place for all your <span className="landing-gradient-text">HR needs</span>
        </h1>

        <p className="landing-hero-sub">
          Offer letters, appointment orders, exits, approvals and leave — Infopace India's
          HR Automation System brings every workflow into a single, secure portal.
        </p>

        <div className="landing-hero-actions">
          <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => goTo('/login')}>
            Sign in to your workspace <Icon path={ICONS.arrow} size={16} />
          </button>
          <button className="lp-btn lp-btn-ghost lp-btn-lg" onClick={() => scrollToId('how-it-works')}>
            See how it works
          </button>
        </div>

        <p className="landing-hero-note">This portal is for Infopace India employees only.</p>

        {/* ── Hero visual ── */}
        <div className="landing-hero-visual-wrap">
          <div className="landing-hero-visual">
            <div className="landing-hero-visual-topbar">
              <span className="landing-hero-visual-dot" />
              <span className="landing-hero-visual-dot" />
              <span className="landing-hero-visual-dot" />
            </div>
            <div className="landing-hero-visual-inner">
              <div className="landing-mock-card">
                <div className="landing-mock-label">Attendance overview</div>
                <div className="landing-mock-bars">
                  <div className="landing-mock-bar" style={{ height: '46%' }} />
                  <div className="landing-mock-bar" style={{ height: '72%' }} />
                  <div className="landing-mock-bar" style={{ height: '58%' }} />
                  <div className="landing-mock-bar" style={{ height: '88%' }} />
                  <div className="landing-mock-bar" style={{ height: '64%' }} />
                  <div className="landing-mock-bar" style={{ height: '94%' }} />
                  <div className="landing-mock-bar" style={{ height: '50%' }} />
                </div>
              </div>
              <div className="landing-mock-card">
                <div className="landing-mock-label">Pending approvals</div>
                <div className="landing-mock-row">
                  <span className="landing-mock-avatar" />
                  <span className="landing-mock-line" style={{ width: '70%' }} />
                  <span className="landing-mock-badge">Leave</span>
                </div>
                <div className="landing-mock-row">
                  <span className="landing-mock-avatar" />
                  <span className="landing-mock-line" style={{ width: '55%' }} />
                  <span className="landing-mock-badge">Letter</span>
                </div>
                <div className="landing-mock-row">
                  <span className="landing-mock-avatar" />
                  <span className="landing-mock-line" style={{ width: '62%' }} />
                  <span className="landing-mock-badge">Expense</span>
                </div>
              </div>
            </div>

            <div className="landing-float-chip landing-float-chip-1">
              <span className="landing-float-chip-icon"><Icon path={ICONS.check} size={14} /></span>
              Offer letter approved
            </div>
            <div className="landing-float-chip landing-float-chip-2">
              <span className="landing-float-chip-icon"><Icon path={ICONS.bolt} size={14} /></span>
              Payslip generated
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="landing-stats">
          {STATS.map((s) => (
            <div className="landing-stat-card" key={s.label}>
              <div className="landing-stat-value">{s.value}</div>
              <div className="landing-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* ── Features ── */}
      <section className="landing-section" id="features">
        <div className="landing-section-head">
          <span className="landing-tag">Product</span>
          <h2 className="landing-section-title">Every HR workflow, unified</h2>
          <p className="landing-section-sub">
            From the first offer letter to the final exit checklist, manage it all without
            switching between spreadsheets, email threads and paper trails.
          </p>
        </div>

        <div className="landing-features-grid">
          {FEATURES.map((f) => (
            <div className="landing-feature-card" key={f.title}>
              <div className="landing-feature-icon">
                <Icon path={ICONS[f.icon]} size={21} />
              </div>
              <div className="landing-feature-title">{f.title}</div>
              <div className="landing-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="landing-section" id="how-it-works">
        <div className="landing-section-head">
          <span className="landing-tag">How it works</span>
          <h2 className="landing-section-title">Up and running in three steps</h2>
          <p className="landing-section-sub">
            No lengthy rollout — HR and employees are productive from day one.
          </p>
        </div>

        <div className="landing-steps">
          {STEPS.map((s, i) => (
            <div className="landing-step" key={s.title}>
              <div className="landing-step-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="landing-step-title">{s.title}</div>
              <div className="landing-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-section" id="solutions">
        <div className="landing-cta-wrap">
          <div className="landing-cta">
            <h2 className="landing-cta-title">Ready to simplify HR for your team?</h2>
            <p className="landing-cta-sub">
              Sign in with your Infopace India credentials to access your HR workspace.
            </p>
            <div className="landing-cta-actions">
              <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => goTo('/login')}>
                Sign in now <Icon path={ICONS.arrow} size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-logo-badge">
              <img src="/infopace-logo.webp" alt="Infopace" />
            </span>
            <p className="landing-footer-note">
              HR Automation System — the internal HR portal for Infopace India employees.
              Contact your administrator if you believe you should have access but can't sign in.
            </p>
          </div>

          <div className="landing-footer-links">
            <button onClick={() => scrollToId('features')}>Product</button>
            <button onClick={() => scrollToId('how-it-works')}>How it works</button>
            <button onClick={() => goTo('/login')}>Sign in</button>
          </div>
        </div>
        <div className="landing-footer-copy">
          © {new Date().getFullYear()} Infopace India. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
