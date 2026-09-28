import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { Eyebrow, Counter } from '../primitives';
import { EASE } from '../../lib/motion';

const ERAS = [
  { y: '1999', t: 'Infopace is founded',
    d: 'Set up as a strategic change management practice, working with Indian enterprises on restructuring and organisational design.' },
  { y: '2000s', t: 'Restructuring practice',
    d: 'Change programmes across manufacturing, financial services and public sector groups, building the appraisal and governance methods the platform now encodes.' },
  { y: '2010s', t: 'From advisory to systems',
    d: 'The recurring parts of those engagements, records, letters, attendance and payroll, are built into software rather than rebuilt per client.' },
  { y: 'Today', t: 'One multi-tenant platform',
    d: 'A single deployment serving many companies, each with its own admins, roles and scoped data.' },
];

/**
 * Layout family: a horizontal timeline on desktop, driven by a rail
 * that fills with scroll. Nothing else on the page runs horizontally.
 */
export default function Company() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.7'] });
  const fill = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <section id="company" className="border-y border-hairline bg-surface-tint py-24 lg:py-32">
      <div className="rail">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end">
          <div>
            <Eyebrow>The company</Eyebrow>
            <h2 className="t-h2 mt-4 max-w-[18ch] text-balance text-ink">
              A change management practice since 1999
            </h2>
          </div>
          <p className="t-body-xl max-w-[52ch] text-ink-2">
            The platform is the product of twenty five years of restructuring work,
            not a greenfield guess at what HR teams need.
          </p>
        </div>

        {/* credibility figures: company facts, not customer claims */}
        <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-[12px]
                       border border-hairline bg-hairline lg:grid-cols-4">
          {[
            { v: 1999, k: 'Year founded', raw: true },
            { v: 25,   k: 'Years in practice', suffix: '+' },
            { v: 18,   k: 'Sectors served' },
            { v: 1,    k: 'Deployment, many tenants' },
          ].map(m => (
            <div key={m.k} className="bg-surface p-6">
              <dd className="t-metric text-ink">
                {m.raw ? m.v : <Counter to={m.v} suffix={m.suffix ?? ''} />}
              </dd>
              <dt className="t-micro mt-2 text-ink-3">{m.k}</dt>
            </div>
          ))}
        </dl>

        {/* timeline */}
        <div ref={ref} className="relative mt-16">
          <div aria-hidden className="absolute left-0 right-0 top-[15px] h-px bg-hairline" />
          {!reduced && (
            <motion.div aria-hidden style={{ width: fill }}
              className="absolute left-0 top-[15px] h-px bg-brand-600" />
          )}
          <ol className="grid gap-10 md:grid-cols-4 md:gap-6">
            {ERAS.map((e, i) => (
              <motion.li key={e.y}
                initial={reduced ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-15% 0px' }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: EASE }}
                className="group relative pt-12">
                <span aria-hidden
                  className="absolute left-0 top-[9px] h-3.5 w-3.5 rounded-full border-2
                             border-brand-600 bg-surface transition-colors duration-300
                             group-hover:bg-brand-600" />
                <p className="tnum absolute left-0 top-[34px] text-[13px] font-800 text-brand-700">{e.y}</p>
                <h3 className="t-h4 text-balance text-ink">{e.t}</h3>
                <p className="t-small mt-2.5 text-ink-2">{e.d}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
