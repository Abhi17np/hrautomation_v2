import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { QuotesIcon, PauseIcon, PlayIcon } from '@phosphor-icons/react';
import { Eyebrow } from '../primitives';

/**
 * Placeholder quotes. They are written in the register a real client
 * would use, but no named person or company is invented: every card
 * carries a [Replace] marker and the section is labelled as sample.
 */
const QUOTES = [
  { q: 'The appraisal window used to take three weeks of chasing. The inputs are simply there now, and we spend the time on the conversation instead.',
    r: 'Group head of people', s: 'Manufacturing' },
  { q: 'We run four companies off one deployment. Each one sees only its own records, which is what made the internal audit straightforward.',
    r: 'Director, shared services', s: 'Diversified group' },
  { q: 'The statutory register reconciling against the payroll runs on its own removed an entire month-end reconciliation from my team.',
    r: 'Finance controller', s: 'Financial services' },
  { q: 'Attendance from the biometric devices and the web logins landing in one record ended a long-running argument between plant and head office.',
    r: 'Plant HR lead', s: 'Textiles' },
  { q: 'What the board wanted was a number they could interrogate. Being able to click from a rating to the evidence behind it changed the review meeting.',
    r: 'Chief human resources officer', s: 'Public sector undertaking' },
];

const SECTORS = ['Manufacturing', 'Financial services', 'Textiles', 'Logistics',
                 'Public sector', 'Healthcare', 'Retail', 'Information technology'];

function Card({ q, r, s }: { q: string; r: string; s: string }) {
  return (
    <figure className="flex w-[330px] shrink-0 flex-col justify-between rounded-[12px] border
                       border-hairline bg-surface p-6 transition-shadow duration-300
                       hover:shadow-[var(--shadow-md)] sm:w-[400px]">
      <QuotesIcon size={22} weight="fill" aria-hidden className="text-brand-200" />
      <blockquote className="mt-4 text-[15px] leading-relaxed text-ink">{q}</blockquote>
      <figcaption className="mt-5 border-t border-hairline pt-4">
        <p className="text-[13px] font-700 text-ink">{r}</p>
        <p className="t-micro mt-1 text-ink-3">{s}</p>
        <p className="t-micro mt-2 text-accent-700">[Replace: named client]</p>
      </figcaption>
    </figure>
  );
}

export default function Voices() {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const running = !reduced && !paused;

  return (
    <section className="overflow-hidden bg-surface py-24 lg:py-32">
      <div className="rail">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[50ch]">
            <Eyebrow>Voices</Eyebrow>
            <h2 className="t-h2 mt-4 text-balance text-ink">Written for the people who sign off</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="t-micro rounded-full bg-accent-50 px-2.5 py-1 text-accent-700
                             ring-1 ring-[color-mix(in_srgb,var(--accent)_22%,transparent)]">
              Sample quotes, not yet attributed
            </span>
            <button type="button" onClick={() => setPaused(p => !p)}
              aria-label={paused ? 'Resume the carousel' : 'Pause the carousel'}
              className="grid h-11 w-11 place-items-center rounded-full border border-hairline
                         bg-surface text-ink transition-colors hover:border-brand-600">
              {paused ? <PlayIcon size={16} weight="fill" /> : <PauseIcon size={16} weight="fill" />}
            </button>
          </div>
        </div>
      </div>

      {/* auto-scrolling rail, duplicated for a seamless loop */}
      <div className="relative mt-12"
           onPointerEnter={() => setPaused(true)}
           onPointerLeave={() => setPaused(false)}>
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24
                                    bg-[linear-gradient(to_right,var(--surface),transparent)]" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24
                                    bg-[linear-gradient(to_left,var(--surface),transparent)]" />
        <motion.div
          className="flex w-max gap-5"
          animate={running ? { x: ['0%', '-50%'] } : { x: '0%' }}
          transition={running
            ? { duration: 46, ease: 'linear', repeat: Infinity }
            : { duration: 0.3 }}
        >
          {[...QUOTES, ...QUOTES].map((q, i) => <Card key={i} {...q} />)}
        </motion.div>
      </div>

      {/* sectors: a real company fact, in place of invented client logos */}
      <div className="rail mt-14">
        <p className="t-micro text-ink-3">Change management delivered across</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {SECTORS.map(s => (
            <li key={s}
                className="rounded-full border border-hairline bg-surface-tint px-3.5 py-1.5
                           text-[13px] font-600 text-ink-2 transition-colors duration-200
                           hover:border-brand-600 hover:text-ink">
              {s}
            </li>
          ))}
        </ul>
        <p className="t-small mt-4 text-ink-3">
          Client logos need licensed artwork and written permission, so none are shown here yet.
        </p>
      </div>
    </section>
  );
}
