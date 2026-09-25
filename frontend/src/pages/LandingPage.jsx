import { useEffect, useRef, useState } from 'react';
import './LandingPage.css';

/* ── Icons ─────────────────────────────────────────────────── */
const ICONS = {
  doc: 'M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h5',
  users: 'M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.7-3.2 3-5 5.5-5s4.8 1.8 5.5 5M16 11a3 3 0 1 0 0-6M17 15c2 .4 3.4 1.9 4 4.5',
  calendar: 'M4 5h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 10h18M8 3v4M16 3v4',
  wallet: 'M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H8a2 2 0 0 0 0 4h11',
  shield: 'M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3zM9.5 12l1.8 1.8L15 10',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M4 12l5 5L20 6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6l1-8z',
  exit: 'M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 8l-4 4 4 4M6 12h9',
  bell: 'M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M13.7 20a2 2 0 0 1-3.4 0',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  lock: 'M6 10h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM8 10V7a4 4 0 0 1 8 0v3',
};

function Icon({ name, size = 20, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d={ICONS[name]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Count-up number, triggered when scrolled into view ────── */
function Counter({ to, suffix = '', duration = 1500 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - start) / duration);
          setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

/* Swaps between short messages inside the attendance pill */
function RotatingText({ items, interval = 3800 }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % items.length), interval);
    return () => clearInterval(id);
  }, [items.length, interval]);

  return (
    <span className="lp-rotator" key={i}>
      {items[i]}
    </span>
  );
}

/* ── Content ───────────────────────────────────────────────── */
const NAV = [
  { label: 'Modules', target: 'modules' },
  { label: 'Platform', target: 'platform' },
  { label: 'Workflow', target: 'workflow' },
  { label: 'Journey', target: 'journey' },
];

const MARQUEE = [
  { label: 'Employees', icon: 'users' },
  { label: 'Offer Letters', icon: 'doc' },
  { label: 'Appointment Orders', icon: 'doc' },
  { label: 'Documents', icon: 'layers' },
  { label: 'Leave Tracker', icon: 'calendar' },
  { label: 'Attendance', icon: 'clock' },
  { label: 'Payslips', icon: 'wallet' },
  { label: 'Payroll Runs', icon: 'wallet' },
  { label: 'Expenses', icon: 'wallet' },
  { label: 'Approvals', icon: 'check' },
  { label: 'Workflows', icon: 'bolt' },
  { label: 'Org Chart', icon: 'users' },
  { label: 'Assets', icon: 'layers' },
  { label: 'Announcements', icon: 'bell' },
  { label: 'Policies', icon: 'shield' },
  { label: 'Audit Log', icon: 'lock' },
  { label: 'Reports', icon: 'chart' },
  { label: 'Analytics', icon: 'chart' },
];

const STATS = [
  { icon: 'layers', to: 15, suffix: '+', label: 'Integrated HR modules in one portal' },
  { icon: 'doc', to: 100, suffix: '%', label: 'Paperless letters and records' },
  { icon: 'clock', static: '24/7', label: 'Employee self-service access' },
  { icon: 'lock', to: 1, suffix: '', label: 'Secure login for your whole team' },
];

const LAYERS = [
  {
    name: 'People layer',
    desc: 'Employee records, org chart, roles and documents. The single source of truth every other module reads from.',
    tags: [{ t: 'Employees', w: 84 }, { t: 'Org chart', w: 82 }],
  },
  {
    name: 'HR operations layer',
    desc: 'Offer letters, onboarding, leave, attendance and exits. The day-to-day work your HR team actually runs.',
    tags: [{ t: 'Offer letters', w: 94 }, { t: 'Leave & attendance', w: 126 }],
  },
  {
    name: 'Automation engine',
    desc: 'Approval chains, configurable workflows and payroll runs that trigger themselves and route to the right people.',
    tags: [{ t: 'Approvals', w: 84 }, { t: 'Payroll runs', w: 96 }],
  },
  {
    name: 'Data & compliance layer',
    desc: 'Role-based access, audit logs and policy records that keep every action traceable and review-ready.',
    tags: [{ t: 'Audit log', w: 82 }, { t: 'Access control', w: 106 }],
  },
];

