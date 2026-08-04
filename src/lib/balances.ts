import type {
  Expense,
  Payment,
  SettlementMethod,
  Transaction,
} from "@/types";
import { minimizeTransactionsWithDetails as minimizeTx } from "@/lib/minimizeTransactions";
import {
  pickTreasurer as pickTreasurerImpl,
  treasurerWithDetails as treasurerTx,
} from "@/lib/treasurerSettlement";

export const DEFAULT_SETTLEMENT_METHOD: SettlementMethod = "greedy";

export function normalizeSettlementMethod(
  method: SettlementMethod | string | null | undefined,
): SettlementMethod {
  if (method === "pairwise") return "pairwise";
  if (method === "smallest") return "smallest";
  if (method === "minimize") return "minimize";
  if (method === "treasurer") return "treasurer";
  return "greedy";
}

export function settlementMethodLabel(method: SettlementMethod): string {
  if (method === "pairwise") return "Pairwise netting";
  if (method === "smallest") return "Smallest first (clear one person)";
  if (method === "minimize") return "Minimize transactions";
  if (method === "treasurer") return "Central pot (auto treasurer)";
  return "Greedy (largest first)";
}

/**
 * Computes the net balance for each participant based on all expenses and payments.
 *
 * Positive balance = is owed money. Negative = owes money.
 */
export function calculateBalances(
  expenses: Expense[],
  participants: string[],
  payments: Payment[] = [],
): Record<string, number> {
  const balances: Record<string, number> = {};

  for (const participant of participants) {
    balances[participant] = 0;
  }

  for (const expense of expenses) {
    balances[expense.paidBy] = (balances[expense.paidBy] ?? 0) + expense.amount;

    const share = expense.amount / expense.sharedBy.length;
    for (const person of expense.sharedBy) {
      balances[person] = (balances[person] ?? 0) - share;
    }
  }

  for (const payment of payments) {
    balances[payment.from] = (balances[payment.from] ?? 0) + payment.amount;
    balances[payment.to] = (balances[payment.to] ?? 0) - payment.amount;
  }

  return balances;
}

/** Breakdown of how a person's net balance was formed */
export interface PersonBalanceBreakdown {
  name: string;
  totalPaid: number;
  totalShare: number;
  paymentsSent: number;
  paymentsReceived: number;
  /** totalPaid - totalShare + paymentsSent - paymentsReceived */
  netBalance: number;
}

export function personBalanceBreakdown(
  name: string,
  expenses: Expense[],
  payments: Payment[] = [],
): PersonBalanceBreakdown {
  let totalPaid = 0;
  let totalShare = 0;
  let paymentsSent = 0;
  let paymentsReceived = 0;

  for (const e of expenses) {
    if (e.paidBy === name) totalPaid += e.amount;
    if (e.sharedBy.includes(name) && e.sharedBy.length > 0) {
      totalShare += e.amount / e.sharedBy.length;
    }
  }

  for (const p of payments) {
    if (p.from === name) paymentsSent += p.amount;
    if (p.to === name) paymentsReceived += p.amount;
  }

  const netBalance = round2(
    totalPaid - totalShare + paymentsSent - paymentsReceived,
  );

  return {
    name,
    totalPaid: round2(totalPaid),
    totalShare: round2(totalShare),
    paymentsSent: round2(paymentsSent),
    paymentsReceived: round2(paymentsReceived),
    netBalance,
  };
}

export interface SettlementExplanation extends Transaction {
  method: SettlementMethod;
  /** Debtor's full net balance (absolute amount they owe overall), if applicable */
  fromNet: number;
  /** Creditor's full net balance (amount they are owed overall), if applicable */
  toNet: number;
  /** Remaining debt/credit used when choosing this transfer */
  fromRemainingBefore: number;
  toRemainingBefore: number;
  /** Index in the suggested settlement list (1-based) */
  step: number;
  /** Short human explanation of why this edge exists */
  note: string;
}

/**
 * Compute suggested settlements for the trip using the owner-selected method.
 */
export function minimizeTransactionsWithDetails(
  balances: Record<string, number>,
): SettlementExplanation[] {
  return minimizeTx(balances, simplifyDebtsWithDetails);
}

export function pickTreasurer(
  balances: Record<string, number>,
  expenses: Expense[] = [],
): string | null {
  return pickTreasurerImpl(balances, expenses);
}

export function treasurerWithDetails(
  balances: Record<string, number>,
  expenses: Expense[] = [],
): SettlementExplanation[] {
  return treasurerTx(balances, expenses);
}

