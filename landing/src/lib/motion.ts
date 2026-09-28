import type { Transition, Variants } from 'motion/react';

export const EASE = [0.22, 1, 0.36, 1] as const;

export const enter: Transition = { duration: 0.6, ease: EASE };
export const quick: Transition = { duration: 0.28, ease: 'easeOut' };

/** Reveal: 16px rise + fade. The page's default entrance. */
export const revealUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: enter },
};

/** Container that staggers its children's reveals. */
export const stagger = (gap = 0.07): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap } },
});

export const viewportOnce = { once: true, margin: '-12% 0px -8% 0px' } as const;
