import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from 'motion/react';
import Shot from './Shot';

const STATES = [
  { key: 'onboard', label: 'Onboard', shot: 'employees', ratio: 1.85,
    copy: 'Every joiner gets a record, an offer letter and a login, created in one flow.',
    alt: 'The employee directory listing sixteen staff records with role, department and joining date.' },
  { key: 'approve', label: 'Approve', shot: 'approvals', ratio: 1.85,
    copy: 'Leave, exits and letters queue in one place, with the balance already worked out.',
    alt: 'The leave management queue showing seven requests with type, dates, reason and approval status.' },
  { key: 'pay', label: 'Pay', shot: 'payslips', ratio: 1.85,
    copy: 'Payslips build from the same records, with PF, ESI and tax already deducted.',
    alt: 'The payslip management table listing September 2026 payslips with gross, deductions and net pay.' },
  { key: 'report', label: 'Report', shot: 'analytics', ratio: 1.85,
    copy: 'Headcount, attrition and the statutory register, ready when you need to file.',
    alt: 'The analytics screen showing headcount trend, department split and a statutory compliance register.' },
];

/**
 * Opacity ramp that makes exactly one state visible at a time. The
 * breakpoints are kept inside [0,1] and strictly increasing, which the
 * interpolation requires.
 */
function useStateOpacity(progress: MotionValue<number>, i: number, n: number) {
  const span = 1 / n;
  const a = i * span;          // this state takes over here
  const b = a + span;          // and hands on here
  const cf = span * 0.07;      // crossfade band, short so only one state reads
  const pts = [
    Math.max(0, a - cf),
    Math.max(0, a) + cf,
    Math.min(1, b - cf),
    Math.min(1, b + cf),
  ];
  for (let k = 1; k < pts.length; k++) {
    if (pts[k] <= pts[k - 1]) pts[k] = pts[k - 1] + 0.001;
  }
  const out = [i === 0 ? 1 : 0, 1, 1, i === n - 1 ? 1 : 0];
  return useTransform(progress, pts, out, { clamp: true });
}

function Frame({ s, i, n, progress }: {
  s: typeof STATES[number]; i: number; n: number; progress: MotionValue<number>;
}) {
  const opacity = useStateOpacity(progress, i, n);
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 grid place-items-center">
      <div className="w-full">
        <div className="bezel lift">
          <div className="bezel-core">
            <div className="aspect-[1.85] w-full">
              <Shot name={s.shot} ratio={s.ratio} alt={s.alt} cover
                    sizes="(max-width: 1023px) 92vw, 62vw" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Label({ s, i, n, progress }: {
  s: typeof STATES[number]; i: number; n: number; progress: MotionValue<number>;
}) {
  const active = useStateOpacity(progress, i, n);
  const dim = useTransform(active, v => 0.38 + v * 0.62);
  return (
    <li className="relative pl-5">
      <motion.span style={{ opacity: active }}
        className="absolute left-0 top-[0.55em] h-[calc(100%-1.1em)] w-[2px] rounded-full bg-accent" />
      <motion.div style={{ opacity: dim }}>
        <h3 className="type-tile">{s.label}</h3>
        <p className="type-body mt-1.5 max-w-[42ch] text-ink-2">{s.copy}</p>
      </motion.div>
    </li>
  );
}

export default function Walkthrough() {
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: track,
    offset: ['start start', 'end end'],
  });

  return (
    <section id="how" className="py-32 md:py-40">
      <div className="rail">
        <header className="mx-auto max-w-[65ch]">
          <h2 className="type-section text-balance">From offer letter to payslip</h2>
          <p className="type-sub mt-5 max-w-[58ch] text-ink-2">
            One record per employee, carried through every step, so nothing is
            retyped and nothing goes missing.
          </p>
        </header>
      </div>

      {/* Reduced motion: no pin, no scrub. The same four states, stacked. */}
      {reduced ? (
        <div className="rail mt-16 grid gap-16">
          {STATES.map(s => (
            <article key={s.key} className="grid gap-6">
              <div>
                <h3 className="type-tile">{s.label}</h3>
                <p className="type-body mt-1.5 max-w-[52ch] text-ink-2">{s.copy}</p>
              </div>
              <div className="bezel lift">
                <div className="bezel-core">
                  <Shot name={s.shot} ratio={s.ratio} alt={s.alt} sizes="92vw" />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <>
          {/* Mobile: the pin would leave no room for the visual, so the same
              states stack in a single column below 1024px. */}
          <div className="rail mt-14 grid gap-14 lg:hidden">
            {STATES.map(s => (
              <article key={s.key} className="grid gap-5">
                <div>
                  <h3 className="type-tile">{s.label}</h3>
                  <p className="type-body mt-1.5 max-w-[52ch] text-ink-2">{s.copy}</p>
                </div>
                <div className="bezel lift">
                  <div className="bezel-core">
                    <Shot name={s.shot} ratio={s.ratio} alt={s.alt} sizes="92vw" />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div ref={track} className="relative mt-20 hidden lg:block"
               style={{ height: `${STATES.length * 90}vh` }}>
            <div className="sticky top-12 flex h-[calc(100dvh-3rem)] items-center">
              <div className="rail grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1.85fr)] items-center gap-14">
                <ul className="grid gap-9">
                  {STATES.map((s, i) => (
                    <Label key={s.key} s={s} i={i} n={STATES.length} progress={scrollYProgress} />
                  ))}
                </ul>
                <div className="relative h-[70vh]">
                  {STATES.map((s, i) => (
                    <Frame key={s.key} s={s} i={i} n={STATES.length} progress={scrollYProgress} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
