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
  sparkle: 'M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3z',
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

/* ── Content ───────────────────────────────────────────────── */
const NAV = [
  { label: 'Modules', target: 'modules' },
  { label: 'Platform', target: 'platform' },
  { label: 'Workflow', target: 'workflow' },
  { label: 'Journey', target: 'journey' },
];

const ORBIT_CHIPS = [
  { label: 'Offer letters', icon: 'doc', tone: '', style: { top: '6%', left: '3%' }, delay: '0s' },
  { label: 'Payroll runs', icon: 'wallet', tone: 'is-purple', style: { top: '13%', right: '4%' }, delay: '1.1s' },
  { label: 'Attendance', icon: 'clock', tone: 'is-teal', style: { top: '45%', left: '0%' }, delay: '2.2s' },
  { label: 'Approvals', icon: 'check', tone: '', style: { top: '52%', right: '1%' }, delay: '0.6s' },
  { label: 'Leave requests', icon: 'calendar', tone: 'is-amber', style: { bottom: '9%', left: '13%' }, delay: '1.7s', optional: true },
  { label: 'Exit & clearance', icon: 'exit', tone: 'is-purple', style: { bottom: '5%', right: '12%' }, delay: '2.8s', optional: true },
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
    desc: 'Employee records, org chart, roles and documents — the single source of truth every other module reads from.',
    tags: [{ t: 'Employees', w: 84 }, { t: 'Org chart', w: 82 }],
  },
  {
    name: 'HR operations layer',
    desc: 'Offer letters, onboarding, leave, attendance and exits — the day-to-day work your HR team actually runs.',
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
    desc: 'Attendance and approved expenses flow straight into the payroll run, and payslips land in each employee’s portal.',
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

/* Ellipse as a path so an SVG dot can travel along it */
function ellipsePath(cx, cy, rx, ry) {
  return `M ${cx - rx},${cy} a ${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 ${-rx * 2},0`;
}

/* ── Page ──────────────────────────────────────────────────── */
export default function LandingPage() {
  const rootRef = useRef(null);
  const stepRefs = useRef([]);
  const [stuck, setStuck] = useState(false);
  const [layer, setLayer] = useState(1);
  const [step, setStep] = useState(0);

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
      <header className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-hero-grid" />

        <div className="lp-hero-inner">
          <span className="lp-pill" data-reveal>
            <span className="lp-pill-tag">NEW</span>
            Payroll, letters and approvals now share one workspace
          </span>

          <h1 className="lp-h1" data-reveal style={{ '--d': '70ms' }}>
            One place for all your <span className="lp-grad">HR needs</span>
          </h1>

          <p className="lp-hero-sub" data-reveal style={{ '--d': '140ms' }}>
            Offer letters, appointment orders, leave, attendance, payroll and exits — the
            Infopace India HR Automation System runs every workflow from a single secure portal.
          </p>

          <div className="lp-hero-actions" data-reveal style={{ '--d': '210ms' }}>
            <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={goToLogin}>
              Sign in to your workspace <Icon name="arrow" size={16} className="lp-arrow" />
            </button>
            <button className="lp-btn lp-btn-outline lp-btn-lg" onClick={() => scrollToId('workflow')}>
              See how it works
            </button>
          </div>

          <p className="lp-hero-note" data-reveal style={{ '--d': '280ms' }}>
            This portal is for Infopace India employees only.
          </p>

          {/* orbital visual */}
          <div className="lp-orbit" data-reveal style={{ '--d': '340ms' }}>
            <svg className="lp-orbit-svg" viewBox="0 0 880 520" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="lpRingStroke" x1="0" y1="0" x2="880" y2="520" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#3e7bfa" stopOpacity="0.05" />
                  <stop offset="0.45" stopColor="#3e7bfa" stopOpacity="0.45" />
                  <stop offset="1" stopColor="#7c6fe0" stopOpacity="0.08" />
                </linearGradient>
              </defs>

              <g transform="rotate(-12 440 260)">
                <path id="lpRing1" className="lp-orbit-ring" d={ellipsePath(440, 260, 396, 140)} />
                <circle className="lp-orbit-dot" r="5">
                  <animateMotion dur="14s" repeatCount="indefinite">
                    <mpath href="#lpRing1" />
                  </animateMotion>
                </circle>
              </g>

              <g transform="rotate(18 440 260)">
                <path id="lpRing2" className="lp-orbit-ring" d={ellipsePath(440, 260, 320, 112)} />
                <circle className="lp-orbit-dot lp-orbit-dot-2" r="4.5">
                  <animateMotion dur="11s" repeatCount="indefinite" keyPoints="0.35;1.35" keyTimes="0;1" calcMode="linear">
                    <mpath href="#lpRing2" />
                  </animateMotion>
                </circle>
              </g>

              <g transform="rotate(64 440 260)">
                <path id="lpRing3" className="lp-orbit-ring" d={ellipsePath(440, 260, 250, 96)} />
                <circle className="lp-orbit-dot lp-orbit-dot-3" r="4">
                  <animateMotion dur="9s" repeatCount="indefinite" keyPoints="0.7;1.7" keyTimes="0;1" calcMode="linear">
                    <mpath href="#lpRing3" />
                  </animateMotion>
                </circle>
              </g>
            </svg>

            <div className="lp-core">
              <img src="/infopace-logo.webp" alt="Infopace" />
              <span className="lp-core-label">HR Portal</span>
            </div>

            {ORBIT_CHIPS.map((c) => (
              <div
                key={c.label}
                className={`lp-chip ${c.optional ? 'lp-chip-opt' : ''}`}
                style={{ ...c.style, '--delay': c.delay }}
              >
                <span className={`lp-chip-ic ${c.tone}`}>
                  <Icon name={c.icon} size={13} />
                </span>
                {c.label}
              </div>
            ))}
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

      {/* ── Feature bento ── */}
      <section className="lp-section">
        <div className="lp-head" data-reveal>
          <span className="lp-tag">
            <Icon name="sparkle" size={13} /> Modules
          </span>
          <h2 className="lp-h2">Every HR workflow, unified</h2>
          <p className="lp-lede">
            From the first offer letter to the final exit checklist — no more spreadsheets,
            email threads and paper files scattered across teams.
          </p>
        </div>

        <div className="lp-bento">
          <article className="lp-card lp-card-wide" data-reveal>
            <span className="lp-card-ic">
              <Icon name="doc" size={21} />
            </span>
            <h3 className="lp-card-title">Offer letters &amp; appointment orders</h3>
            <p className="lp-card-desc">
              Generate branded letters from reusable templates in seconds, route them for
              approval and file them against the employee record automatically.
            </p>
            <div className="lp-mini">
              {[
                { t: 'Offer letter — Software Engineer', s: 'Signed', c: 'lp-status-green' },
                { t: 'Appointment order — HR Executive', s: 'Sent', c: 'lp-status-blue' },
                { t: 'Experience letter — Sales Lead', s: 'In review', c: 'lp-status-amber' },
              ].map((r, i) => (
                <div className="lp-mini-row" key={r.t} style={{ animationDelay: `${i * 140}ms` }}>
                  <span className="lp-mini-dot">
                    <Icon name="doc" size={12} />
                  </span>
                  {r.t}
                  <span className={`lp-mini-status ${r.c}`}>{r.s}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="lp-card lp-card-wide" data-reveal style={{ '--d': '110ms' }}>
            <span className="lp-card-ic is-teal">
              <Icon name="clock" size={21} />
            </span>
            <h3 className="lp-card-title">Leave &amp; attendance</h3>
            <p className="lp-card-desc">
              Biometric sync, shift summaries, holiday calendars and self-service leave
              requests — reconciled automatically, every single day.
            </p>
            <div className="lp-mini">
              <div className="lp-bars">
                {[52, 74, 61, 88, 69, 94, 48, 80, 66].map((h, i) => (
                  <span
                    key={`${h}-${i}`}
                    className={`lp-bar ${i % 4 === 3 ? 'is-soft' : ''}`}
                    style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }}
                  />
                ))}
              </div>
            </div>
          </article>

          <article className="lp-card lp-card-third" data-reveal>
            <span className="lp-card-ic is-purple">
              <Icon name="wallet" size={21} />
            </span>
            <h3 className="lp-card-title">Payroll &amp; payslips</h3>
            <p className="lp-card-desc">
              Run payroll across the organisation, publish instant payslips and keep every
              cycle audit-ready.
            </p>
          </article>

          <article className="lp-card lp-card-third" data-reveal style={{ '--d': '90ms' }}>
            <span className="lp-card-ic is-amber">
              <Icon name="check" size={21} />
            </span>
            <h3 className="lp-card-title">Approvals &amp; workflows</h3>
            <p className="lp-card-desc">
              Configurable multi-level chains for leave, expenses and letters, routed to the
              right people automatically.
            </p>
          </article>

          <article className="lp-card lp-card-third" data-reveal style={{ '--d': '180ms' }}>
            <span className="lp-card-ic">
              <Icon name="chart" size={21} />
            </span>
            <h3 className="lp-card-title">Analytics &amp; reports</h3>
            <p className="lp-card-desc">
              Live dashboards across headcount, attendance and payroll so leadership decides
              on facts, not guesses.
            </p>
          </article>
        </div>
      </section>

      {/* ── Isometric architecture ── */}
      <section className="lp-section lp-section-tinted" id="platform">
        <div className="lp-head" data-reveal>
          <span className="lp-tag">
            <Icon name="layers" size={13} /> Platform
          </span>
          <h2 className="lp-h2">Four connected layers, one portal</h2>
          <p className="lp-lede">
            Each layer feeds the next — so a single employee record drives every letter,
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
            {LAYERS.map((l, i) => (
              <button
                key={l.name}
                className={`lp-iso-item ${layer === i ? 'is-active' : ''}`}
                onMouseEnter={() => setLayer(i)}
                onFocus={() => setLayer(i)}
                onClick={() => setLayer(i)}
                data-reveal
                style={{ '--d': `${i * 80}ms` }}
              >
                <span className="lp-iso-num">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="lp-iso-name">{l.name}</span>
                  <span className="lp-iso-desc">{l.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sticky explorer ── */}
      <section className="lp-section" id="workflow">
        <div className="lp-head" data-reveal>
          <span className="lp-tag">
            <Icon name="bolt" size={13} /> Workflow
          </span>
          <h2 className="lp-h2">Watch a month run itself</h2>
          <p className="lp-lede">
            Scroll through a typical cycle — the portal on the left keeps up with each stage.
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
                    { t: 'Offer letter — Software Engineer', s: 'Signed', c: 'lp-status-green' },
                    { t: 'Appointment order — HR Executive', s: 'Sent', c: 'lp-status-blue' },
                    { t: 'Confirmation — Support Analyst', s: 'In review', c: 'lp-status-amber' },
                    { t: 'Experience letter — Sales Lead', s: 'Signed', c: 'lp-status-green' },
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
          <span className="lp-tag">
            <Icon name="users" size={13} /> Journey
          </span>
          <h2 className="lp-h2">The full employee lifecycle</h2>
          <p className="lp-lede">
            One record follows every person from their offer letter to their experience
            letter — nothing re-typed, nothing lost.
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
              approvals — everything waiting exactly where you left it.
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
              Use “Forgot password” on the sign-in page
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
              HR Automation System — the internal HR portal for Infopace India employees.
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
