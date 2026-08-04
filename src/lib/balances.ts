import type {
  Expense,
  Payment,
  SettlementMethod,
  Transaction,
} from "@/types";

export const DEFAULT_SETTLEMENT_METHOD: SettlementMethod = "greedy";

export function normalizeSettlementMethod(
  method: SettlementMethod | string | null | undefined,
): SettlementMethod {
  return method === "pairwise" ? "pairwise" : "greedy";
}

export function settlementMethodLabel(method: SettlementMethod): string {
  return method === "pairwise"
    ? "Pairwise netting"
    : "Greedy (largest first)";
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
  /** Remaining debt/credit used when choosing this transfer (greedy) or pairwise net */
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
 * Pairwise netting from raw expenses (and recorded payments).
 *
 * For each expense paid by P and shared by S:
 *   each s in S (s ≠ P) owes P (amount / |S|).
 * For each payment A → B of X:
 *   reduce A's debt to B by X (netting).
 * Then emit one transfer per directed pair with net > threshold.
 *
 * Transfers only appear between people who actually shared costs (or paid each other).
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

  /** debtor owes creditor `amount` more */
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
    // A paid B: reduces what A owes B
    addOwed(p.from, p.to, -p.amount);
  }

  const balances = calculateBalances(expenses, [], payments);
  // rebuild balances including all names seen
  const names = new Set<string>();
  for (const e of expenses) {
    names.add(e.paidBy);
    for (const s of e.sharedBy) names.add(s);
  }
  for (const p of payments) {
    names.add(p.from);
    names.add(p.to);
  }
  const fullBalances = calculateBalances(
    expenses,
    [...names],
    payments,
  );

  const transactions: SettlementExplanation[] = [];
  let step = 0;

  const entries = [...net.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (const [key, raw] of entries) {
    const amount = round2(raw);
    if (Math.abs(amount) < THRESHOLD) continue;

    const [a, b] = key.split("\0");
    step += 1;

    if (amount > 0) {
      // a owes b
      transactions.push({
        from: a,
        to: b,
        amount: Math.abs(amount),
        method: "pairwise",
        fromNet: round2(-(fullBalances[a] ?? 0)),
        toNet: round2(fullBalances[b] ?? 0),
        fromRemainingBefore: Math.abs(amount),
        toRemainingBefore: Math.abs(amount),
        step,
        note: `Pairwise net: ${a} owes ${b} after expense shares and recorded payments`,
      });
    } else {
      // b owes a
      transactions.push({
        from: b,
        to: a,
        amount: Math.abs(amount),
        method: "pairwise",
        fromNet: round2(-(fullBalances[b] ?? 0)),
        toNet: round2(fullBalances[a] ?? 0),
        fromRemainingBefore: Math.abs(amount),
        toRemainingBefore: Math.abs(amount),
        step,
        note: `Pairwise net: ${b} owes ${a} after expense shares and recorded payments`,
      });
    }
  }

  // Stable, readable order: larger amounts first
  transactions.sort((x, y) => y.amount - x.amount || x.from.localeCompare(y.from));
  transactions.forEach((t, idx) => {
    t.step = idx + 1;
  });

  // silence unused if any
  void balances;

  return transactions;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
