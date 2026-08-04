import {
  calculateBalances,
  computeSettlements,
  normalizeSettlementMethod,
  settlementMethodLabel,
} from "@/lib/balances";
import type { Expense, Payment, SettlementMethod, Transaction } from "@/types";

export interface PersonSummary {
  name: string;
  totalPaid: number;
  totalShare: number;
  paymentsSent: number;
  paymentsReceived: number;
  netBalance: number;
}

export interface PersonDelta {
  name: string;
  delta: number;
  balanceAfter: number;
  note: string;
}

export interface LedgerStep {
  index: number;
  kind: "expense" | "payment";
  id: string;
  date: string;
  title: string;
  amount: number;
  summary: string;
  effects: PersonDelta[];
  balancesAfter: Record<string, number>;
}

export interface SettlementReportData {
  tripName: string;
  generatedAt: string;
  participants: string[];
  expenseCount: number;
  paymentCount: number;
  totalSpent: number;
  dateRange: { from: string | null; to: string | null };
  people: PersonSummary[];
  expenses: Expense[];
  payments: Payment[];
  remainingSettlements: Transaction[];
  settlementMethod: SettlementMethod;
  settlementMethodLabel: string;
  ledger: LedgerStep[];
  balanceChecksum: number;
  isBalanced: boolean;
}

export function buildSettlementReport(
  tripName: string,
  participants: string[],
  expenses: Expense[],
  payments: Payment[] = [],
  settlementMethod?: SettlementMethod | string | null,
): SettlementReportData {
  const method = normalizeSettlementMethod(settlementMethod);
  const balances = calculateBalances(expenses, participants, payments);
  const remainingSettlements = computeSettlements(
    method,
    expenses,
    participants,
    payments,
  ).map(({ from, to, amount }) => ({ from, to, amount }));
  const ledger = buildLedger(participants, expenses, payments);

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

    return {
      name,
      totalPaid: round2(totalPaid),
      totalShare: round2(totalShare),
      paymentsSent: round2(paymentsSent),
      paymentsReceived: round2(paymentsReceived),
      netBalance: round2(balances[name] ?? 0),
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
    settlementMethod: method,
    settlementMethodLabel: settlementMethodLabel(method),
    ledger,
    balanceChecksum,
    isBalanced: Math.abs(balanceChecksum) < 0.02,
  };
}

export function buildLedger(
  participants: string[],
  expenses: Expense[],
  payments: Payment[],
): LedgerStep[] {
  const running: Record<string, number> = {};
  for (const p of participants) running[p] = 0;

  type Event =
    | { kind: "expense"; date: string; sortKey: string; expense: Expense }
    | { kind: "payment"; date: string; sortKey: string; payment: Payment };

  const events: Event[] = [
    ...expenses.map((expense) => ({
      kind: "expense" as const,
      date: expense.date,
      sortKey: `${expense.date}\0${expense.createdAt?.toMillis?.() ?? 0}\0${expense.id}`,
      expense,
    })),
    ...payments.map((payment) => ({
      kind: "payment" as const,
      date: payment.date,
      sortKey: `${payment.date}\0${payment.createdAt?.toMillis?.() ?? 0}\0${payment.id}`,
      payment,
    })),
  ];

  events.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const steps: LedgerStep[] = [];
  let index = 0;

  for (const event of events) {
    index += 1;
    const effects: PersonDelta[] = [];

    if (event.kind === "expense") {
      const e = event.expense;
      const sharers = e.sharedBy.length > 0 ? e.sharedBy : [];
      const share = sharers.length > 0 ? e.amount / sharers.length : 0;

      running[e.paidBy] = (running[e.paidBy] ?? 0) + e.amount;

      for (const person of sharers) {
        running[person] = (running[person] ?? 0) - share;
      }

      for (const name of participants) {
        let delta = 0;
        const notes: string[] = [];

        if (name === e.paidBy) {
          delta += e.amount;
          notes.push(`paid full ${fmt(e.amount)}`);
        }
        if (sharers.includes(name)) {
          delta -= share;
          notes.push(
            `share ${fmt(share)} (${fmt(e.amount)} ÷ ${sharers.length})`,
          );
        }

        if (Math.abs(delta) < 0.0001 && !notes.length) continue;

        effects.push({
          name,
          delta: round2(delta),
          balanceAfter: round2(running[name] ?? 0),
          note: notes.join("; ") || "no change",
        });
      }

      const sharedLabel =
        sharers.length === participants.length
          ? "everyone"
          : sharers.join(", ");

      steps.push({
        index,
        kind: "expense",
        id: e.id,
        date: e.date,
        title: e.description || "Expense",
        amount: e.amount,
        summary: `${e.paidBy} paid ${fmt(e.amount)} · split among ${sharedLabel} (${fmt(share)} each)`,
        effects,
        balancesAfter: snapshot(running, participants),
      });
    } else {
      const p = event.payment;
      running[p.from] = (running[p.from] ?? 0) + p.amount;
      running[p.to] = (running[p.to] ?? 0) - p.amount;

      for (const name of participants) {
        if (name === p.from) {
          effects.push({
            name,
            delta: round2(p.amount),
            balanceAfter: round2(running[name] ?? 0),
            note: `sent settlement ${fmt(p.amount)} to ${p.to}`,
          });
        } else if (name === p.to) {
          effects.push({
            name,
            delta: round2(-p.amount),
            balanceAfter: round2(running[name] ?? 0),
            note: `received settlement ${fmt(p.amount)} from ${p.from}`,
          });
        }
      }

      steps.push({
        index,
        kind: "payment",
        id: p.id,
        date: p.date,
        title: p.note?.trim() || "Settlement payment",
        amount: p.amount,
        summary: `${p.from} → ${p.to}: ${fmt(p.amount)}`,
        effects,
        balancesAfter: snapshot(running, participants),
      });
    }
  }

  return steps;
}

function snapshot(
  running: Record<string, number>,
  participants: string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of participants) out[p] = round2(running[p] ?? 0);
  return out;
}

function fmt(n: number): string {
  return `$${Math.abs(round2(n)).toFixed(2)}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
