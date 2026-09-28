import { useRef } from 'react';
import { useScroll, useTransform, useReducedMotion, motion } from 'motion/react';
import { CaretRightIcon } from '@phosphor-icons/react';
import Shot from './Shot';

/**
 * The page's one motion moment (DESIGN.md §5, option A): the device frame
 * settles up to full size on load, then scales a little further as the
 * reader scrolls, handing off to the Statement section. It communicates
 * "this is the product" and gives the hero a single focal arrival.
 * Under prefers-reduced-motion the frame is simply shown at rest.
 */
export default function Hero() {
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: track,
    offset: ['start end', 'end start'],
  });
  const scrubScale = useTransform(scrollYProgress, [0.25, 0.75], [1, 1.045]);

  return (
    <section id="top" className="relative min-h-[100dvh] pt-24 pb-20">
      {/* The one permitted gradient: a low-contrast vignette that sits the
          product visual on the page. Nothing decorative. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[38%] h-[52vh]
                                  bg-[radial-gradient(60%_60%_at_50%_40%,color-mix(in_srgb,var(--ink)_6%,transparent),transparent_70%)]" />

      <div className="rail relative">
        <div className="mx-auto max-w-[1200px] text-center">
          <h1 className="type-hero mx-auto max-w-[10.25em] text-balance">
            All of HR in one place
          </h1>

          <p className="type-sub mx-auto mt-6 max-w-[38.4em] text-ink-2">
            Employee records, leave, approvals, letters, attendance and payslips,
            handled in one system your whole team can use.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <a href="#book"
               className="inline-flex min-h-11 items-center rounded-full bg-accent px-6
                          text-[17px] font-medium leading-none text-accent-on whitespace-nowrap
                          transition-colors duration-200 ease-out hover:bg-accent-hover
                          active:scale-[0.98]">
              Book a demo
            </a>
            <a href="#how"
               className="inline-flex min-h-11 items-center gap-1 text-[17px] text-accent-text
                          underline-offset-4 hover:underline">
              See how it works
              <CaretRightIcon size={15} weight="light" aria-hidden />
            </a>
          </div>
        </div>
      </div>

      {/* Device frame: the LCP element. Top of it sits inside the first
          viewport, the rest continues below the fold. */}
      <div ref={track} className="rail relative mt-16 md:mt-20">
        <div className="hero-settle mx-auto max-w-[1400px]">
          <motion.div
            style={reduced ? undefined : { scale: scrubScale }}
            className="origin-top will-change-transform"
          >
            <div className="bezel lift">
            <div className="bezel-core aspect-[1/1] md:aspect-[1.85]">
              <Shot
                name="employees"
                mobileName="employees-m"
                ratio={1.85}
                priority
                cover
                sizes="(max-width: 1439px) 94vw, 1400px"
                mobileSizes="92vw"
                alt="The Infopace HR employee directory, showing sixteen staff records with role, department, joining date and current status."
              />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
