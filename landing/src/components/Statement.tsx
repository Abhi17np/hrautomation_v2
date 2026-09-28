import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from 'motion/react';

const SENTENCE =
  'Most HR work is waiting: for an approval, a signature, or a record nobody can find.';

/**
 * Each word lifts from 30% to full opacity as it crosses the viewport
 * centre. It communicates reading order, pacing the sentence instead of
 * dropping it in all at once.
 */
function Word({ text, index, total, progress }: {
  text: string; index: number; total: number; progress: MotionValue<number>;
}) {
  const start = index / total;
  const end = (index + 1.6) / total;   // slight overlap so the sweep is continuous
  const opacity = useTransform(progress, [start, end], [0.3, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block whitespace-pre">
      {text}{' '}
    </motion.span>
  );
}

export default function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'end 0.45'],
  });

  const words = SENTENCE.split(' ');

  return (
    <section className="bg-bg-tint py-32 md:py-40">
      <div className="rail">
        <p ref={ref} className="type-statement mx-auto max-w-[24ch] text-balance">
          {reduced
            ? SENTENCE
            : words.map((w, i) => (
                <Word key={i} text={w} index={i} total={words.length} progress={scrollYProgress} />
              ))}
        </p>
      </div>
    </section>
  );
}
