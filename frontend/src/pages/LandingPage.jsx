import { useEffect, useRef, useState } from 'react';
import './LandingPage.css';

/* ── Icons ─────────────────────────────────────────────────────────────
   Hand-rolled because this project has no icon library and the sandbox
   cannot install one. One family, one stroke width, 24px grid.          */
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
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  lock: 'M6 10h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM8 10V7a4 4 0 0 1 8 0v3',
  receipt: 'M6 3h12a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1zM9 8h6M9 12h6',
  plug: 'M9 3v6M15 3v6M7 9h10v4a5 5 0 0 1-10 0zM12 18v3',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
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

/* ── Content ───────────────────────────────────────────────────────────
   Every figure below is a real default from the codebase, not a
   marketing number: rates and ceilings from backend/payroll_engine.py,
   leave caps from backend/routes/leaves.py, roles from routes/roles.py. */
const NAV = [
  { label: 'Modules', target: 'modules' },
  { label: 'Roles', target: 'roles' },
  { label: 'Payroll', target: 'payroll' },
  { label: 'Compliance', target: 'compliance' },
];

const COUNTS = [
  { n: '31', label: 'screens beyond the dashboard', sub: 'From employee records and payroll runs through to the audit log' },
  { n: '5', label: 'statutory heads on every run', sub: 'Provident fund, ESI, professional tax, TDS and loss of pay' },
  { n: '5', label: 'roles, every permission editable', sub: 'Admin, HR head, HR, manager and employee, plus custom roles' },
  { n: '4', label: 'leave types in the tracker', sub: 'Casual, sick and maternity capped by month, loss of pay logged' },
];

const MODULES = [
  {
    key: 'people',
    span: 'is-wide',
    kind: 'photo',
    icon: 'users',
    title: 'People records and org chart',
    body:
      'One record per employee carrying personal details, reporting line, documents, assigned assets and history. ' +
      'Every other module reads from it, so a change lands everywhere at once.',
    tags: ['Employees', 'Org chart', 'Documents', 'Assets'],
  },
  {
    key: 'payroll',
    kind: 'tint',
    icon: 'wallet',
    title: 'Payroll runs',
    body: 'Monthly runs with statutory deductions computed in the engine, payslips published to each employee.',
  },
  {
    key: 'time',
    icon: 'clock',
    title: 'Attendance and shifts',
    body: 'Biometric punches synced off your terminals, shift summaries and holiday calendars kept per company.',
  },
  {
    key: 'leave',
    icon: 'calendar',
    title: 'Leave tracker',
    body: 'Monthly caps by employee category, with days beyond the cap recorded as loss of pay automatically.',
  },
  {
    key: 'letters',
    icon: 'doc',
    title: 'Letters and templates',
    body: 'Offer, appointment, confirmation, experience and relieving letters from your own templates, as DOCX and PDF.',
  },
  {
    key: 'flow',
    span: 'is-wide',
    kind: 'ink',
    icon: 'bolt',
    title: 'Approvals and workflows',
    body:
      'Approval chains you configure per company rather than per request. Each stage names the role that signs off, ' +
      'whether self approval is allowed, and who gets notified when it moves.',
    tags: ['Leave', 'Expenses', 'Letters', 'Resignations'],
  },
  {
    key: 'expense',
    icon: 'receipt',
    title: 'Expenses',
    body: 'Claims submitted with a receipt, approved by the manager, then marked reimbursed once finance pays.',
  },
  {
    key: 'comms',
    icon: 'bell',
    title: 'Announcements and policies',
    body: 'A notice board that notifies the people it targets, and a policy library that tracks who acknowledged what.',
  },
  {
    key: 'audit',
    kind: 'tint',
    icon: 'chart',
    title: 'Reports and audit trail',
    body: 'Headcount and attrition trends, and a compliance register of the PF, ESI, PT and TDS actually withheld.',
  },
];

