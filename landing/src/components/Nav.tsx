import { useEffect, useState } from 'react';
import { ListIcon, XIcon } from '@phosphor-icons/react';
import ThemeToggle from './ThemeToggle';
import { LAYER } from '../lib/layers';

const LINKS = [
  { label: 'How it works', href: '#how' },
  { label: 'Modules', href: '#modules' },
  { label: 'Rollout', href: '#rollout' },
  { label: 'Questions', href: '#faq' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  // Lock the page behind the mobile overlay, and let Escape close it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header
        style={{ zIndex: LAYER.nav }}
        className="fixed inset-x-0 top-0 h-12 border-b border-hairline
                   bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-xl"
      >
        <nav aria-label="Main" className="rail flex h-12 items-center justify-between gap-4">
          <a href="#top" className="flex h-12 shrink-0 items-center gap-2" aria-label="Infopace HR, home">
            <img src="/infopace-logo.webp" alt="" width={300} height={128}
                 className="h-5 w-auto dark-logo" />
            <span className="text-[15px] font-medium tracking-[-0.01em]">Infopace HR</span>
          </a>

          <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex">
            {LINKS.map(l => (
              <li key={l.href}>
                <a href={l.href}
                   className="inline-flex h-12 items-center text-[15px] text-ink
                              transition-colors duration-200 ease-out hover:text-accent-text">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <a href="#book"
               className="relative hidden rounded-full bg-accent px-4 py-1.5 text-[15px]
                          font-medium text-accent-on transition-colors duration-200 ease-out
                          hover:bg-accent-hover active:scale-[0.98] sm:inline-block
                          after:absolute after:inset-x-0 after:top-1/2 after:h-11
                          after:-translate-y-1/2 after:content-['']">
              Book a demo
            </a>
            <button type="button" onClick={() => setOpen(true)}
                    aria-label="Open menu" aria-expanded={open}
                    className="grid h-11 w-11 place-items-center rounded-full text-ink lg:hidden">
              <ListIcon size={22} weight="light" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile: full-screen overlay, 250ms fade. */}
      <div
        style={{ zIndex: LAYER.menu }}
        className={`fixed inset-0 bg-bg/95 backdrop-blur-xl transition-opacity duration-250
                    ease-out lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!open}
      >
        <div className="rail flex h-12 items-center justify-end">
          <button type="button" onClick={() => setOpen(false)} aria-label="Close menu"
                  className="grid h-11 w-11 place-items-center rounded-full text-ink">
            <XIcon size={22} weight="light" />
          </button>
        </div>
        <ul className="rail mt-8 grid gap-2">
          {LINKS.map(l => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}
                 className="flex min-h-11 items-center py-3 text-[28px] font-medium tracking-[-0.02em]">
                {l.label}
              </a>
            </li>
          ))}
          <li className="mt-6">
            <a href="#book" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}
               className="inline-flex min-h-11 items-center rounded-full bg-accent px-6
                          text-[17px] font-medium text-accent-on">
              Book a demo
            </a>
          </li>
        </ul>
      </div>
    </>
  );
}
