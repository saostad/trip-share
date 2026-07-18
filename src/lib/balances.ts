import type { Expense, Payment, Transaction } from "@/types";

/**
 * Computes the net balance for each participant based on all expenses and payments.
 *
 * For each expense:
 * - The payer's balance increases by the full expense amount (they are owed money).
 * - Each sharer's balance decreases by their equal portion (amount / number of sharers).
 *
 * For each payment:
 * - The payer's (from) balance decreases (they paid off debt).
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

  // Initialize all participants to zero
  for (const participant of participants) {
    balances[participant] = 0;
  }

  // Process each expense
  for (const expense of expenses) {
    // Add full amount to payer's balance
    balances[expense.paidBy] = (balances[expense.paidBy] ?? 0) + expense.amount;

    // Subtract each sharer's equal portion
    const share = expense.amount / expense.sharedBy.length;
    for (const person of expense.sharedBy) {
      balances[person] = (balances[person] ?? 0) - share;
    }
  }

  // Process each payment (settlement between two people)
  for (const payment of payments) {
    // "from" paid money to "to", so from's debt decreases (balance goes up)
    // and "to"'s credit decreases (balance goes down)
    balances[payment.from] = (balances[payment.from] ?? 0) + payment.amount;
    balances[payment.to] = (balances[payment.to] ?? 0) - payment.amount;
  }

  return balances;
}

/**
 * Simplifies debts using a greedy algorithm that pairs the largest debtor
 * with the largest creditor iteratively.
 *
 * A balance < -0.01 is considered a debtor (owes money).
 * A balance > 0.01 is considered a creditor (is owed money).
 * Balances within ±0.01 are ignored (threshold filtering).
 *
 * Each transaction amount is rounded to 2 decimal places.
 */
export function simplifyDebts(
  balances: Record<string, number>,
): Transaction[] {
  const THRESHOLD = 0.01;

  // Separate into debtors and creditors
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  for (const [name, balance] of Object.entries(balances)) {
    if (balance < -THRESHOLD) {
      debtors.push({ name, amount: Math.abs(balance) });
    } else if (balance > THRESHOLD) {
      creditors.push({ name, amount: balance });
    }
  }

  // Sort descending by amount (largest first)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];

  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const transferAmount = Math.round(Math.min(debtor.amount, creditor.amount) * 100) / 100;

    if (transferAmount > 0) {
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: transferAmount,
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    // Remove from consideration if balance is within threshold
    if (debtor.amount <= THRESHOLD) {
      i++;
    }
    if (creditor.amount <= THRESHOLD) {
      j++;
    }
  }

  return transactions;
}
