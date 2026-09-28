import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { usePointer, useShift } from '../primitives';

/**
 * Layout family: full-bleed dark declaration. The largest type on the
 * page, a backdrop that drifts with scroll, and a beam that follows
 * the pointer. Deliberately unlike every section above it.
 */
export default function FinalCta() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  const { ref: area, x: px, y: py } = usePointer(1);
  const beamX = useShift(px, 90);
  const beamY = useShift(py, 60);

  return (
    <section id="book" ref={ref}
      className="relative isolate overflow-hidden bg-[var(--surface-deep)] py-28 lg:py-40">

      <motion.div aria-hidden style={reduced ? undefined : { y }}
        className="pointer-events-none absolute inset-x-0 -top-[15%] h-[130%] opacity-[0.09]">
        <div className="h-full w-full"
             style={{ backgroundImage:
               'linear-gradient(to right, var(--on-deep-3) 1px, transparent 1px), linear-gradient(to bottom, var(--on-deep-3) 1px, transparent 1px)',
               backgroundSize: '72px 72px' }} />
      </motion.div>

      <div ref={area} className="relative">
        {/* pointer-follow beam */}
        <motion.div aria-hidden
          style={reduced ? undefined : { x: beamX, y: beamY }}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px]
                     -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30">
          <div className="h-full w-full rounded-full"
               style={{ background: 'radial-gradient(circle, var(--d1) 0%, transparent 62%)' }} />
        </motion.div>

        <div className="rail relative text-center">
          <motion.p
            initial={reduced ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="t-micro text-[var(--on-deep-3)]">
            Infopace HR Automation
          </motion.p>

          <motion.h2
            initial={reduced ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="t-display mx-auto mt-5 max-w-[16ch] text-balance text-white">
            Bring your HR operations onto one record
          </motion.h2>

          <motion.p
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.14 }}
            className="t-body-xl mx-auto mt-6 max-w-[54ch] text-[var(--on-deep-2)]">
            We will walk your team through the product on your own structure, your
            departments, your leave policy and your payroll setup.
          </motion.p>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="mt-11 flex flex-wrap items-center justify-center gap-3">
            <a href="mailto:hello@infopaceindia.com?subject=Infopace%20HR%20demo"
               className="group inline-flex min-h-13 items-center gap-2 rounded-[8px] bg-white px-7
                          text-[15px] font-700 text-[var(--surface-deep)]
                          transition-transform duration-200 hover:-translate-y-0.5">
              Book a demo
              <ArrowRightIcon size={17} weight="bold" aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-1" />
            </a>
            <a href="#product"
               className="inline-flex min-h-13 items-center rounded-[8px] border border-white/25
                          px-6 text-[15px] font-600 text-white transition-colors duration-200
                          hover:border-white/60 hover:bg-white/5">
              See the product first
            </a>
          </motion.div>

          <p className="t-small mt-8 text-[var(--on-deep-2)]">
            Or write to <a href="mailto:hello@infopaceindia.com"
              className="text-[var(--on-deep-3)] underline underline-offset-4">hello@infopaceindia.com</a>
          </p>
        </div>
      </div>
    </section>
  );
}
