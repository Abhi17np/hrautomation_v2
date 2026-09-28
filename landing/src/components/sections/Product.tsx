import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Eyebrow, Chip } from '../primitives';
import Shot from '../Shot';
import { EASE } from '../../lib/motion';

const VIEWS = [
  { id: 'directory', tab: 'Employee directory', shot: 'employees',
    head: 'Every record in one directory',
    copy: 'Sixteen staff, their roles, departments, joining dates and current status, filtered by lifecycle stage.',
    alt: 'The Infopace HR employee directory listing staff records with role, department, joining date and status.',
    facts: ['Bulk upload', 'Lifecycle filters', 'Per-tenant scoping'] },
  { id: 'approvals', tab: 'Leave and approvals', shot: 'approvals',
    head: 'Approvals with the balance attached',
    copy: 'Requests queue with type, dates, duration and reason, and the approver sees the remaining balance before deciding.',
    alt: 'The leave management queue showing requests with type, dates, reason and approval status.',
    facts: ['Monthly quota logic', 'Manager routing', 'Full audit trail'] },
  { id: 'payroll', tab: 'Payroll and payslips', shot: 'payslips',
    head: 'Payslips built from the same records',
    copy: 'Gross, deductions and net for the month, with provident fund, employee state insurance and tax already worked out.',
    alt: 'The payslip management table listing payslips with gross, deductions and net pay.',
    facts: ['PF, ESI and TDS', 'DOCX and PDF output', 'Release workflow'] },
  { id: 'analytics', tab: 'Analytics', shot: 'analytics',
    head: 'Headcount, attrition and statutory filing',
    copy: 'Trend, department split and the statutory compliance register, compiled from the payroll runs you actually processed.',
    alt: 'The analytics screen showing headcount trend, department split and a statutory compliance register.',
    facts: ['12-month trend', 'Department split', 'Filing-ready register'] },
];

/**
 * Layout family: a horizontal tab console. The screenshots are real
 * captures of the running product, so this section is the page's
 * evidence, not an illustration.
 */
export default function Product() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const v = VIEWS[active];

  return (
    <section id="product" className="relative overflow-hidden border-y border-hairline bg-surface-blue py-24 lg:py-32">
      <div className="rail">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[54ch]">
            <Eyebrow>The product</Eyebrow>
            <h2 className="t-h2 mt-4 text-balance text-ink">What your team actually opens</h2>
          </div>
          <Chip tone="brand">Real screens, running today</Chip>
        </div>

        {/* tabs */}
        <div role="tablist" aria-label="Product areas"
             className="mt-10 flex flex-wrap gap-1.5 rounded-[8px] border border-hairline-blue bg-surface p-1.5">
          {VIEWS.map((x, i) => (
            <button key={x.id} role="tab" type="button"
              aria-selected={i === active}
              aria-controls={`panel-${x.id}`}
              onClick={() => setActive(i)}
              className={`relative min-h-11 flex-1 rounded-[4px] px-4 text-[14px] font-700
                          transition-colors duration-200
                          ${i === active ? 'text-white' : 'text-ink-2 hover:text-ink'}`}>
              {i === active && (
                <motion.span layoutId="tabpill" aria-hidden
                  className="absolute inset-0 rounded-[4px] bg-brand-700"
                  transition={{ duration: 0.32, ease: EASE }} />
              )}
              <span className="relative">{x.tab}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] lg:gap-12">
          {/* copy rail */}
          <div id={`panel-${v.id}`} role="tabpanel" className="lg:pt-4">
            <AnimatePresence mode="wait">
              <motion.div key={v.id}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: EASE }}>
                <h3 className="t-h3 text-balance text-ink">{v.head}</h3>
                <p className="t-body mt-4 max-w-[46ch] text-ink-2">{v.copy}</p>
                <ul className="mt-6 grid gap-2.5">
                  {v.facts.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-[15px] text-ink">
                      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* the capture */}
          <div className="relative">
            <div className="overflow-hidden rounded-[8px] border border-hairline-blue bg-surface
                            p-1.5 shadow-[var(--shadow-lg)]">
              <div className="overflow-hidden rounded-[4px]">
                <AnimatePresence mode="wait">
                  <motion.div key={v.id}
                    initial={reduced ? false : { opacity: 0, scale: 1.015 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduced ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.34, ease: EASE }}>
                    <Shot name={v.shot} ratio={1.85} alt={v.alt}
                          sizes="(max-width: 1023px) 92vw, 60vw" />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