const ROLES = [
  {
    key: 'hr',
    tab: 'HR team',
    line: 'Runs the month and owns the records',
    points: [
      'Run payroll, review the register and publish payslips',
      'Generate offer and appointment letters, edit inline before approval',
      'Set approval chains, leave rules and payroll defaults per company',
      'Track policy acknowledgements, assets and the exit pipeline',
      'Pull the compliance register of PF, ESI, PT and TDS withheld',
    ],
  },
  {
    key: 'mgr',
    tab: 'Managers',
    line: 'Signs off for their own team, nobody else',
    points: [
      "Approve or reject the team's leave requests and expense claims",
      'See the month of attendance behind a request before deciding',
      'Approve a team resignation, but never their own',
      'View their branch of the org chart and who reports where',
    ],
  },
  {
    key: 'emp',
    tab: 'Employees',
    line: 'Self serves, and sees the loss of pay before submitting',
    points: [
      'Apply for leave with a live preview of the paid and loss of pay split',
      'Download payslips and letters from their own record',
      'Claim an expense with a receipt attached and follow its status',
      'Read and acknowledge policies, and see announcements addressed to them',
      'Submit a resignation and track clearance through to the relieving letter',
    ],
  },
];

const PAYROLL_POINTS = [
  'Provident fund at 12 percent, with the statutory wage ceiling applied or waived per company',
  'ESI computed for employees under the gross threshold, employer and employee share separately',
  'Professional tax from the slab for your state, or slabs you enter yourself',
  'A monthly TDS estimate from projected annual income, revised as the year runs',
  'Loss of pay pulled from attendance, so the run matches the register',
];

const TIME_POINTS = [
  'Punches pulled from eSSL and ZKTeco terminals over the network and de-duplicated on the way in',
  'Shift summaries, holiday calendars and incident history kept per company',
  'Casual and sick leave capped monthly, two days for regular staff and one on probation',
  'Days beyond the cap become loss of pay on the same request, and the employee sees it before submitting',
  'Approved leave moves the balance and feeds straight into the payroll run',
];

const STATUTORY = [
  { fig: '12%', label: 'Provident fund', note: 'Employee and employer share, with the statutory wage ceiling applied or waived per company.' },
  { fig: '₹15,000', label: 'PF wage ceiling', note: 'The default cap on PF wages. Editable, and waivable for companies that contribute on full basic.' },
  { fig: '₹21,000', label: 'ESI gross threshold', note: 'Employees under it are covered, with the employer and employee share computed separately.' },
  { fig: 'By state', label: 'Professional tax', note: 'Slabs ship for the states we support, and you can enter your own where they differ.' },
  { fig: 'Monthly', label: 'TDS estimate', note: 'Projected from annual income and revised as the year runs, rather than landing in March.' },
];

const LAYERS = [
  {
    name: 'People layer',
    desc: 'Employee records, org chart, roles and documents. The single source of truth every other module reads from.',
    tags: [{ t: 'Employees', w: 84 }, { t: 'Org chart', w: 82 }],
  },
  {
    name: 'HR operations layer',
    desc: 'Letters, onboarding, leave, attendance, expenses and exits. The day-to-day work your HR team actually runs.',
    tags: [{ t: 'Letters', w: 74 }, { t: 'Leave & attendance', w: 126 }],
  },
  {
    name: 'Automation engine',
    desc: 'Approval chains, configurable workflows and payroll runs that route themselves to the right people.',
    tags: [{ t: 'Approvals', w: 84 }, { t: 'Payroll runs', w: 96 }],
  },
  {
    name: 'Data and compliance layer',
    desc: 'Role-based access, audit log, the compliance register and a read-only API for the systems around it.',
    tags: [{ t: 'Audit log', w: 82 }, { t: 'Access control', w: 106 }],
  },
];

const JOURNEY = [
  { phase: 'Offer', title: 'Offer', desc: 'Letter built from your template with the CTC broken out, approved, then emailed.', icon: 'mail' },
  { phase: 'Joining', title: 'Onboarding', desc: 'Accepting the offer creates the login. Documents collected, assets assigned.', icon: 'users' },
  { phase: 'Everyday', title: 'Everyday', desc: 'Attendance, leave, payslips, expenses and policies, all self served.', icon: 'calendar' },
  { phase: 'Review', title: 'Confirmation', desc: 'Probation closes, the confirmation letter files against the same record.', icon: 'chart' },
  { phase: 'Leaving', title: 'Exit', desc: 'Resignation, manager approval, clearance, settlement and the relieving letter.', icon: 'exit' },
];

