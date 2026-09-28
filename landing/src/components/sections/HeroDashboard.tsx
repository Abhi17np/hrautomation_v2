import { motion, useReducedMotion } from 'motion/react';
import { TrendLine, BarRows, Sparkline, Gauge } from '../charts';
import { Chip, SampleTag, usePointer, useShift } from '../primitives';
import { EASE } from '../../lib/motion';

const TREND = [62, 64, 63, 68, 71, 70, 74, 77, 76, 81, 84, 88];
const MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];

/**
 * The hero's live console. Everything here is a real, interactive
 * React component (hover the trend line, the bars and the gauge),
 * driven by illustrative figures rather than a customer's data.
 */
export default function HeroDashboard() {
  const { ref, x, y, reduced } = usePointer(1);
  // Layers shift by different amounts, which is what reads as depth.
  const baseX = useShift(x, -10), baseY = useShift(y, -8);
  const midX  = useShift(x, 18),  midY  = useShift(y, 14);
  const topX  = useShift(x, 30),  topY  = useShift(y, 24);
  const rm = useReducedMotion();

  const float = (delay: number) => rm ? {} : {
    animate: { y: [0, -9, 0] },
    transition: { duration: 6.5, repeat: Infinity, ease: 'easeInOut' as const, delay },
  };

  return (
    <div ref={ref} className="relative mx-auto w-full sm:w-[94%] lg:w-[84%]">
      {/* main console */}
      <motion.div
        style={reduced ? undefined : { x: baseX, y: baseY }}
        className="rise rise-2 panel-float relative overflow-hidden"
      >
        <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center rounded-[4px] bg-brand-700 text-[11px] font-800 text-white">P</span>
            <div>
              <p className="text-[13px] font-700 leading-tight text-ink">Workforce Console</p>
              <p className="t-micro text-ink-3">Q4 FY26</p>
            </div>
          </div>
          <SampleTag />
        </header>

        <div className="grid gap-4 p-5">
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { k: 'Goal alignment', v: '88%', s: TREND.slice(4), c: 'var(--c1)' },
              { k: 'Review cycle',   v: '12d', s: [22,20,19,17,15,13,12], c: 'var(--c3)' },
              { k: 'At-risk roles',  v: '7',   s: [3,4,4,5,6,7,7], c: 'var(--crit)' },
            ].map((m, i) => (
              <div key={m.k}
                style={{ animationDelay: `${0.3 + i * 0.08}s` }}
                className="rise rounded-[4px] border border-hairline bg-surface-tint p-3">
                <p className="t-micro truncate text-ink-3">{m.k}</p>
                <div className="mt-1 flex items-end justify-between gap-1">
                  <span className="tnum text-xl font-800 leading-none text-ink">{m.v}</span>
                  <Sparkline data={m.s} color={m.c} w={52} h={20} />
                </div>
              </div>
            ))}
          </div>

          {/* trend */}
          <div className="rounded-[4px] border border-hairline p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-700 text-ink">Performance index, 12 months</p>
              <Chip tone="good">+26 pts</Chip>
            </div>
            <TrendLine data={TREND} labels={MONTHS} height={148}
              ariaLabel="Performance index rising from 62 to 88 over twelve months." />
          </div>

          {/* department split */}
          <div className="rounded-[4px] border border-hairline p-3">
            <p className="mb-2.5 text-[13px] font-700 text-ink">Goal completion by department</p>
            <BarRows suffix="%" ariaLabel="Goal completion by department"
              rows={[
                { label: 'Manufacturing', value: 92 },
                { label: 'Finance',       value: 84, tone: 'var(--c2)' },
                { label: 'Logistics',     value: 71, tone: 'var(--c3)' },
              ]} />
          </div>
        </div>
      </motion.div>

      {/* floating widget: review gauge */}
      <motion.div
        style={reduced ? undefined : { x: midX, y: midY }}
        className="absolute left-0 top-[44%] hidden -translate-x-[86%] lg:block"
        initial={rm ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.75, ease: EASE }}
      >
        <motion.div {...float(0.4)} className="glass p-3.5">
          <Gauge value={94} label="Reviews on time" size={92} color="var(--c1)" />
        </motion.div>
      </motion.div>

      {/* floating widget: live insight */}
      <motion.div
        style={reduced ? undefined : { x: topX, y: topY }}
        className="absolute right-0 top-full mt-4 hidden w-[240px] lg:block"
        initial={rm ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.95, ease: EASE }}
      >
        <motion.div {...float(1.6)} className="glass p-3.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {!rm && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
            </span>
            <p className="t-micro text-brand-700">Workforce signal</p>
          </div>
          <p className="mt-2 text-[13px] font-600 leading-snug text-ink">
            Logistics goal completion is 21 points below the company median.
          </p>
          <p className="t-micro mt-2 text-ink-3">Flagged 2 hours ago</p>
        </motion.div>
      </motion.div>

      {/* floating widget: headcount pill */}
      <motion.div
        style={reduced ? undefined : { x: midX, y: midY }}
        className="absolute bottom-full left-0 mb-4 hidden lg:block"
        initial={rm ? false : { opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 1.1, ease: EASE }}
      >
        <motion.div {...float(2.4)} className="glass px-3.5 py-2.5">
          <p className="t-micro text-ink-3">Active workforce</p>
          <p className="tnum text-lg font-800 leading-tight text-ink">1,284</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
