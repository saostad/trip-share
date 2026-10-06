import { useCountUp } from "@/lib/useCountUp";

export interface CountUpProps {
  value: number;
  format: (n: number) => string;
}

/**
 * Animated number. The animating text is hidden from assistive tech and
 * the exact final value sits in an `sr-only` sibling, so screen readers
 * never read in-between numbers.
 */
export function CountUp({ value, format }: CountUpProps) {
  const display = useCountUp(value);
  const final = Number.isFinite(value) ? value : 0;
  return (
    <>
      <span aria-hidden>{format(display)}</span>
      <span className="sr-only">{format(final)}</span>
    </>
  );
}
