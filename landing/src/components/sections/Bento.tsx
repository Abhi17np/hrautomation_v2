import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  TargetIcon, TrendUpIcon, ClipboardTextIcon, ChartBarIcon,
  LightningIcon, SparkleIcon, UsersThreeIcon, LockKeyIcon,
} from '@phosphor-icons/react';
import { Eyebrow, Chip, RevealGroup } from '../primitives';
import { BarRows, Sparkline, Heatmap } from '../charts';
import { revealUp } from '../../lib/motion';

const Item = motion.article;

/** Wraps each cell so the reveal and the hover lift are consistent. */
function Cell({ className = '', children, live }: {
  className?: string; children: React.ReactNode; live?: boolean;
}) {
  return (
    <Item variants={revealUp}
      className={`group relative overflow-hidden rounded-[12px] border border-hairline bg-surface p-6
                  transition-[border-color,box-shadow] duration-300 hover:border-hairline-blue
                  hover:shadow-[var(--shadow-md)] ${className}`}>
      {live && (
        <span className="absolute right-5 top-5">
          <Chip tone="brand">Live</Chip>
        </span>
      )}
      {children}
    </Item>
  );
}

function Title({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={20} weight="light" className="shrink-0 text-brand-700" aria-hidden />
      <h3 className="t-h4 text-ink">{children}</h3>
    </div>
  );
}

const CYCLES = [
  { q: 'Q1 FY25', d: 21 }, { q: 'Q2 FY25', d: 18 }, { q: 'Q3 FY25', d: 16 },
  { q: 'Q4 FY25', d: 14 }, { q: 'Q1 FY26', d: 11 }, { q: 'Q2 FY26', d: 9 },
  { q: 'Q3 FY26', d: 8 },  { q: 'Q4 FY26', d: 6 },
];

