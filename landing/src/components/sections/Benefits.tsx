import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { Eyebrow, Counter, Chip } from '../primitives';
import { Gauge, BarRows } from '../charts';
import Shot from '../Shot';
import { EASE } from '../../lib/motion';

/**
 * Layout family: alternating storytelling blocks. Media and prose
 * swap sides, and the media parallaxes a little against the copy so
 * the rhythm is felt rather than just seen.
 */
function Block({ flip, children, media }: {
  flip?: boolean; children: React.ReactNode; media: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [26, -26]);

  return (
    <div ref={ref} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <motion.div
        initial={reduced ? false : { opacity: 0, x: flip ? 30 : -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-15% 0px' }}
        transition={{ duration: 0.65, ease: EASE }}
        className={flip ? 'lg:order-2' : ''}>
        {children}
      </motion.div>
      <motion.div style={reduced ? undefined : { y }} className={flip ? 'lg:order-1' : ''}>
        {media}
      </motion.div>
    </div>
  );
}

export default function Benefits() {
  return (
    <section className="bg-surface py-24 lg:py-32">
      <div className="rail">
        <div className="max-w-[54ch]">
          <Eyebrow>Outcomes</Eyebrow>
          <h2 className="t-h2 mt-4 text-balance text-ink">What changes once it is running</h2>
        </div>

        <div className="mt-16 grid gap-24 lg:gap-32">
          <Block media={
            <div className="panel-float p-7">
              <div className="flex items-center justify-between gap-3">
                <p className="t-micro text-ink-3">Hours per appraisal cycle</p>
                <Chip tone="good">Down</Chip>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-5">
                <div>
                  <p className="t-metric text-ink-3 line-through decoration-accent decoration-2">14d</p>
                  <p className="t-micro mt-1 text-ink-3">Before</p>
                </div>
                <div>
                  <p className="t-metric text-brand-700"><Counter to={4} suffix="d" /></p>
                  <p className="t-micro mt-1 text-ink-3">After, illustrative</p>
                </div>
              </div>
              <div className="mt-6 border-t border-hairline pt-5">
                <BarRows suffix="h" ariaLabel="Manual hours by stage"
                  rows={[
                    { label: 'Collecting inputs', value: 3 },
                    { label: 'Chasing managers', value: 2, tone: 'var(--c3)' },
                    { label: 'Compiling the pack', value: 1, tone: 'var(--c2)' },
                  ]} />
              </div>
            </div>
          }>
            <h3 className="t-h3 text-balance text-ink">
              The cycle stops being a fire drill
            </h3>
            <p className="t-body-xl mt-4 max-w-[46ch] text-ink-2">
              Inputs arrive as work happens instead of being gathered at the end,
              so the appraisal window is a review rather than a reconstruction.
            </p>
            <ul className="mt-6 grid gap-3">
              {['Reminders route themselves', 'Evidence is already attached', 'Nothing is retyped'].map(t => (
                <li key={t} className="flex items-start gap-3 text-[15px] text-ink">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                  {t}
                </li>
              ))}
            </ul>
          </Block>

          <Block flip media={
            <div className="overflow-hidden rounded-[8px] border border-hairline-blue bg-surface p-1.5
                            shadow-[var(--shadow-lg)]">
              <div className="overflow-hidden rounded-[4px]">
                <Shot name="compliance" ratio={5.868} sizes="(max-width: 1023px) 92vw, 46vw"
                  alt="A statutory compliance register row showing employee count, gross pay, provident fund, employee state insurance, professional tax and tax deducted at source." />
              </div>
            </div>
          }>
            <h3 className="t-h3 text-balance text-ink">
              Filing stops depending on one person's spreadsheet
            </h3>
            <p className="t-body-xl mt-4 max-w-[46ch] text-ink-2">
              Provident fund, state insurance, professional tax and TDS total up from
              the payroll runs you actually processed, so the register reconciles by
              construction.
            </p>
            <p className="t-small mt-6 text-ink-3">
              Screenshot from the running product.
            </p>
          </Block>

          <Block media={
            <div className="grid grid-cols-2 gap-4">
              <div className="panel grid place-items-center p-6">
                <Gauge value={94} label="Reviews closed on time" size={124} />
              </div>
              <div className="panel grid place-items-center p-6">
                <Gauge value={100} label="Records with an audit trail" size={124} color="var(--c3)" />
              </div>
              <div className="panel col-span-2 p-6">
                <p className="t-micro text-ink-3">Rating spread between managers</p>
                <div className="mt-3 flex items-end gap-1" aria-hidden>
                  {[9,14,22,31,26,17,11,6].map((h, i) => (
                    <span key={i} className="w-full rounded-t-[3px] bg-brand-300"
                          style={{ height: h * 2.2 }} />
                  ))}
                </div>
                <p className="t-small mt-3 text-ink-2">
                  Calibration pulls the distribution back toward the centre.
                </p>
              </div>
            </div>
          }>
            <h3 className="t-h3 text-balance text-ink">
              A rating you can defend in the room
            </h3>
            <p className="t-body-xl mt-4 max-w-[46ch] text-ink-2">
              Every score traces back to the record it came from, so when the board
              asks how a number was reached, the answer is on screen rather than in
              somebody's memory.
            </p>
          </Block>
        </div>
      </div>
    </section>
  );
}
