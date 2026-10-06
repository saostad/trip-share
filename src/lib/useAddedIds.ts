import { useEffect, useRef, useState } from "react";

/**
 * Ids that appeared after the first render. Used to flash newly added
 * list rows. Cleared ~1.3s after each change; empty on first mount so a
 * fresh page load never flashes every row. The clear timer lives in a
 * ref so a same-id re-send (local snapshot, then server-confirmed)
 * never strands the flag.
 */
export function useAddedIds(items: { id: string }[]): Set<string> {
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const prevRef = useRef<Set<string> | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const current = new Set(items.map((i) => i.id));
    if (prevRef.current === null) {
      prevRef.current = current;
      return;
    }
    const fresh = [...current].filter((id) => !prevRef.current!.has(id));
    prevRef.current = current;
    if (fresh.length === 0) return;
    setAdded(new Set(fresh));
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setAdded(new Set());
    }, 1300);
  }, [items]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return added;
}
