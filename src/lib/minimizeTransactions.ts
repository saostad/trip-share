import type { SettlementExplanation } from "@/lib/balances";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * True minimum number of transfers among net balances.
 *
 * Greedy largest-first does not always minimize the *count* of transfers
 * (classic counterexample: balances [-3,-2,-2,+3,+4] needs 4 greedy steps
 * but only 3 optimally). For typical trip sizes we search with backtracking
 * and prune by the lower bound max(#debtors, #creditors).
 */
export function minimizeTransactionsWithDetails(
  balances: Record<string, number>,
  greedyFallback: (balances: Record<string, number>) => SettlementExplanation[],
): SettlementExplanation[] {
  const THRESHOLD = 0.01;

  type Node = { name: string; amount: number };

  const start: Node[] = [];
  for (const [name, bal] of Object.entries(balances)) {
    if (Math.abs(bal) > THRESHOLD) {
      start.push({ name, amount: round2(bal) });
    }
  }

  if (start.length < 2) return [];

  // Search is exponential — fall back to greedy for large groups
  if (start.length > 14) {
    return greedyFallback(balances).map((t) => ({
      ...t,
      method: "minimize" as const,
      note: t.note.replace("Greedy", "Minimize (greedy fallback)"),
    }));
  }

  type Step = {
    from: string;
    to: string;
    amount: number;
    fromRemainingBefore: number;
    toRemainingBefore: number;
  };

  let best: Step[] | null = null;

  function lowerBound(nodes: Node[]): number {
    let debtors = 0;
    let creditors = 0;
    for (const n of nodes) {
      if (n.amount < -THRESHOLD) debtors++;
      else if (n.amount > THRESHOLD) creditors++;
    }
    return Math.max(debtors, creditors);
  }

  function search(nodes: Node[], path: Step[]) {
    if (best !== null && path.length >= best.length) return;

    const active = nodes.filter((n) => Math.abs(n.amount) > THRESHOLD);
    if (active.length === 0) {
      best = path.slice();
      return;
    }

    if (best !== null && path.length + lowerBound(active) >= best.length) return;

    active.sort(
      (a, b) =>
        Math.abs(b.amount) - Math.abs(a.amount) || a.name.localeCompare(b.name),
    );
    const focus = active[0];
    const focusAbs = Math.abs(focus.amount);

    const opposites = active
      .filter((n) =>
        focus.amount < 0 ? n.amount > THRESHOLD : n.amount < -THRESHOLD,
      )
      .sort((a, b) => {
        const aExact =
          Math.abs(Math.abs(a.amount) - focusAbs) < THRESHOLD ? 0 : 1;
        const bExact =
          Math.abs(Math.abs(b.amount) - focusAbs) < THRESHOLD ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        const mag = Math.abs(b.amount) - Math.abs(a.amount);
        if (mag !== 0) return mag;
        return a.name.localeCompare(b.name);
      });

    if (opposites.length === 0) return;

    for (const other of opposites) {
      const debtor = focus.amount < 0 ? focus : other;
      const creditor = focus.amount < 0 ? other : focus;

      const fromRemainingBefore = round2(Math.abs(debtor.amount));
      const toRemainingBefore = round2(creditor.amount);
      const transferAmount = round2(
        Math.min(fromRemainingBefore, toRemainingBefore),
      );
      if (transferAmount <= 0) continue;

      const next = nodes.map((n) => {
        if (n.name === debtor.name) {
          return { name: n.name, amount: round2(n.amount + transferAmount) };
        }
        if (n.name === creditor.name) {
          return { name: n.name, amount: round2(n.amount - transferAmount) };
        }
        return { name: n.name, amount: n.amount };
      });

      path.push({
        from: debtor.name,
        to: creditor.name,
        amount: transferAmount,
        fromRemainingBefore,
        toRemainingBefore,
      });
      search(next, path);
      path.pop();
    }
  }

  search(start, []);

  const steps: Step[] = best ?? [];
  if (steps.length === 0) {
    return greedyFallback(balances).map((t) => ({
      ...t,
      method: "minimize" as const,
    }));
  }

  return steps.map((s, idx) => ({
    from: s.from,
    to: s.to,
    amount: s.amount,
    method: "minimize" as const,
    fromNet: round2(-(balances[s.from] ?? 0)),
    toNet: round2(balances[s.to] ?? 0),
    fromRemainingBefore: s.fromRemainingBefore,
    toRemainingBefore: s.toRemainingBefore,
    step: idx + 1,
    note: `Minimize step ${idx + 1}: optimal search picked ${s.from} → ${s.to} for ${s.amount}`,
  }));
}
