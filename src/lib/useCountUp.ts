import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { easeOut } from "./motion";

/**
 * Eases from 0 to `value` over ~600ms for display. Reduced motion,
 * non-finite, and negative inputs show the final value immediately.
 */
export function useCountUp(value: number): number {
  const reduceMotion = useReducedMotion();
  const final = Number.isFinite(value) ? value : 0;
  const shouldAnimate = !reduceMotion && final >= 0;

  const [display, setDisplay] = useState(() =>
    shouldAnimate ? 0 : final,
  );

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplay(final);
      return;
    }
    setDisplay(0);
    const controls = animate(0, final, {
      duration: 0.6,
      ease: easeOut,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [final, shouldAnimate]);

  return display;
}
