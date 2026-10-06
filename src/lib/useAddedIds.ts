import { useEffect, useRef, useState } from "react";

/**
 * Ids that appeared after the first render. Used to flash newly added
 * list rows. Cleared ~1.3s after each change; empty on first mount so a
 * fresh page load never flashes every row.
 */
export function useAddedIds(items: { id: string }[]): Set<string> {
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const prevRef = useRef<Set<string> | null>(null);

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
    const timer = setTimeout(() => setAdded(new Set()), 1300);
    return () => clearTimeout(timer);
  }, [items]);

  return added;
}
