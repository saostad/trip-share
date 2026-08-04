import type { Expense, SettlementMethod } from "@/types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type TreasurerTransfer = {
  from: string;
  to: string;
  amount: number;
  method: SettlementMethod;
  fromNet: number;
  toNet: number;
  fromRemainingBefore: number;
  toRemainingBefore: number;
  step: number;
  note: string;
};

/**
 * Auto-pick a treasurer, then route every settlement through them:
 *   debtors → treasurer, treasurer → creditors.
 *
 * Pick order:
 *  1. Largest positive net balance (is owed the most)
 *  2. If tied, most total expense amount paid
 *  3. Stable name sort
 */
export function pickTreasurer(
  balances: Record<string, number>,
  expenses: Expense[] = [],
): string | null {
  const THRESHOLD = 0.01;
  const names = Object.keys(balances);
  if (names.length === 0) return null;

  const paidTotals: Record<string, number> = {};
  for (const n of names) paidTotals[n] = 0;
  for (const e of expenses) {
    paidTotals[e.paidBy] = (paidTotals[e.paidBy] ?? 0) + e.amount;
  }

  const ranked = [...names].sort((a, b) => {
    const balA = balances[a] ?? 0;
    const balB = balances[b] ?? 0;
    if (Math.abs(balA - balB) > THRESHOLD) return balB - balA;
    const paidDiff = (paidTotals[b] ?? 0) - (paidTotals[a] ?? 0);
    if (Math.abs(paidDiff) > THRESHOLD) return paidDiff;
    return a.localeCompare(b);
  });

  return ranked[0] ?? null;
}

export function treasurerWithDetails(
  balances: Record<string, number>,
  expenses: Expense[] = [],
): TreasurerTransfer[] {
  const THRESHOLD = 0.01;
  const treasurer = pickTreasurer(balances, expenses);
  if (!treasurer) return [];

  const transactions: TreasurerTransfer[] = [];
  let step = 0;

  const debtors = Object.entries(balances)
    .filter(([name, bal]) => name !== treasurer && bal < -THRESHOLD)
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));

  for (const [name, bal] of debtors) {
    const amount = round2(Math.abs(bal));
    if (amount <= 0) continue;
    step += 1;
    transactions.push({
      from: name,
      to: treasurer,
      amount,
      method: "treasurer",
      fromNet: round2(-(balances[name] ?? 0)),
      toNet: round2(balances[treasurer] ?? 0),
      fromRemainingBefore: amount,
      toRemainingBefore: amount,
      step,
      note: `Central pot: ${name} pays auto-picked treasurer ${treasurer}`,
    });
  }

  const creditors = Object.entries(balances)
    .filter(([name, bal]) => name !== treasurer && bal > THRESHOLD)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  for (const [name, bal] of creditors) {
    const amount = round2(bal);
    if (amount <= 0) continue;
    step += 1;
    transactions.push({
      from: treasurer,
      to: name,
      amount,
      method: "treasurer",
      fromNet: round2(-(balances[treasurer] ?? 0)),
      toNet: round2(balances[name] ?? 0),
      fromRemainingBefore: amount,
      toRemainingBefore: amount,
      step,
      note: `Central pot: treasurer ${treasurer} pays ${name}`,
    });
  }

  return transactions;
}