export function computeSettlements(
  method: SettlementMethod | string | null | undefined,
  expenses: Expense[],
  participants: string[],
  payments: Payment[] = [],
): SettlementExplanation[] {
  const m = normalizeSettlementMethod(method);
  if (m === "pairwise") {
    return pairwiseNettingWithDetails(expenses, payments);
  }
  const balances = calculateBalances(expenses, participants, payments);
  if (m === "smallest") {
    return smallestFirstWithDetails(balances);
  }
  if (m === "minimize") {
    return minimizeTransactionsWithDetails(balances);
  }
  if (m === "treasurer") {
    return treasurerWithDetails(balances, expenses);
  }
  return simplifyDebtsWithDetails(balances);
}

/**
 * Simplifies debts using a greedy algorithm that pairs the largest debtor
 * with the largest creditor iteratively.
 */
export function simplifyDebts(
  balances: Record<string, number>,
): Transaction[] {
  return simplifyDebtsWithDetails(balances).map(
    ({ from, to, amount }) => ({ from, to, amount }),
  );
}

export function simplifyDebtsWithDetails(
  balances: Record<string, number>,
): SettlementExplanation[] {
  const THRESHOLD = 0.01;

  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  for (const [name, balance] of Object.entries(balances)) {
    if (balance < -THRESHOLD) {
      debtors.push({ name, amount: Math.abs(balance) });
    } else if (balance > THRESHOLD) {
      creditors.push({ name, amount: balance });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: SettlementExplanation[] = [];
  let i = 0;
  let j = 0;
  let step = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const fromRemainingBefore = round2(debtor.amount);
    const toRemainingBefore = round2(creditor.amount);
    const transferAmount =
      Math.round(Math.min(debtor.amount, creditor.amount) * 100) / 100;

    if (transferAmount > 0) {
      step += 1;
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: transferAmount,
        method: "greedy",
        fromNet: round2(-(balances[debtor.name] ?? 0)),
        toNet: round2(balances[creditor.name] ?? 0),
        fromRemainingBefore,
        toRemainingBefore,
        step,
        note: `Greedy step ${step}: min(${fromRemainingBefore}, ${toRemainingBefore}) = ${transferAmount}`,
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount <= THRESHOLD) i++;
    if (creditor.amount <= THRESHOLD) j++;
  }

  return transactions;
}

/**
 * Clear one person at a time, always the one with the smallest absolute
 * remaining balance. That person settles against the largest opposite side,
 * which usually finishes them in a single transfer.
 */
export function smallestFirstWithDetails(
  balances: Record<string, number>,
): SettlementExplanation[] {
  const THRESHOLD = 0.01;
  const remaining: Record<string, number> = {};
  for (const [name, bal] of Object.entries(balances)) {
    remaining[name] = bal;
  }

  const transactions: SettlementExplanation[] = [];
  let step = 0;
  const maxSteps = Object.keys(balances).length * 4 + 20;

  while (step < maxSteps) {
    const active = Object.entries(remaining)
      .filter(([, bal]) => Math.abs(bal) > THRESHOLD)
      .map(([name, amount]) => ({ name, amount }));

    if (active.length < 2) break;

    // Smallest absolute remaining balance first; stable by name
    active.sort(
      (a, b) =>
        Math.abs(a.amount) - Math.abs(b.amount) || a.name.localeCompare(b.name),
    );
    const focus = active[0];

    if (focus.amount < 0) {
      // Focus person owes money — pay the largest creditor
      const creditors = active
        .filter((p) => p.amount > THRESHOLD)
        .sort(
          (a, b) => b.amount - a.amount || a.name.localeCompare(b.name),
        );
      if (creditors.length === 0) break;
      const creditor = creditors[0];

      const fromRemainingBefore = round2(Math.abs(focus.amount));
      const toRemainingBefore = round2(creditor.amount);
      const transferAmount = round2(
        Math.min(fromRemainingBefore, toRemainingBefore),
      );
      if (transferAmount <= 0) break;

      step += 1;
      transactions.push({
        from: focus.name,
        to: creditor.name,
        amount: transferAmount,
        method: "smallest",
        fromNet: round2(-(balances[focus.name] ?? 0)),
        toNet: round2(balances[creditor.name] ?? 0),
        fromRemainingBefore,
        toRemainingBefore,
        step,
        note: `Smallest-first step ${step}: clear ${focus.name} (smallest |balance|) by paying ${creditor.name}`,
      });

      remaining[focus.name] = round2(
        (remaining[focus.name] ?? 0) + transferAmount,
      );
      remaining[creditor.name] = round2(
        (remaining[creditor.name] ?? 0) - transferAmount,
      );
    } else {
      // Focus person is owed money — receive from the largest debtor
      const debtors = active
        .filter((p) => p.amount < -THRESHOLD)
        .sort(
          (a, b) => a.amount - b.amount || a.name.localeCompare(b.name),
        );
      if (debtors.length === 0) break;
      const debtor = debtors[0];

      const fromRemainingBefore = round2(Math.abs(debtor.amount));
      const toRemainingBefore = round2(focus.amount);
      const transferAmount = round2(
        Math.min(fromRemainingBefore, toRemainingBefore),
      );
      if (transferAmount <= 0) break;

      step += 1;
      transactions.push({
        from: debtor.name,
        to: focus.name,
        amount: transferAmount,
        method: "smallest",
        fromNet: round2(-(balances[debtor.name] ?? 0)),
        toNet: round2(balances[focus.name] ?? 0),
        fromRemainingBefore,
        toRemainingBefore,
        step,
        note: `Smallest-first step ${step}: clear ${focus.name} (smallest |balance|) by receiving from ${debtor.name}`,
      });

      remaining[debtor.name] = round2(
        (remaining[debtor.name] ?? 0) + transferAmount,
      );
      remaining[focus.name] = round2(
        (remaining[focus.name] ?? 0) - transferAmount,
      );
    }
  }

  return transactions;
}

/**
 * Pairwise netting from raw expenses (and recorded payments).
 */
export function pairwiseNettingWithDetails(
  expenses: Expense[],
  payments: Payment[] = [],
): SettlementExplanation[] {
  const THRESHOLD = 0.01;
  /** Canonical key a|b with a < b; positive value means a owes b */
  const net = new Map<string, number>();

  function pairKey(a: string, b: string): { key: string; sign: 1 | -1 } {
    if (a < b) return { key: `${a}\0${b}`, sign: 1 };
    return { key: `${b}\0${a}`, sign: -1 };
  }

  function addOwed(debtor: string, creditor: string, amount: number) {
    if (!debtor || !creditor || debtor === creditor || amount === 0) return;
    const { key, sign } = pairKey(debtor, creditor);
    net.set(key, (net.get(key) ?? 0) + sign * amount);
  }

  for (const e of expenses) {
    const sharers = e.sharedBy?.length ? e.sharedBy : [];
    if (sharers.length === 0) continue;
    const share = e.amount / sharers.length;
    for (const person of sharers) {
      if (person !== e.paidBy) {
        addOwed(person, e.paidBy, share);
      }
    }
  }

  for (const p of payments) {
    addOwed(p.from, p.to, -p.amount);
  }

  const names = new Set<string>();
  for (const e of expenses) {
    names.add(e.paidBy);
    for (const s of e.sharedBy) names.add(s);
  }
  for (const p of payments) {
    names.add(p.from);
    names.add(p.to);
  }
  const fullBalances = calculateBalances(expenses, [...names], payments);

  const transactions: SettlementExplanation[] = [];

  const entries = [...net.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (const [key, raw] of entries) {
    const amount = round2(raw);
    if (Math.abs(amount) < THRESHOLD) continue;

    const [a, b] = key.split("\0");

    if (amount > 0) {
      transactions.push({
        from: a,
        to: b,
        amount: Math.abs(amount),
        method: "pairwise",
        fromNet: round2(-(fullBalances[a] ?? 0)),
        toNet: round2(fullBalances[b] ?? 0),
        fromRemainingBefore: Math.abs(amount),
        toRemainingBefore: Math.abs(amount),
        step: 0,
        note: `Pairwise net: ${a} owes ${b} after expense shares and recorded payments`,
      });
    } else {
      transactions.push({
        from: b,
        to: a,
        amount: Math.abs(amount),
        method: "pairwise",
        fromNet: round2(-(fullBalances[b] ?? 0)),
        toNet: round2(fullBalances[a] ?? 0),
        fromRemainingBefore: Math.abs(amount),
        toRemainingBefore: Math.abs(amount),
        step: 0,
        note: `Pairwise net: ${b} owes ${a} after expense shares and recorded payments`,
      });
    }
  }

  transactions.sort(
    (x, y) => y.amount - x.amount || x.from.localeCompare(y.from),
  );
  transactions.forEach((t, idx) => {
    t.step = idx + 1;
  });

  return transactions;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