export default function Bento() {
  const rm = useReducedMotion();
  const [goal, setGoal] = useState(68);
  const [cycle, setCycle] = useState(CYCLES.length - 1);

  return (
    <section id="platform" className="relative bg-surface-tint py-24 lg:py-32">
      <div className="rail">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[54ch]">
            <Eyebrow>The platform</Eyebrow>
            <h2 className="t-h2 mt-4 text-balance text-ink">
              Eight modules on one employee record
            </h2>
          </div>
          <p className="t-body max-w-[42ch] text-ink-2">
            Modules marked <span className="font-700 text-brand-700">Live</span> run in the product
            today. The rest are on the delivery roadmap.
          </p>
        </div>

        <RevealGroup
          className="mt-12 grid auto-rows-[minmax(0,auto)] gap-4 lg:grid-cols-6"
          gap={0.06}>

          {/* 1 — wide: goal cascading, interactive slider */}
          <Cell className="lg:col-span-4">
            <Title icon={TargetIcon}>Goal cascading</Title>
            <p className="t-body mt-3 max-w-[46ch] text-ink-2">
              A board objective splits into department targets and then into individual
              goals, each one still pointing back at the original.
            </p>
            <div className="mt-6 rounded-[8px] border border-hairline bg-surface-tint p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-700 text-ink">Expand APAC share</p>
                <span className="tnum text-[13px] font-800 text-brand-700">{goal}%</span>
              </div>
              <input type="range" min={0} max={100} value={goal}
                     onChange={e => setGoal(+e.target.value)}
                     aria-label="Cascade completion, sample control"
                     className="mt-2 h-11 w-full cursor-pointer accent-[var(--brand-700)]" />
              <div className="mt-3 grid grid-cols-3 gap-2">
                {['Sales', 'Marketing', 'Delivery'].map((d, i) => {
                  const v = Math.max(0, Math.min(100, goal + (i - 1) * 11));
                  return (
                    <div key={d} className="rounded-[8px] bg-surface p-2 ring-1 ring-hairline">
                      <p className="t-micro text-ink-3">{d}</p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
                             style={{ width: `${v}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Cell>

          {/* 2 — tall: workforce analytics, real module */}
          <Cell className="lg:col-span-2 lg:row-span-2" live>
            <Title icon={ChartBarIcon}>Workforce analytics</Title>
            <p className="t-body mt-3 text-ink-2">
              Headcount, attrition and the statutory register, built from the payroll
              runs you actually processed.
            </p>
            <div className="mt-6">
              <BarRows suffix="" ariaLabel="Headcount by department"
                rows={[
                  { label: 'Human Resources', value: 4 },
                  { label: 'Manufacturing',   value: 3, tone: 'var(--c2)' },
                  { label: 'Finance',         value: 3, tone: 'var(--c3)' },
                  { label: 'Logistics',       value: 3, tone: 'var(--c4)' },
                  { label: 'Quality',         value: 2 },
                ]} />
            </div>
            <div className="mt-6 rounded-[8px] bg-surface-tint p-3 ring-1 ring-hairline">
              <p className="t-micro text-ink-3">Current headcount</p>
              <p className="tnum text-3xl font-800 leading-tight text-ink">20</p>
            </div>
          </Cell>

          {/* 3 — heatmap */}
          <Cell className="lg:col-span-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Title icon={TrendUpIcon}>Performance heatmap</Title>
              <Chip tone="neutral">Roadmap</Chip>
            </div>
            <p className="t-body mt-3 max-w-[52ch] text-ink-2">
              Every team against every quarter, so a dip shows up as a shape rather
              than a number buried in a report.
            </p>
            <div className="mt-5">
              <Heatmap
                ariaLabel="Performance score by department and quarter"
                rows={['Manufacturing', 'Finance', 'Logistics', 'Quality']}
                cols={['Q1', 'Q2', 'Q3', 'Q4']}
                values={[[72,78,81,88],[66,71,69,74],[58,61,55,71],[80,83,86,91]]} />
            </div>
          </Cell>

          {/* 4 — reviews */}
          <Cell className="lg:col-span-2">
            <Title icon={ClipboardTextIcon}>Employee reviews</Title>
            <p className="t-body mt-3 text-ink-2">
              Multi-rater input collected against evidence, not recollection.
            </p>
            <ul className="mt-5 grid gap-2">
              {[['Self', 100], ['Manager', 100], ['Peers', 66], ['Skip-level', 33]].map(([r, v]) => (
                <li key={r as string} className="flex items-center gap-3">
                  <span className="t-small w-20 shrink-0 text-ink-2">{r}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full bg-brand-600
                                     transition-[width] duration-700 group-hover:opacity-90"
                          style={{ width: `${v}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </Cell>

          {/* 5 — appraisal automation, hover a bar to read the cycle */}
          <Cell className="lg:col-span-2">
            <Title icon={LightningIcon}>Appraisal automation</Title>
            <p className="t-body mt-3 text-ink-2">
              Cycles open, chase and close themselves on the calendar you set.
            </p>
            <div className="mt-5 flex items-end gap-1.5">
              {CYCLES.map((c, i) => (
                <motion.button key={c.q} type="button"
                  onPointerEnter={() => setCycle(i)} onFocus={() => setCycle(i)}
                  aria-label={`${c.q}: ${c.d} days`}
                  className={`min-h-11 w-full rounded-t-[3px] transition-colors duration-200
                    ${cycle === i ? 'bg-brand-500' : 'bg-brand-200 hover:bg-brand-300'}`}
                  style={{ height: c.d * 4 }}
                  initial={rm ? false : { scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22,1,0.36,1] }}
                />
              ))}
            </div>
            <p className="t-micro mt-3 text-ink-3">
              <span className="font-800 text-ink">{CYCLES[cycle].q}</span>
              {' '}closed in{' '}
              <span className="font-800 text-brand-700">{CYCLES[cycle].d} days</span>
            </p>
          </Cell>

          {/* 6 — AI insights */}
          <Cell className="lg:col-span-2 bg-[linear-gradient(180deg,var(--surface)_0%,var(--brand-50)_100%)]">
            <Title icon={SparkleIcon}>AI insights</Title>
            <p className="t-body mt-3 text-ink-2">
              Patterns surfaced from your own history, with the reasoning shown.
            </p>
            <div className="mt-5 rounded-[8px] border border-hairline-blue bg-surface p-3">
              <p className="t-micro text-brand-700">Forecast</p>
              <p className="mt-1.5 text-[13px] font-600 leading-snug text-ink">
                Logistics is tracking 21 points under the median for a third quarter.
              </p>
              <Sparkline data={[71, 66, 61, 58, 55, 52]} color="var(--crit)" w={150} h={30} />
            </div>
          </Cell>

          {/* 7 — lifecycle, real module */}
          <Cell className="lg:col-span-3" live>
            <Title icon={UsersThreeIcon}>Employee lifecycle</Title>
            <p className="t-body mt-3 max-w-[46ch] text-ink-2">
              Offer letter, appointment order, joining, transfers and relieving, all on
              one record with the documents generated from your own templates.
            </p>
            <ol className="mt-5 flex flex-wrap items-center gap-1.5">
              {['Offer', 'Appointment', 'Joined', 'Active', 'Exit'].map((s, i) => (
                <li key={s} className="flex items-center gap-1.5">
                  <span className={`chip ${i < 4
                    ? 'bg-[color-mix(in_srgb,var(--brand)_12%,transparent)] text-brand-700'
                    : 'bg-slate-100 text-ink-3'}`}>{s}</span>
                  {i < 4 && <span aria-hidden className="h-px w-3 bg-hairline" />}
                </li>
              ))}
            </ol>
          </Cell>

          {/* 8 — RBAC, real module */}
          <Cell className="lg:col-span-3" live>
            <Title icon={LockKeyIcon}>Role-based access</Title>
            <p className="t-body mt-3 max-w-[46ch] text-ink-2">
              Each tenant carries its own admins, roles and indexes. Staff in one
              company never see another company's records.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {['Admin', 'HR head', 'Manager', 'Employee'].map((r, i) => (
                <div key={r}
                     className="rounded-[8px] border border-hairline bg-surface-tint p-2.5
                                transition-colors duration-200 hover:border-brand-600">
                  <p className="t-micro text-ink-3">{r}</p>
                  <div className="mt-2 flex gap-0.5" aria-hidden>
                    {Array.from({ length: 4 }).map((_, k) => (
                      <span key={k} className={`h-1 flex-1 rounded-full
                        ${k <= 3 - i ? 'bg-brand-600' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Cell>
        </RevealGroup>
      </div>
    </section>
  );
}