const FAQ = [
  {
    q: 'Who can sign in?',
    a:
      'Anyone your HR administrator has created a record for. Accepting an offer letter creates the login ' +
      'automatically, so most people already have one by their first day. You sign in with your company code ' +
      'and your own credentials.',
  },
  {
    q: 'Does attendance still have to be keyed in?',
    a:
      'No. A sync service talks to your eSSL and ZKTeco terminals over the network, de-duplicates the punches ' +
      'and writes them into the month. Staff working away from a terminal can mark attendance from the web instead.',
  },
  {
    q: 'Can we change the PF, ESI and professional tax settings?',
    a:
      'Yes. Rates, the wage ceiling, the ESI threshold and the professional tax slabs all ship as defaults and ' +
      'are editable per company. Companies that contribute on full basic can waive the ceiling outright.',
  },
  {
    q: 'Who approves what?',
    a:
      'You decide. Approval chains are configured per company rather than per request: each stage names the role ' +
      'that signs off and whether self approval is allowed. Managers handle their own team, HR sees everything, ' +
      'and a manager can never approve their own request.',
  },
  {
    q: 'Can other systems read this data?',
    a:
      'On the Enterprise plan, yes. You can issue API keys for the read-only public API and subscribe webhooks ' +
      'so another system hears about changes as they happen.',
  },
  {
    q: 'What happens when someone resigns?',
    a:
      'The resignation goes to their manager, then into the exit pipeline: clearance checklist, final settlement ' +
      'and the relieving letter, all against the record that was opened when they were offered the job.',
  },
];

