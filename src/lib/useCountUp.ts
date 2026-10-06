import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { easeOut } from "./motion";

/**
 * Eases toward `value` over ~600ms for display. Counts from 0 on the
 * first mount only; later changes continue from the currently displayed
 * number so a rising value never dips. Reduced motion, non-finite, and
 * negative inputs show the final value immediately.
 */
export function useCountUp(value: number): number {
  const reduceMotion = useReducedMotion();
  const final = Number.isFinite(value) ? value : 0;
  const shouldAnimate = !reduceMotion && final >= 0;

  const [display, setDisplay] = useState(() =>
    shouldAnimate ? 0 : final,
  );
  const displayRef = useRef(display);
  displayRef.current = display;

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplay(final);
      return;
    }
    const controls = animate(displayRef.current, final, {
      duration: 0.6,
      ease: easeOut,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [final, shouldAnimate]);

  return display;
}
