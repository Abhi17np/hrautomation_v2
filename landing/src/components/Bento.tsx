import { motion, useReducedMotion } from 'motion/react';
import { ClockIcon, CalendarBlankIcon, FileTextIcon, BuildingsIcon } from '@phosphor-icons/react';
import Shot from './Shot';

const rise = (reduced: boolean | null) =>
  reduced
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-12% 0px' },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
      };

export default function Bento() {
  const reduced = useReducedMotion();
  const anim = rise(reduced);

  return (
    <section id="modules" className="bg-bg-tint py-32 md:py-40">
      <div className="rail">
        <header className="mx-auto max-w-[65ch]">
          <h2 className="type-section text-balance">Modules your team already needs</h2>
          <p className="type-sub mt-5 max-w-[58ch] text-ink-2">
            Each one reads and writes the same employee record, so the numbers
            agree wherever you look.
          </p>
        </header>

        {/* Asymmetric: 4+2 over 2+2+2 over 3+3. Five cells, five subjects. */}
        <div className="mt-14 grid gap-4 lg:grid-cols-6 lg:gap-5">

          {/* 1. Large, double-bezel, real UI crop */}
          <motion.article {...anim}
            className="bezel lg:col-span-4 lg:row-span-2">
            <div className="bezel-core flex h-full flex-col justify-between gap-8 p-10 md:p-14">
              <div>
                <h3 className="type-tile text-balance">Statutory totals you can file from</h3>
                <p className="type-body mt-3 max-w-[46ch] text-ink-2">
                  PF, ESI, professional tax and TDS add up from the payroll runs you
                  actually processed, not from a separate spreadsheet.
                </p>
              </div>
              <div className="overflow-hidden rounded-[12px] shadow-[0_0_0_1px_var(--hairline)]">
                <Shot name="compliance" ratio={5.868}
                      sizes="(max-width: 1023px) 88vw, 56vw"
                      alt="A statutory compliance register row showing employee count, gross pay, provident fund, employee state insurance, professional tax and tax deducted at source for one month." />
              </div>
            </div>
          </motion.article>

          {/* 2. Tonal fill */}
          <motion.article {...anim}
            className="rounded-[28px] bg-tile-tone p-10 lg:col-span-2">
            <ClockIcon size={26} weight="light" className="text-ink-2" aria-hidden />
            <h3 className="type-tile mt-6 text-balance">Attendance from both sources</h3>
            <p className="type-body mt-3 text-ink-2">
              Biometric punches and web logins land in the same daily record, so
              there is one answer per person per day.
            </p>
          </motion.article>

          {/* 3. Plain */}
          <motion.article {...anim}
            className="rounded-[28px] bg-bg-raised p-10 shadow-[0_0_0_1px_var(--hairline)] lg:col-span-2">
            <CalendarBlankIcon size={26} weight="light" className="text-ink-2" aria-hidden />
            <h3 className="type-tile mt-6 text-balance">Leave with real balances</h3>
            <p className="type-body mt-3 text-ink-2">
              Monthly quota logic and manager approval, with the remaining balance
              shown before anyone approves.
            </p>
          </motion.article>

          {/* 4. Plain */}
          <motion.article {...anim}
            className="rounded-[28px] bg-bg-raised p-10 shadow-[0_0_0_1px_var(--hairline)] lg:col-span-3">
            <FileTextIcon size={26} weight="light" className="text-ink-2" aria-hidden />
            <h3 className="type-tile mt-6 text-balance">Letters from your own templates</h3>
            <p className="type-body mt-3 max-w-[44ch] text-ink-2">
              Upload a Word template once, then generate offer, appointment and
              relieving letters from it with the employee's details filled in.
            </p>
          </motion.article>

          {/* 5. Tonal fill */}
          <motion.article {...anim}
            className="rounded-[28px] bg-tile-tone p-10 lg:col-span-3">
            <BuildingsIcon size={26} weight="light" className="text-ink-2" aria-hidden />
            <h3 className="type-tile mt-6 text-balance">One deployment, many companies</h3>
            <p className="type-body mt-3 max-w-[44ch] text-ink-2">
              Every record is scoped to its tenant, with separate admins, roles and
              indexes, so one install can serve each company you run.
            </p>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
