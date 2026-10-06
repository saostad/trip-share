import { useCountUp } from "@/lib/useCountUp";

export interface CountUpProps {
  value: number;
  format: (n: number) => string;
}

/**
 * Animated number. Screen readers get a non-live snapshot; the DOM
 * settles on the exact final value.
 */
export function CountUp({ value, format }: CountUpProps) {
  const display = useCountUp(value);
  return <span aria-live="off">{format(display)}</span>;
}
