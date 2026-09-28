import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { TrendUpIcon, WarningIcon, PulseIcon } from '@phosphor-icons/react';
import { TrendLine } from '../charts';
import { Counter, SampleTag } from '../primitives';
import { EASE } from '../../lib/motion';

const FORECAST = [58, 61, 60, 64, 67, 66, 70, 73, 71, 76, 79, 83, 86, 89];
const FLABELS  = ['Q1','','Q2','','Q3','','Q4','','Q1','','Q2','','Q3','Q4'];

const RISKS = [
  { role: 'Cloud architect, core engineering', score: 82, note: 'No review logged in three cycles, two peers exited this quarter.' },
  { role: 'Enterprise sales lead, BFSI',        score: 68, note: 'Goal completion down 24 points against a rising quota.' },
  { role: 'Shift supervisor, manufacturing',    score: 41, note: 'Overtime up, but attendance and output both stable.' },
];

export default function Intelligence() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  // gentle parallax on the backdrop only: transform, nothing else
  const gridY = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);
  const glowY = useTransform(scrollYProgress, [0, 1], ['12%', '-12%']);

  return (
    <section id="intelligence" ref={ref}
      className="relative isolate overflow-hidden bg-[var(--surface-deep)] py-24 text-[var(--on-deep)] lg:py-32">

      {/* backdrop: a technical grid, parallaxed. No mesh gradient. */}
      <motion.div aria-hidden style={reduced ? undefined : { y: gridY }}
        className="pointer-events-none absolute inset-x-0 -top-[10%] h-[120%] opacity-[0.10]">
        <div className="h-full w-full"
             style={{ backgroundImage:
               'linear-gradient(to right, var(--on-deep-3) 1px, transparent 1px), linear-gradient(to bottom, var(--on-deep-3) 1px, transparent 1px)',
               backgroundSize: '56px 56px' }} />
      </motion.div>
      <motion.div aria-hidden style={reduced ? undefined : { y: glowY }}
        className="pointer-events-none absolute -right-32 top-1/4 h-[460px] w-[460px] rounded-full opacity-25">
        <div className="h-full w-full rounded-full"
          style={{ background: 'radial-gradient(circle, var(--d1) 0%, transparent 65%)' }} />
      </motion.div>

      <div className="rail relative">
        <div className="max-w-[58ch]">
          <p className="t-micro flex items-center gap-2 text-[var(--on-deep-3)]">
            <PulseIcon size={15} weight="bold" aria-hidden /> Workforce intelligence
          </p>
          <h2 className="t-h2 mt-4 text-balance text-white">
            Deep workforce intelligence and risk mitigation
          </h2>
          <p className="t-body-xl mt-5 text-[var(--on-deep-2)]">
            The same records, read forward. Trends, forecasts and the people most
            likely to leave before anyone files a resignation.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* forecast */}
          <div className="rounded-[12px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="t-h4 text-white">Performance index and forecast</h3>
                <p className="t-small mt-1 text-[var(--on-deep-2)]">
                  Solid to date, dashed is projected
                </p>
              </div>
              <SampleTag />
            </div>
            <div className="mt-5">
              <TrendLine data={FORECAST} labels={FLABELS} forecastFrom={11} height={210}
                color="var(--d1)" ariaLabel="Performance index rising, with a projected tail." />
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
              {[
                { k: 'Index today', v: 83, s: '' },
                { k: 'Projected, 2 quarters', v: 89, s: '' },
                { k: 'Teams above median', v: 12, s: '' },
              ].map(m => (
                <div key={m.k}>
                  <dd className="tnum text-2xl font-800 leading-none text-white">
                    <Counter to={m.v} suffix={m.s} />
                  </dd>
                  <dt className="t-micro mt-2 text-[var(--on-deep-2)]">{m.k}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* risk radar */}
          <div className="rounded-[12px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="t-h4 text-white">Flight-risk radar</h3>
              <WarningIcon size={19} weight="light" className="text-[var(--crit-deep)]" aria-hidden />
            </div>
            <ul className="mt-5 grid gap-3">
              {RISKS.map((r, i) => {
                const tone = r.score >= 75 ? 'var(--crit-deep)' : r.score >= 55 ? 'var(--warn-deep)' : 'var(--good-deep)';
                const band = r.score >= 75 ? 'High' : r.score >= 55 ? 'Watch' : 'Stable';
                return (
                  <motion.li key={r.role}
                    initial={reduced ? false : { opacity: 0, x: 18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-12% 0px' }}
                    transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}
                    className="group rounded-[8px] border border-white/10 bg-[var(--surface-deep-2)] p-4
                               transition-colors duration-300 hover:border-white/25">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[14px] font-700 leading-snug text-white">{r.role}</p>
                      {/* band is labelled, so the colour is never the only signal */}
                      <span className="chip shrink-0" style={{ color: tone, background: `${tone}1F` }}>
                        {band}
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div className="h-full rounded-full" style={{ background: tone }}
                        initial={reduced ? false : { width: 0 }}
                        whileInView={{ width: `${r.score}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: 0.15 + i * 0.1, ease: EASE }} />
                    </div>
                    <p className="t-small mt-2.5 text-[var(--on-deep-2)]">{r.note}</p>
                  </motion.li>
                );
              })}
            </ul>
            <p className="t-micro mt-5 flex items-center gap-2 text-[var(--on-deep-2)]">
              <TrendUpIcon size={14} weight="bold" aria-hidden />
              Scores are illustrative
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
