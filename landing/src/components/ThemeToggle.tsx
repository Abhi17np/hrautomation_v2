import { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from '@phosphor-icons/react';

type Mode = 'light' | 'dark';

function current(): Mode {
  if (typeof document === 'undefined') return 'light';
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('light');

  // Read the resolved theme after mount so SSR/first paint is never wrong.
  useEffect(() => { setMode(current()); }, []);

  const toggle = () => {
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* private mode */ }
    setMode(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="grid h-11 w-11 place-items-center rounded-full text-ink
                 transition-colors duration-200 ease-out hover:text-accent-text"
    >
      {mode === 'dark'
        ? <SunIcon size={20} weight="light" />
        : <MoonIcon size={20} weight="light" />}
    </button>
  );
}