const STEPS = [
  {
    title: 'Create and send letters',
    desc: 'Pick a template, fill the employee details once and generate a branded offer letter, appointment order or experience letter instantly.',
    points: ['Reusable templates for every letter type', 'Routed for approval before it leaves the building', 'Stored against the employee record automatically'],
  },
  {
    title: 'Track leave and attendance',
    desc: 'Biometric sync, shift summaries and holiday calendars reconcile themselves, so nobody chases a register at month end.',
    points: ['Self-service leave requests with live balances', 'Shift, holiday and incident tracking built in', 'Manager approvals from the same dashboard'],
  },
  {
    title: 'Run payroll and close the month',
    desc: 'Attendance and approved expenses flow straight into the payroll run, and payslips land in every employee portal.',
    points: ['One payroll run across the organisation', 'Instant payslip download for employees', 'Audit-ready records for every cycle'],
  },
];

const JOURNEY = [
  { phase: 'Step 01', title: 'Offer', desc: 'Offer letter and appointment order generated and sent.', icon: 'mail' },
  { phase: 'Step 02', title: 'Onboarding', desc: 'Documents collected, assets assigned, org chart updated.', icon: 'users' },
  { phase: 'Step 03', title: 'Everyday', desc: 'Leave, attendance, payslips and expenses, all self-served.', icon: 'calendar' },
  { phase: 'Step 04', title: 'Growth', desc: 'Policies, announcements and performance records in one place.', icon: 'chart' },
  { phase: 'Step 05', title: 'Exit', desc: 'Clearance, final settlement and experience letter.', icon: 'exit' },
];

/* ── Helpers ───────────────────────────────────────────────── */
function goToLogin() {
  window.location.hash = '/login';
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* Catmull-Rom points to a smooth cubic path */
function smoothPath(pts) {
  const f = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  let d = `M${f(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1)} ${f(c2)} ${f(p2)}`;
  }
  return d;
}

const HERO_FACTS = [
  { label: '15+ modules in one portal', icon: 'layers' },
  { label: 'Role based access', icon: 'lock' },
  { label: 'Paperless records', icon: 'doc' },
];

const DASH_STATS = [
  { label: 'Employees', value: '248', note: '+6 this month', tone: 'is-green' },
  { label: 'On leave today', value: '12', note: 'Across 5 teams', tone: 'is-blue' },
  { label: 'Pending approvals', value: '7', note: '3 due today', tone: 'is-amber' },
  { label: 'September payroll', value: 'Ready', note: 'Runs on the 30th', tone: 'is-purple' },
];

const DASH_APPROVALS = [
  { title: 'Leave request', meta: 'Design · 2 days', status: 'Pending', tone: 'lp-status-amber' },
  { title: 'Expense claim', meta: 'Sales · ₹4,200', status: 'Approved', tone: 'lp-status-green' },
  { title: 'Offer letter', meta: 'Engineering', status: 'In review', tone: 'lp-status-blue' },
];

const TREND = [98, 86, 92, 72, 78, 60, 66, 48, 54, 40, 46, 30];
const TREND_PTS = TREND.map((y, i) => [(i * 400) / (TREND.length - 1), y]);
const TREND_LINE = smoothPath(TREND_PTS);
const TREND_AREA = `${TREND_LINE} L400,150 L0,150 Z`;

