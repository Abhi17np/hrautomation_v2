import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from 'motion/react';
import { Eyebrow } from '../primitives';
import { EASE } from '../../lib/motion';

type Step = { n: number; t: string; d: string; detail: string };

const STEPS: Step[] = [
  { n: 1, t: 'Define goals',
    d: 'Board objectives are written once and cascaded down, so every target on the floor still points at the original.',
    detail: 'One objective splits into department targets, then individual goals, each carrying a link back to its parent.' },
  { n: 2, t: 'Track progress',
    d: 'Attendance, leave and delivery data land against the same record continuously, not in a scramble at year end.',
    detail: 'Biometric punches, web logins and approved leave all write to one daily record per person.' },
  { n: 3, t: 'Review performance',
    d: 'Managers rate against evidence already on the record, with the balance and history in front of them.',
    detail: 'The reviewer sees attendance, leave taken and goal completion on the same screen as the rating.' },
  { n: 4, t: 'Generate insights',
    d: 'Trends, outliers and statutory totals compile themselves from runs you actually processed.',
    detail: 'Headcount, attrition and the PF, ESI and TDS register are derived, never keyed in twice.' },
  { n: 5, t: 'Drive growth',
    d: 'The board gets a defensible picture, and the next cycle starts from what the last one proved.',
    detail: 'Last cycle\u2019s outcomes seed the next set of objectives, so the loop closes.' },
];

function Node({ i, progress }: { i: number; progress: MotionValue<number> }) {
  const at = i / STEPS.length;
  const fill = useTransform(progress, [at - 0.06, at + 0.04], [0, 1], { clamp: true });
  const scale = useTransform(fill, [0, 1], [0.86, 1]);
  return (
    <motion.span style={{ scale }}
      className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full
                 border border-hairline bg-surface">
      <motion.span style={{ opacity: fill }}
        className="absolute inset-0 rounded-full bg-brand-700" />
      <motion.span style={{ opacity: fill }}
        className="absolute inset-0 rounded-full ring-4 ring-[color-mix(in_srgb,var(--brand)_18%,transparent)]" />
      <motion.span className="relative tnum text-[13px] font-800"
        style={{ color: useTransform(fill, [0, 0.48, 0.52, 1], ['#475569', '#475569', '#FFFFFF', '#FFFFFF']) }}>
        {i + 1}
      </motion.span>
    </motion.span>
  );
}

/**
 * Layout family: a single vertical spine. The rail fills as you
 * scroll, which is the section's progress indicator.
 */
export default function Journey() {
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<number | null>(null);
  const { scrollYProgress } = useScroll({
    target: track,
    offset: ['start 0.7', 'end 0.65'],
  });

  return (
    <section id="journey" className="relative bg-surface py-24 lg:py-32">
      <div className="rail">
        <div className="mx-auto max-w-[62ch] text-center">
          <Eyebrow>The method</Eyebrow>
          <h2 className="t-h2 mt-4 text-balance text-ink">A proven transformation methodology</h2>
          <p className="t-body-xl mt-5 text-ink-2">
            Five stages, run on a loop. Each one leaves a record the next one can use.
          </p>
        </div>

        <div ref={track} className="relative mx-auto mt-16 max-w-[900px]">
          {/* the spine */}
          <div aria-hidden className="absolute left-[21px] top-2 h-[calc(100%-2rem)] w-px bg-hairline md:left-1/2 md:-translate-x-1/2" />
          {!reduced && (
            <motion.div aria-hidden
              style={{ scaleY: scrollYProgress, transformOrigin: 'top' }}
              className="absolute left-[21px] top-2 h-[calc(100%-2rem)] w-px bg-brand-600 md:left-1/2 md:-translate-x-1/2" />
          )}

          <ol className="grid gap-10 md:gap-14">
            {STEPS.map((s, i) => {
              const left = i % 2 === 0;   // desktop: alternate sides of the spine
              const on = open === i;
              const Card = (
                <motion.div
                  initial={reduced ? false : { opacity: 0, x: left ? -28 : 28 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-18% 0px' }}
                  transition={{ duration: 0.6, ease: EASE }}>
                  <div className={`panel relative p-6 transition-all duration-300
                                   hover:shadow-[var(--shadow-md)]
                                   ${on ? 'border-brand-400 shadow-[var(--shadow-md)]' : ''}
                                   ${left ? 'md:text-right' : ''}`}>
                    <button type="button" onClick={() => setOpen(on ? null : i)} aria-expanded={on}
                      className="absolute inset-0 z-10 cursor-pointer rounded-[16px]">
                      <span className="sr-only">
                        {on ? 'Hide detail for' : 'Show detail for'} {s.t}
                      </span>
                    </button>
                    <div className="relative">
                      <h3 className="t-h4 text-ink">{s.t}</h3>
                      <p className="t-body mt-2 text-ink-2">{s.d}</p>
                      <motion.div initial={false} aria-hidden={!on}
                        animate={{ height: on ? 'auto' : 0, opacity: on ? 1 : 0 }}
                        transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
                        className="overflow-hidden">
                        <p className="mt-3 border-t border-hairline-blue pt-3 text-[14px] font-600 text-brand-700">
                          {s.detail}
                        </p>
                      </motion.div>
                      <span className={`t-micro mt-3 inline-block transition-colors
                        ${on ? 'text-ink-3' : 'text-brand-700'}`}>
                        {on ? 'Hide' : 'What that means'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
              return (
                <li key={s.n}
                    className="relative flex items-start gap-5 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-8">
                  {/* desktop left cell */}
                  <div className="hidden md:block">{left ? Card : null}</div>
                  <Node i={i} progress={scrollYProgress} />
                  {/* desktop right cell, and the only cell on mobile */}
                  <div className="flex-1 md:flex-none">
                    <div className="md:hidden">{Card}</div>
                    <div className="hidden md:block">{left ? null : Card}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
