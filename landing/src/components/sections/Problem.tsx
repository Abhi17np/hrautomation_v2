import { motion, useReducedMotion } from 'motion/react';
import { Eyebrow, Reveal } from '../primitives';
import { EASE } from '../../lib/motion';

const FAILURES = [
  { n: '01', t: 'Goals never reach the floor',
    d: 'Objectives are agreed in a boardroom, then live in a spreadsheet nobody on the shop floor opens again.' },
  { n: '02', t: 'Nine months of silence',
    d: 'Nothing is measured between the kickoff and the appraisal, so drift is only visible once it is expensive.' },
  { n: '03', t: 'Appraisals run as a fire drill',
    d: 'Reviews compress into two frantic weeks, and managers rate from memory rather than from evidence.' },
  { n: '04', t: 'Ratings that cannot be defended',
    d: 'Two managers score the same performance differently, and no one can show the board how a number was reached.' },
];

/**
 * Layout family: a stepped diagonal ladder. Each entry is inset
 * further than the last, so the eye descends rather than scanning a
 * grid. Nothing else on the page uses this arrangement.
 */
export default function Problem() {
  const rm = useReducedMotion();
  return (
    <section className="relative border-y border-hairline bg-surface py-24 lg:py-32">
      <div className="rail">
        <div className="max-w-[58ch]">
          <Eyebrow tone="accent">The cost of the status quo</Eyebrow>
          <h2 className="t-h2 mt-4 text-balance text-ink">
            Why traditional performance management fails
          </h2>
        </div>

        <ol className="mt-14 grid gap-px">
          {FAILURES.map((f, i) => (
            <motion.li
              key={f.n}
              initial={rm ? false : { opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
              className="group relative"
              style={{ paddingLeft: `calc(${i} * clamp(0px, 3.4vw, 64px))` }}
            >
              <div className="relative flex items-start gap-5 border-t border-hairline py-8
                              transition-colors duration-300 sm:gap-8 lg:py-9">
                {/* the red rule grows on hover: the accent marks a problem, an action */}
                <span aria-hidden
                      className="absolute left-0 top-0 h-px w-0 bg-accent transition-all duration-500
                                 ease-out group-hover:w-full" />
                <span className="tnum shrink-0 text-[13px] font-800 text-accent">{f.n}</span>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,22ch)_minmax(0,1fr)] sm:gap-10">
                  <h3 className="t-h4 text-balance text-ink transition-transform duration-300
                                 group-hover:translate-x-1">{f.t}</h3>
                  <p className="t-body max-w-[58ch] text-ink-2">{f.d}</p>
                </div>
              </div>
            </motion.li>
          ))}
        </ol>

        <Reveal className="mt-12 border-t border-hairline pt-8">
          <p className="t-body-xl max-w-[48ch] text-ink">
            Every one of these is a records problem before it is a people problem.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