/* ── Page ──────────────────────────────────────────────────── */
export default function LandingPage() {
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const stepRefs = useRef([]);
  const layerRefs = useRef([]);
  const [stuck, setStuck] = useState(false);
  const [layer, setLayer] = useState(1);
  const [step, setStep] = useState(0);

  /* subtle pointer parallax on the hero panel */
  useEffect(() => {
    const el = heroRef.current;
    let raf = 0;

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--px', ((x - 0.5) * 2).toFixed(3));
        el.style.setProperty('--py', ((y - 0.5) * 2).toFixed(3));
      });
    };

    const onLeave = () => {
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  /* scroll reveals */
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('[data-reveal]') ?? [];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* nav shadow on scroll */
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* which platform layer is centred in the viewport */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setLayer(Number(e.target.dataset.layer));
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    layerRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  /* which explorer step is centred in the viewport */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setStep(Number(e.target.dataset.step));
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const isoCx = 330;
  const isoW = 200;
  const isoH = 80;
  const isoD = 18;

  return (
    <div className="lp" ref={rootRef}>
      {/* ── Nav ── */}
      <nav className={`lp-nav ${stuck ? 'is-stuck' : ''}`}>
        <div className="lp-nav-inner">
          <button className="lp-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/infopace-logo.webp" alt="Infopace" />
            <span className="lp-brand-divider" />
            <span className="lp-brand-text">HR Automation</span>
          </button>

          <div className="lp-nav-links">
            {NAV.map((n) => (
              <button key={n.target} className="lp-nav-link" onClick={() => scrollToId(n.target)}>
                {n.label}
              </button>
            ))}
          </div>

          <div className="lp-nav-actions">
            <button className="lp-btn lp-btn-soft lp-btn-sm" onClick={goToLogin}>
              Sign in
            </button>
            <button className="lp-btn lp-btn-primary lp-btn-sm" onClick={goToLogin}>
              Open portal <Icon name="arrow" size={15} className="lp-arrow" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="lp-hero" ref={heroRef}>
        <div className="lp-hero-split">
          <div className="lp-hero-copy">
            <span className="lp-pill" data-reveal>
              <span className="lp-pill-tag">NEW</span>
              Payroll, letters and approvals in one workspace
            </span>

            <h1 className="lp-h1" data-reveal style={{ '--d': '80ms' }}>
              One place for all your <span className="lp-grad">HR needs</span>
            </h1>

            <p className="lp-hero-sub" data-reveal style={{ '--d': '160ms' }}>
              Offer letters, appointment orders, leave, attendance, payroll and exits.
              Every workflow runs from a single secure portal.
            </p>

            <div className="lp-hero-actions" data-reveal style={{ '--d': '240ms' }}>
              <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={goToLogin}>
                Sign in to your workspace <Icon name="arrow" size={16} className="lp-arrow" />
              </button>
              <button className="lp-btn lp-btn-outline lp-btn-lg" onClick={() => scrollToId('workflow')}>
                See how it works
              </button>
            </div>

            <div className="lp-hero-facts" data-reveal style={{ '--d': '320ms' }}>
              {HERO_FACTS.map((f) => (
                <span className="lp-hero-fact" key={f.label}>
                  <Icon name={f.icon} size={15} />
                  {f.label}
                </span>
              ))}
            </div>
          </div>

          <div className="lp-hero-visual" data-reveal style={{ '--d': '200ms' }}>
            <span className="lp-visual-glow" />

            <div className="lp-panel">
              <div className="lp-panel-top">
                <div>
                  <div className="lp-dash-hello">Good morning, HR team</div>
                  <div className="lp-dash-date">Tuesday, 24 September</div>
                </div>
                <span className="lp-dash-avatar">HR</span>
              </div>

              <div className="lp-dash-stats">
                {DASH_STATS.map((s) => (
                  <div className="lp-dash-stat" key={s.label}>
                    <span className="lp-dash-stat-label">{s.label}</span>
                    <span className="lp-dash-stat-val">{s.value}</span>
                    <span className={`lp-dash-chip ${s.tone}`}>{s.note}</span>
                  </div>
                ))}
              </div>

              <div className="lp-dash-grid">
                <div className="lp-dash-card">
                  <div className="lp-dash-card-head">
                    Attendance this month <span>Daily</span>
                  </div>
                  <svg className="lp-dash-chart" viewBox="0 0 400 150" aria-hidden="true">
                    <defs>
                      <linearGradient id="lpArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#3e7bfa" stopOpacity="0.26" />
                        <stop offset="1" stopColor="#3e7bfa" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[30, 70, 110].map((y) => (
                      <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="#eef2f9" strokeWidth="1" />
                    ))}
                    <path className="lp-dash-area" d={TREND_AREA} fill="url(#lpArea)" />
                    <path
                      className="lp-dash-line"
                      d={TREND_LINE}
                      pathLength="1"
                      fill="none"
                      stroke="#3e7bfa"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                    <circle className="lp-dash-dot" cx="400" cy="30" r="5" fill="#fff" stroke="#3e7bfa" strokeWidth="2.6" />
                  </svg>
                </div>

                <div className="lp-dash-card">
                  <div className="lp-dash-card-head">
                    Pending approvals <span>7</span>
                  </div>
                  {DASH_APPROVALS.map((a) => (
                    <div className="lp-dash-row" key={a.title}>
                      <span className="lp-pr-av" />
                      <span className="lp-dash-row-text">
                        <b>{a.title}</b>
                        <small>{a.meta}</small>
                      </span>
                      <span className={`lp-mini-status ${a.tone}`}>{a.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lp-toast is-a">
              <span className="lp-toast-ic is-green">
                <Icon name="check" size={14} />
              </span>
              <span>
                Offer letter approved
                <small>Software Engineer</small>
              </span>
            </div>

            <div className="lp-toast is-b">
              <span className="lp-toast-ic is-blue">
                <Icon name="wallet" size={14} />
              </span>
              <span>
                Payslips published
                <small>248 employees</small>
              </span>
            </div>
          </div>
        </div>

        {/* marquee */}
        <div className="lp-marquee-wrap">
          <div className="lp-marquee-title">Everything inside your portal</div>
          <div className="lp-marquee">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span className="lp-mq-item" key={`${m.label}-${i}`}>
                <Icon name={m.icon} size={15} />
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ── Stats ── */}
      <section className="lp-section" id="modules">
        <div className="lp-stats">
          {STATS.map((s, i) => (
            <div className="lp-stat" key={s.label} data-reveal style={{ '--d': `${i * 90}ms` }}>
              <span className="lp-stat-ic">
                <Icon name={s.icon} size={19} />
              </span>
              <div className="lp-stat-val">
                {s.static ? s.static : <Counter to={s.to} suffix={s.suffix} />}
              </div>
              <div className="lp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modules ── */}
      <section className="lp-section">
        <div className="lp-head" data-reveal>
          <span className="lp-tag">Modules</span>
          <h2 className="lp-h2">Built for everyone</h2>
          <p className="lp-lede">
            From HR and managers to every employee in the company, each team gets what it
            needs inside a single portal.
          </p>
        </div>

        <div className="lp-everyone">
          {/* Letters */}
          <article className="lp-e-card" data-reveal>
            <div className="lp-e-visual">
              <span className="lp-lv-ghost is-left" />
              <span className="lp-lv-ghost is-right" />
              <div className="lp-lv-card">
                <div className="lp-lv-head">
                  <span className="lp-lv-ic">
                    <Icon name="doc" size={13} />
                  </span>
                  <span className="lp-lv-name">Offer letter</span>
                  <span className="lp-mini-status lp-status-green">Signed</span>
                </div>
                <span className="lp-lv-line" style={{ width: '88%' }} />
                <span className="lp-lv-line" style={{ width: '62%' }} />
                <span className="lp-lv-line" style={{ width: '74%' }} />
              </div>
            </div>
            <h3 className="lp-e-title">Offer letters &amp; appointment orders</h3>
            <p className="lp-e-desc">
              Generate branded letters from reusable templates in seconds, route them for
              approval and file them against the employee record automatically.
            </p>
          </article>

          {/* Leave & attendance */}
          <article className="lp-e-card" data-reveal style={{ '--d': '90ms' }}>
            <div className="lp-e-visual">
              <div className="lp-dial">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <defs>
                    <linearGradient id="lpDial" x1="0" y1="0" x2="120" y2="120">
                      <stop offset="0" stopColor="#6e9dfc" />
                      <stop offset="1" stopColor="#3e7bfa" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e4edfc" strokeWidth="11" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="url(#lpDial)"
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray="314"
                    strokeDashoffset="38"
                    transform="rotate(-90 60 60)"
                  />
                  <circle cx="60" cy="60" r="35" fill="none" stroke="#eef4fd" strokeWidth="7" />
                </svg>
                <span className="lp-dial-val">88%</span>
                <span className="lp-dial-cap">Present</span>
              </div>

              <div className="lp-float-pill">
                <span className="lp-float-pill-ic">
                  <Icon name="clock" size={12} />
                </span>
                <RotatingText items={['Live attendance sync', 'Balances update instantly']} />
              </div>
            </div>
            <h3 className="lp-e-title">Leave &amp; attendance</h3>
            <p className="lp-e-desc">
              Biometric sync, shift summaries and holiday calendars reconcile themselves,
              with live balances on every leave request.
            </p>
          </article>

          {/* Approvals */}
          <article className="lp-e-card" data-reveal style={{ '--d': '180ms' }}>
            <div className="lp-e-visual">
              <div className="lp-ap-card is-back">
                <span className="lp-lv-line" style={{ width: '70%' }} />
                <span className="lp-lv-line" style={{ width: '46%' }} />
              </div>
              <div className="lp-ap-card is-front">
                <span className="lp-lv-line" style={{ width: '64%' }} />
                <span className="lp-lv-line" style={{ width: '82%' }} />
              </div>
              <span className="lp-ap-badge">
                <Icon name="check" size={20} />
              </span>
            </div>
            <h3 className="lp-e-title">Approvals &amp; workflows</h3>
            <p className="lp-e-desc">
              Configurable multi-level chains for leave, expenses and letters, routed to the
              right people automatically.
            </p>
          </article>

          {/* Payroll — wide */}
          <article className="lp-e-card lp-e-wide" data-reveal>
            <div className="lp-e-visual is-wide">
              <span className="lp-e-badge">
                <Icon name="wallet" size={16} />
              </span>
              <div className="lp-pr">
                <div className="lp-pr-panel">
                  <div className="lp-pr-head">
                    Payroll run <span>September</span>
                  </div>
                  {[
                    { r: 'Software Engineer', a: '68,400' },
                    { r: 'HR Executive', a: '41,250' },
                    { r: 'Sales Lead', a: '57,900' },
                  ].map((p) => (
                    <div className="lp-pr-row" key={p.r}>
                      <span className="lp-pr-av" />
                      <span className="lp-pr-role">{p.r}</span>
                      <span className="lp-pr-amt">{p.a}</span>
                    </div>
                  ))}
                </div>
                <div className="lp-pr-panel is-chart">
                  <div className="lp-pr-head">Monthly cost</div>
                  <div className="lp-bars">
                    {[48, 66, 57, 78, 62, 88].map((h, i) => (
                      <span
                        key={`${h}-${i}`}
                        className={`lp-bar ${i === 5 ? '' : i % 3 === 2 ? 'is-soft' : ''}`}
                        style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <h3 className="lp-e-title">Payroll &amp; payslips</h3>
            <p className="lp-e-desc">
              Attendance and approved expenses flow straight into the payroll run. Publish
              instant payslips and keep every cycle audit-ready.
            </p>
          </article>

          {/* Analytics — narrow */}
          <article className="lp-e-card lp-e-narrow" data-reveal style={{ '--d': '90ms' }}>
            <div className="lp-e-visual is-wide">
              <div className="lp-donut">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  {[
                    { c: '#3e7bfa', len: 116, off: 0 },
                    { c: '#7c6fe0', len: 78, off: -116 },
                    { c: '#0e9f94', len: 48, off: -194 },
                    { c: '#c3d7fb', len: 41, off: -242 },
                  ].map((s) => (
                    <circle
                      key={s.c}
                      cx="60"
                      cy="60"
                      r="45"
                      fill="none"
                      stroke={s.c}
                      strokeWidth="14"
                      strokeDasharray={`${s.len} ${283 - s.len}`}
                      strokeDashoffset={s.off}
                      transform="rotate(-90 60 60)"
                    />
                  ))}
                </svg>
              </div>
              <div className="lp-donut-legend">
                <span>
                  <i style={{ background: '#3e7bfa' }} /> Headcount
                </span>
                <span>
                  <i style={{ background: '#7c6fe0' }} /> Attendance
                </span>
                <span>
                  <i style={{ background: '#0e9f94' }} /> Payroll
                </span>
              </div>
            </div>
            <h3 className="lp-e-title">Analytics &amp; reports</h3>
            <p className="lp-e-desc">
              Live dashboards across headcount, attendance and payroll so leadership decides
              on facts.
            </p>
          </article>
        </div>
      </section>

      {/* ── Isometric architecture ── */}
      <section className="lp-section lp-section-tinted" id="platform">
        <div className="lp-head" data-reveal>
          <span className="lp-tag">Platform</span>
          <h2 className="lp-h2">Four connected layers, one portal</h2>
          <p className="lp-lede">
            Each layer feeds the next, so a single employee record drives every letter,
            approval, payslip and report in the system.
          </p>
        </div>

        <div className="lp-iso-wrap">
          <div className="lp-iso" data-reveal>
            <svg viewBox="118 32 424 576" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="lpSlab" x1="130" y1="0" x2="530" y2="600" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#e8f0fe" />
                </linearGradient>
                <linearGradient id="lpSlabOn" x1="130" y1="0" x2="530" y2="600" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#dde9fd" />
                  <stop offset="1" stopColor="#b9d0fb" />
                </linearGradient>
              </defs>

              {/* vertical flow line */}
              <line x1={isoCx} y1="120" x2={isoCx} y2="520" stroke="#c8dafb" strokeWidth="1.5" strokeDasharray="5 7" />

              {LAYERS.map((l, i) => {
                const cy = 130 + i * 118;
                const on = layer === i;
                return (
                  <g
                    key={l.name}
                    className={`lp-iso-layer ${on ? 'is-active' : ''}`}
                    onMouseEnter={() => setLayer(i)}
                  >
                    <polygon
                      points={`${isoCx - isoW},${cy} ${isoCx},${cy + isoH} ${isoCx},${cy + isoH + isoD} ${isoCx - isoW},${cy + isoD}`}
                      fill={on ? '#9dbdf9' : '#d3e2fd'}
                    />
                    <polygon
                      points={`${isoCx},${cy + isoH} ${isoCx + isoW},${cy} ${isoCx + isoW},${cy + isoD} ${isoCx},${cy + isoH + isoD}`}
                      fill={on ? '#b6ccf9' : '#e3edfd'}
                    />
                    <polygon
                      className="lp-iso-top"
                      points={`${isoCx},${cy - isoH} ${isoCx + isoW},${cy} ${isoCx},${cy + isoH} ${isoCx - isoW},${cy}`}
                      fill={on ? 'url(#lpSlabOn)' : 'url(#lpSlab)'}
                      stroke={on ? '#3e7bfa' : '#b3cbf8'}
                      strokeWidth={on ? 1.6 : 1.3}
                    />
                    <circle cx={isoCx} cy={cy} r={on ? 7 : 5} fill={on ? '#3e7bfa' : '#b9d0fb'} />

                    {l.tags.map((tag, ti) => {
                      const tx = ti === 0 ? isoCx - 84 : isoCx + 80;
                      const ty = ti === 0 ? cy - 22 : cy + 20;
                      return (
                        <g key={tag.t}>
                          <rect
                            className="lp-iso-tag-box"
                            x={tx - tag.w / 2}
                            y={ty - 13}
                            width={tag.w}
                            height={26}
                            rx={9}
                            strokeWidth="1"
                          />
                          <text className="lp-iso-tag" x={tx} y={ty + 4} textAnchor="middle">
                            {tag.t}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="lp-iso-legend">
            {/* The reveal observer adds .is-in imperatively, so it lives on a
                wrapper whose className React never rewrites — re-rendering the
                button below would otherwise wipe it and leave the card at
                opacity 0. */}
            {LAYERS.map((l, i) => (
              <div
                key={l.name}
                className="lp-iso-reveal"
                data-layer={i}
                ref={(el) => {
                  layerRefs.current[i] = el;
                }}
                data-reveal
                style={{ '--d': `${i * 80}ms` }}
              >
                <button
                  className={`lp-iso-item ${layer === i ? 'is-active' : ''}`}
                  onMouseEnter={() => setLayer(i)}
                  onFocus={() => setLayer(i)}
                  onClick={() => setLayer(i)}
                >
                  <span className="lp-iso-num">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="lp-iso-name">{l.name}</span>
                    <span className="lp-iso-desc">{l.desc}</span>
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sticky explorer ── */}
      <section className="lp-section" id="workflow">
        <div className="lp-head" data-reveal>
          <span className="lp-tag">Workflow</span>
          <h2 className="lp-h2">Watch a month run itself</h2>
          <p className="lp-lede">
            Scroll through a typical cycle. The portal on the left keeps up with each stage.
          </p>
        </div>

        <div className="lp-explorer">
          <div className="lp-explorer-sticky">
            <div className="lp-screen">
              <div className="lp-screen-bar">
                <span className="lp-screen-dot" />
                <span className="lp-screen-dot" />
                <span className="lp-screen-dot" />
                <span className="lp-screen-url">hr.infopace · portal</span>
              </div>

              <div className="lp-screen-body">
                {/* pane 1 — letters */}
                <div className={`lp-pane ${step === 0 ? 'is-active' : ''}`}>
                  <div className="lp-pane-head">
                    <span className="lp-pane-title">Letters &amp; documents</span>
                    <span className="lp-pane-chip">4 generated today</span>
                  </div>
                  {[
                    { t: 'Offer letter · Software Engineer', s: 'Signed', c: 'lp-status-green' },
                    { t: 'Appointment order · HR Executive', s: 'Sent', c: 'lp-status-blue' },
                    { t: 'Confirmation · Support Analyst', s: 'In review', c: 'lp-status-amber' },
                    { t: 'Experience letter · Sales Lead', s: 'Signed', c: 'lp-status-green' },
                  ].map((r) => (
                    <div className="lp-mini-row" key={r.t}>
                      <span className="lp-mini-dot">
                        <Icon name="doc" size={12} />
                      </span>
                      {r.t}
                      <span className={`lp-mini-status ${r.c}`}>{r.s}</span>
                    </div>
                  ))}
                </div>

                {/* pane 2 — leave & attendance */}
                <div className={`lp-pane ${step === 1 ? 'is-active' : ''}`}>
                  <div className="lp-pane-head">
                    <span className="lp-pane-title">Leave &amp; attendance</span>
                    <span className="lp-pane-chip">September</span>
                  </div>
                  <div className="lp-cal">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <span className="lp-cal-cell is-head" key={`h-${i}`}>
                        {d}
                      </span>
                    ))}
                    {Array.from({ length: 28 }, (_, i) => {
                      const day = i + 1;
                      const weekend = i % 7 === 5 || i % 7 === 6;
                      const leave = day === 11 || day === 12;
                      return (
                        <span
                          key={day}
                          className={`lp-cal-cell ${leave ? 'is-leave' : ''} ${!weekend && !leave ? 'is-on' : ''}`}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* pane 3 — payroll */}
                <div className={`lp-pane ${step === 2 ? 'is-active' : ''}`}>
                  <div className="lp-pane-head">
                    <span className="lp-pane-title">Payroll run</span>
                    <span className="lp-pane-chip">Ready to publish</span>
                  </div>
                  <div className="lp-payslip">
                    <div className="lp-payslip-amt">₹ 68,400</div>
                    <div className="lp-payslip-sub">Net pay · September payslip</div>
                    <div className="lp-meter">
                      <span style={{ width: '72%' }} />
                    </div>
                    <div className="lp-legend-row">
                      <span className="lp-legend-swatch" style={{ background: '#3e7bfa' }} />
                      Basic &amp; allowances
                    </div>
                    <div className="lp-legend-row">
                      <span className="lp-legend-swatch" style={{ background: '#7c6fe0' }} />
                      Reimbursements &amp; expenses
                    </div>
                    <div className="lp-legend-row">
                      <span className="lp-legend-swatch" style={{ background: '#dde9fd' }} />
                      Statutory deductions
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lp-steps">
            <div className="lp-steps-rail">
              <span style={{ height: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>

            {STEPS.map((s, i) => (
              <div
                className={`lp-step ${step === i ? 'is-active' : ''}`}
                key={s.title}
                data-step={i}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
              >
                <span className="lp-step-node">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>
                <ul className="lp-step-list">
                  {s.points.map((p) => (
                    <li key={p}>
                      <span className="lp-tick">
                        <Icon name="check" size={10} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Journey timeline ── */}
      <section className="lp-section lp-section-tinted" id="journey">
        <div className="lp-head" data-reveal>
          <span className="lp-tag">Journey</span>
          <h2 className="lp-h2">The full employee lifecycle</h2>
          <p className="lp-lede">
            One record follows every person from their offer letter to their experience
            letter, with nothing re-typed and nothing lost.
          </p>
        </div>

        <div className="lp-timeline" data-reveal>
          <div className="lp-ticks">
            {Array.from({ length: 56 }, (_, i) => (
              <span
                className="lp-tick-mark"
                key={i}
                style={{ height: i % 7 === 0 ? '100%' : i % 7 === 3 ? '58%' : '30%' }}
              />
            ))}
          </div>

          <div className="lp-rail">
            <span className="lp-rail-fill" />
          </div>

          <div className="lp-milestones">
            {JOURNEY.map((m, i) => (
              <div className="lp-ms" key={m.title}>
                <span className="lp-ms-node" style={{ '--d': `${400 + i * 180}ms` }} />
                <div className="lp-ms-card">
                  <span className="lp-ms-ic">
                    <Icon name={m.icon} size={17} />
                  </span>
                  <div className="lp-ms-phase">{m.phase}</div>
                  <div className="lp-ms-title">{m.title}</div>
                  <div className="lp-ms-desc">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-section">
        <div className="lp-cta-grid">
          <div className="lp-cta-main" data-reveal>
            <h2 className="lp-cta-title">Your HR workspace is one sign-in away</h2>
            <p className="lp-cta-sub">
              Use your Infopace India credentials to open letters, leave, payroll and
              approvals, with everything waiting exactly where you left it.
            </p>
            <button className="lp-btn lp-btn-lg lp-cta-btn" onClick={goToLogin}>
              Sign in now <Icon name="arrow" size={16} className="lp-arrow" />
            </button>
          </div>

          <div className="lp-cta-side" data-reveal style={{ '--d': '110ms' }}>
            <h3 className="lp-cta-side-title">Need access?</h3>
            <p className="lp-cta-side-desc">
              Accounts are created by your HR administrator. If you cannot sign in, these are
              the quickest routes to a fix.
            </p>
            <div className="lp-help-row">
              <Icon name="mail" size={16} />
              Ask HR to send a fresh invite link
            </div>
            <div className="lp-help-row">
              <Icon name="lock" size={16} />
              Use the "Forgot password" link on the sign-in page
            </div>
            <div className="lp-help-row">
              <Icon name="shield" size={16} />
              Check your company code with your manager
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img src="/infopace-logo.webp" alt="Infopace" style={{ height: 30 }} />
            <p className="lp-footer-note">
              HR Automation System, the internal HR portal for Infopace India employees.
              Contact your administrator if you believe you should have access but cannot sign in.
            </p>
          </div>

          <div className="lp-footer-cols">
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">Product</div>
              <button onClick={() => scrollToId('modules')}>Modules</button>
              <button onClick={() => scrollToId('platform')}>Platform</button>
              <button onClick={() => scrollToId('workflow')}>Workflow</button>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">Employees</div>
              <button onClick={goToLogin}>Sign in</button>
              <button onClick={goToLogin}>Payslips</button>
              <button onClick={goToLogin}>Leave requests</button>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">Support</div>
              <button onClick={() => scrollToId('journey')}>Employee journey</button>
              <button onClick={goToLogin}>Contact HR</button>
            </div>
          </div>
        </div>

        <div className="lp-footer-base">
          <span>© {new Date().getFullYear()} Infopace India. All rights reserved.</span>
          <span>Internal use only · Role-based access</span>
        </div>
      </footer>
    </div>
  );
}
