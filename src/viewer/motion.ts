/** Live prefers-reduced-motion flag shared by the viewers and animated SVGs. */
export const motion = { reduced: false };

if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  motion.reduced = mq.matches;
  mq.addEventListener?.('change', (e) => { motion.reduced = e.matches; });
}