/* ── Helpers ───────────────────────────────────────────────────────── */
function goToLogin() {
  window.location.hash = '/login';
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const layerRefs = useRef([]);
  const [stuck, setStuck] = useState(false);
  const [layer, setLayer] = useState(1);
  const [role, setRole] = useState(0);
  const [openQ, setOpenQ] = useState(0);

  /* subtle pointer parallax on the hero photograph */
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
            <button className="lp-btn lp-btn-primary lp-btn-sm" onClick={goToLogin}>
              Open the portal <Icon name="arrow" size={15} className="lp-arrow" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── 1. Hero ── split copy / photograph ── */}
      <header className="lp-hero" ref={heroRef}>
        <div className="lp-hero-split">
          <div className="lp-hero-copy">
            <h1 className="lp-h1" data-reveal>
              Run your entire HR operation in one place
            </h1>

            <p className="lp-hero-sub" data-reveal style={{ '--d': '90ms' }}>
              Hiring letters, attendance, leave, payroll and statutory filings, from a
              candidate&rsquo;s offer through to their relieving letter.
            </p>

            <div className="lp-hero-actions" data-reveal style={{ '--d': '180ms' }}>
              <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={goToLogin}>
                Open the portal <Icon name="arrow" size={16} className="lp-arrow" />
              </button>
              <button className="lp-btn lp-btn-outline lp-btn-lg" onClick={() => scrollToId('modules')}>
                See the modules
              </button>
            </div>
          </div>

          <figure className="lp-hero-figure" data-reveal style={{ '--d': '140ms' }}>
            <img
              src="/img/hero-office.webp"
              alt="Two colleagues reviewing work together on a laptop in an office"
              width="2048"
              height="1360"
              loading="eager"
              decoding="async"
            />
          </figure>
        </div>
      </header>

      {/* ── 2. Counts ── full-bleed band on ink ── */}
      <section className="lp-counts">
        <div className="lp-counts-inner">
          {COUNTS.map((c, i) => (
            <div className="lp-count" key={c.label} data-reveal style={{ '--d': `${i * 70}ms` }}>
              <div className="lp-count-n">{c.n}</div>
              <div className="lp-count-label">{c.label}</div>
              <div className="lp-count-sub">{c.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Modules ── bento ── */}
      <section className="lp-section" id="modules">
        <div className="lp-head" data-reveal>
          <span className="lp-tag">The suite</span>
          <h2 className="lp-h2">Everything your HR team opens in a week</h2>
          <p className="lp-lede">
            Not a payroll tool with HR bolted on. The modules below sit on one employee record
            and one set of permissions.
          </p>
        </div>

        <div className="lp-bento">
          {MODULES.map((m, i) => (
            <article
              className={`lp-cell ${m.span || ''} ${m.kind ? `is-${m.kind}` : ''}`}
              key={m.key}
              data-reveal
              style={{ '--d': `${(i % 3) * 70}ms` }}
            >
              {m.kind === 'photo' && (
                <div className="lp-cell-photo">
                  <img
                    src="/img/team-meeting.webp"
                    alt="Colleagues talking around a table in an office meeting room"
                    width="2048"
                    height="1365"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}

              <div className="lp-cell-body">
                <span className="lp-cell-ic">
                  <Icon name={m.icon} size={19} />
                </span>
                <h3 className="lp-cell-title">{m.title}</h3>
                <p className="lp-cell-text">{m.body}</p>
                {m.tags && (
                  <div className="lp-cell-tags">
                    {m.tags.map((t) => (
                      <span className="lp-chip" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── 4. Roles ── tabbed split ── */}
      <section className="lp-section lp-section-tinted" id="roles">
        <div className="lp-head" data-reveal>
          <h2 className="lp-h2">What each role sees</h2>
          <p className="lp-lede">
            Five roles ship with the system and every permission on them is editable. Add your own,
            and it behaves like the role you base it on.
          </p>
        </div>

        <div className="lp-roles" data-reveal>
          <div className="lp-role-tabs" role="tablist" aria-label="Roles">
            {ROLES.map((r, i) => (
              <button
                key={r.key}
                role="tab"
                aria-selected={role === i}
                className={`lp-role-tab ${role === i ? 'is-active' : ''}`}
                onClick={() => setRole(i)}
              >
                <span className="lp-role-tab-name">{r.tab}</span>
                <span className="lp-role-tab-line">{r.line}</span>
              </button>
            ))}
          </div>

          <div className="lp-role-panel">
            <ul className="lp-role-list" key={ROLES[role].key}>
              {ROLES[role].points.map((p) => (
                <li key={p}>
                  <span className="lp-tick">
                    <Icon name="check" size={11} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>

            <figure className="lp-role-figure">
              <img
                src="/img/desk-work.webp"
                alt="An employee working at a desk with a laptop open"
                width="2048"
                height="1536"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>
        </div>
      </section>

      {/* ── 5. Payroll ── zigzag 1 of 2 ── */}
      <section className="lp-section" id="payroll">
        <div className="lp-zig">
          <figure className="lp-figure" data-reveal>
            <img
              src="/img/payroll-desk.webp"
              alt="Salary statements and a calculator on a desk during a payroll run"
              width="2048"
              height="1536"
              loading="lazy"
              decoding="async"
            />
          </figure>

          <div className="lp-zig-copy" data-reveal style={{ '--d': '90ms' }}>
            <h2 className="lp-h2">The statutory maths runs inside the engine</h2>
            <p className="lp-lede">
              Most HR tools leave Indian compliance to a spreadsheet at the end of the month.
              This one computes it as part of the run.
            </p>
            <ul className="lp-points">
              {PAYROLL_POINTS.map((p) => (
                <li key={p}>
                  <span className="lp-tick">
                    <Icon name="check" size={11} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <p className="lp-note">
              Rates, ceilings and slabs ship as editable defaults. Your finance team sets them per
              company and the engine follows.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. Attendance and leave ── zigzag 2 of 2 ── */}
      <section className="lp-section" id="attendance">
        <div className="lp-zig is-flipped">
          <figure className="lp-figure" data-reveal>
            <img
              src="/img/biometric-terminal.webp"
              alt="An employee marking attendance on a wall mounted biometric terminal"
              width="2048"
              height="1536"
              loading="lazy"
              decoding="async"
            />
          </figure>

          <div className="lp-zig-copy" data-reveal style={{ '--d': '90ms' }}>
            <h2 className="lp-h2">Attendance syncs itself, leave rules decide what is paid</h2>
            <p className="lp-lede">
              The sync service talks to the terminals on your network, and the leave rules decide
              what is paid before anyone has to argue about it.
            </p>
            <ul className="lp-points">
              {TIME_POINTS.map((p) => (
                <li key={p}>
                  <span className="lp-tick">
                    <Icon name="check" size={11} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 7. Statutory figures ── full-width display row ── */}
      <section className="lp-statutory" id="compliance">
        <div className="lp-statutory-head" data-reveal>
          <span className="lp-tag">Statutory</span>
          <h2 className="lp-h2">The defaults the engine already knows</h2>
        </div>

        <div className="lp-stat-row">
          {STATUTORY.map((s, i) => (
            <div className="lp-stat" key={s.label} data-reveal style={{ '--d': `${i * 60}ms` }}>
              <div className="lp-stat-fig">{s.fig}</div>
              <div className="lp-stat-label">{s.label}</div>
              <p className="lp-stat-note">{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 8. Platform ── sticky isometric diagram ── */}
      <section className="lp-section" id="platform">
        <div className="lp-head" data-reveal>
          <h2 className="lp-h2">How it fits together</h2>
          <p className="lp-lede">
            One employee record sits underneath everything. Change it once and letters,
            approvals and payroll all see the change.
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

              <line x1={isoCx} y1="120" x2={isoCx} y2="520" stroke="#c8dafb" strokeWidth="1.5" strokeDasharray="5 7" />

              {LAYERS.map((l, i) => {
                const cy = 130 + i * 118;
                const on = layer === i;
                return (
                  <g key={l.name} className={`lp-iso-layer ${on ? 'is-active' : ''}`} onMouseEnter={() => setLayer(i)}>
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
            {/* the reveal observer adds .is-in imperatively, so it sits on a
                wrapper whose className React never rewrites */}
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

      {/* ── 9. Lifecycle ── timeline ── */}
      <section className="lp-section lp-section-tinted" id="journey">
        <div className="lp-head" data-reveal>
          <h2 className="lp-h2">From the offer letter to the relieving letter</h2>
          <p className="lp-lede">
            The same record follows a person the whole way through, so nothing has to be
            re-typed at the end.
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
            {JOURNEY.map((m) => (
              <div className="lp-ms" key={m.title}>
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

      {/* ── 10. FAQ ── accordion ── */}
      <section className="lp-section" id="faq">
        <div className="lp-faq">
          <div className="lp-faq-side" data-reveal>
            <h2 className="lp-h2">Questions people ask first</h2>
            <p className="lp-lede">
              If yours is not here, your HR administrator can answer it, or raise it from the
              support page once you are signed in.
            </p>
          </div>

          <div className="lp-faq-list" data-reveal style={{ '--d': '90ms' }}>
            {FAQ.map((f, i) => (
              <div className={`lp-qa ${openQ === i ? 'is-open' : ''}`} key={f.q}>
                <button
                  className="lp-qa-q"
                  aria-expanded={openQ === i}
                  onClick={() => setOpenQ(openQ === i ? -1 : i)}
                >
                  <span>{f.q}</span>
                  <span className="lp-qa-sign">
                    <Icon name={openQ === i ? 'minus' : 'plus'} size={16} />
                  </span>
                </button>
                <div className="lp-qa-a">
                  <p>{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. CTA ── */}
      <section className="lp-section">
        <div className="lp-cta-grid">
          <div className="lp-cta-main" data-reveal>
            <h2 className="lp-cta-title">Your HR workspace is one sign-in away</h2>
            <p className="lp-cta-sub">
              Letters, leave, attendance, payroll and approvals, with everything waiting
              exactly where you left it.
            </p>
            <button className="lp-btn lp-btn-lg lp-cta-btn" onClick={goToLogin}>
              Open the portal <Icon name="arrow" size={16} className="lp-arrow" />
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
              Use the &quot;Forgot password&quot; link on the sign-in page
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
              HR Automation System, the HR portal for Infopace India. Contact your administrator
              if you believe you should have access but cannot sign in.
            </p>
          </div>

          <div className="lp-footer-cols">
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">Modules</div>
              <button onClick={() => scrollToId('modules')}>The suite</button>
              <button onClick={() => scrollToId('payroll')}>Payroll</button>
              <button onClick={() => scrollToId('attendance')}>Attendance and leave</button>
              <button onClick={() => scrollToId('compliance')}>Statutory defaults</button>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">Roles</div>
              <button onClick={() => scrollToId('roles')}>HR team</button>
              <button onClick={() => scrollToId('roles')}>Managers</button>
              <button onClick={() => scrollToId('roles')}>Employees</button>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">More</div>
              <button onClick={() => scrollToId('platform')}>How it fits together</button>
              <button onClick={() => scrollToId('journey')}>Employee lifecycle</button>
              <button onClick={() => scrollToId('faq')}>Questions</button>
              <button onClick={goToLogin}>Open the portal</button>
            </div>
          </div>
        </div>

        <div className="lp-footer-base">
          <span>© {new Date().getFullYear()} Infopace India. All rights reserved.</span>
          <span>Role-based access · Audit logged</span>
        </div>
      </footer>
    </div>
  );
}
