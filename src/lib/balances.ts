import type { Expense, Payment, Transaction } from "@/types";

/**
 * Computes the net balance for each participant based on all expenses and payments.
 *
 * For each expense:
 * - The payer's balance increases by the full expense amount (they are owed money).
 * - Each sharer's balance decreases by their equal portion (amount / number of sharers).
 *
 * For each payment:
 * - The payer's (from) balance increases (they paid off debt).
 * - The receiver's (to) balance decreases (they received what they were owed).
 *
 * A positive balance means the participant is owed money.
 * A negative balance means the participant owes money.
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
  /** Debtor's full net balance before any suggested settlements */
  fromNet: number;
  /** Creditor's full net balance before any suggested settlements */
  toNet: number;
  /** How much the debtor still owed at this step of simplification */
  fromRemainingBefore: number;
  /** How much the creditor was still owed at this step */
  toRemainingBefore: number;
  /** Index in the suggested settlement list (1-based) */
  step: number;
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

/**
 * Same as simplifyDebts, but includes the intermediate amounts used to
 * choose each transfer so the UI can explain the line.
 */
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
        fromNet: round2(-(balances[debtor.name] ?? 0)),
        toNet: round2(balances[creditor.name] ?? 0),
        fromRemainingBefore,
        toRemainingBefore,
        step,
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount <= THRESHOLD) i++;
    if (creditor.amount <= THRESHOLD) j++;
  }

  return transactions;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
