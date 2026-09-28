import { motion, useReducedMotion } from 'motion/react';
import Shot from './Shot';

export default function PhotoBand() {
  const reduced = useReducedMotion();

  return (
    <section id="rollout" className="relative">
      <motion.div
        {...(reduced ? {} : {
          initial: { opacity: 0 },
          whileInView: { opacity: 1 },
          viewport: { once: true, margin: '-10% 0px' },
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
        })}
        className="relative"
      >
        <div className="relative max-h-[78vh] overflow-hidden">
          <Shot
            name="floor"
            ratio={2.333}
            sizes="100vw"
            alt="A shift supervisor presses her finger to a wall-mounted biometric attendance terminal at the start of the morning shift, with rolls of fabric and sewing stations behind her."
          />
          {/* Tonal overlay, dark enough to carry text at AA on the lower left. */}
          <div aria-hidden className="absolute inset-0
               bg-[linear-gradient(to_top,rgba(9,9,11,0.82)_0%,rgba(9,9,11,0.45)_38%,rgba(9,9,11,0.08)_72%)]" />

          <div className="absolute inset-x-0 bottom-0">
            <div className="rail pb-10 md:pb-16">
              <h2 className="type-section max-w-[16ch] text-balance text-[#F2F2F4]">
                Runs where the work happens
              </h2>
              <p className="type-sub mt-4 max-w-[46ch] text-[#D7D7DB]">
                A punch at the device on the floor and a login at the desk both
                land in the same day's record.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
