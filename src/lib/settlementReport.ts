import { calculateBalances, simplifyDebts } from "@/lib/balances";
import type { Expense, Payment, Transaction } from "@/types";

export interface PersonSummary {
  name: string;
  /** Sum of expenses this person paid for */
  totalPaid: number;
  /** Sum of their fair shares across expenses */
  totalShare: number;
  /** Settlement payments they sent */
  paymentsSent: number;
  /** Settlement payments they received */
  paymentsReceived: number;
  /** Net after expenses + payments (positive = owed, negative = owes) */
  netBalance: number;
}

export interface SettlementReportData {
  tripName: string;
  generatedAt: string; // ISO
  participants: string[];
  expenseCount: number;
  paymentCount: number;
  totalSpent: number;
  dateRange: { from: string | null; to: string | null };
  people: PersonSummary[];
  expenses: Expense[];
  payments: Payment[];
  remainingSettlements: Transaction[];
  /** Sum of all net balances — should be ~0 if math is consistent */
  balanceChecksum: number;
  isBalanced: boolean;
}

export function buildSettlementReport(
  tripName: string,
  participants: string[],
  expenses: Expense[],
  payments: Payment[] = [],
): SettlementReportData {
  const balances = calculateBalances(expenses, participants, payments);
  const remainingSettlements = simplifyDebts(balances);

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  const dates = expenses.map((e) => e.date).filter(Boolean).sort();
  const dateRange = {
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
  };

  const people: PersonSummary[] = participants.map((name) => {
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

    const netBalance = balances[name] ?? 0;

    return {
      name,
      totalPaid: round2(totalPaid),
      totalShare: round2(totalShare),
      paymentsSent: round2(paymentsSent),
      paymentsReceived: round2(paymentsReceived),
      netBalance: round2(netBalance),
    };
  });

  const balanceChecksum = round2(
    people.reduce((s, p) => s + p.netBalance, 0),
  );

  return {
    tripName,
    generatedAt: new Date().toISOString(),
    participants,
    expenseCount: expenses.length,
    paymentCount: payments.length,
    totalSpent: round2(totalSpent),
    dateRange,
    people,
    expenses: [...expenses].sort((a, b) => a.date.localeCompare(b.date)),
    payments: [...payments].sort((a, b) => a.date.localeCompare(b.date)),
    remainingSettlements,
    balanceChecksum,
    isBalanced: Math.abs(balanceChecksum) < 0.02,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
