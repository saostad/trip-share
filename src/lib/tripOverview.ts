import {
  calculateBalances,
  computeSettlements,
} from "@/lib/balances";
import type { Expense, Payment, Trip } from "@/types";

/** Matches the $0.01 threshold used by BalanceSummary. */
const SQUARE_THRESHOLD = 0.01;

export interface Counterparty {
  name: string;
  amount: number;
  /** "owesMe": they pay me. "iOwe": I pay them. */
  direction: "owesMe" | "iOwe";
}

export type MyPosition =
  | { kind: "unlinked"; totalSpent: number; perPersonAverage: number }
  | {
      kind: "owed" | "owes" | "square";
      /** Absolute net balance. */
      amount: number;
      counterparties: Counterparty[];
      inGroup: boolean;
    };

/**
 * My personal position on a trip. The hero amount is my individual net
 * balance using the same math as the Balances card. Counterparties come
 * from the trip's settlement method in person mode, filtered to transfers
 * that involve me.
 */
export function myPosition(
  trip: Pick<Trip, "participants" | "settlementMethod" | "settlementGroups">,
  expenses: Expense[],
  payments: Payment[],
  myName: string | null,
): MyPosition {
  const participants = trip.participants;
  if (!myName || !participants.includes(myName)) {
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      kind: "unlinked",
      totalSpent,
      perPersonAverage:
        participants.length > 0 ? totalSpent / participants.length : 0,
    };
  }

  const balances = calculateBalances(expenses, participants, payments);
  const net = balances[myName] ?? 0;
  const kind: "owed" | "owes" | "square" =
    net > SQUARE_THRESHOLD ? "owed" : net < -SQUARE_THRESHOLD ? "owes" : "square";

  const settlements = computeSettlements(
    trip.settlementMethod,
    expenses,
    participants,
    payments,
  );
  const counterparties: Counterparty[] = [];
  for (const t of settlements) {
    if (t.to === myName) {
      counterparties.push({ name: t.from, amount: t.amount, direction: "owesMe" });
    } else if (t.from === myName) {
      counterparties.push({ name: t.to, amount: t.amount, direction: "iOwe" });
    }
  }

  const inGroup = (trip.settlementGroups ?? []).some((g) =>
    g.members.includes(myName),
  );

  return { kind, amount: Math.abs(net), counterparties, inGroup };
}

export type ChecklistStepId = "people" | "expense" | "invite" | "settle";

export interface ChecklistStep {
  id: ChecklistStepId;
  done: boolean;
}

export interface ChecklistState {
  steps: ChecklistStep[];
  complete: boolean;
}

/**
 * The 4 getting-started rules (D7), worked out from data. The invite step
 * applies only to the owner, so non-owners get 3 steps.
 */
export function checklistState(
  trip: Pick<Trip, "participants" | "shareToken" | "collaboratorIds">,
  expenses: Expense[],
  payments: Payment[],
  isOwner: boolean,
): ChecklistState {
  const steps: ChecklistStep[] = [
    { id: "people", done: trip.participants.length >= 2 },
    { id: "expense", done: expenses.length >= 1 },
  ];
  if (isOwner) {
    steps.push({
      id: "invite",
      done:
        trip.shareToken != null || (trip.collaboratorIds ?? []).length >= 1,
    });
  }

  const balances = calculateBalances(expenses, trip.participants, payments);
  const settled =
    expenses.length >= 1 &&
    Object.values(balances).every((b) => Math.abs(b) < SQUARE_THRESHOLD);
  steps.push({ id: "settle", done: settled });

  return { steps, complete: steps.every((s) => s.done) };
}

export type RecentActivityItem =
  | { kind: "expense"; expense: Expense }
  | { kind: "payment"; payment: Payment };

function createdMillis(item: Expense | Payment): number {
  const createdAt = item.createdAt as unknown as {
    toMillis?: () => number;
    toDate?: () => Date;
  };
  if (typeof createdAt?.toMillis === "function") return createdAt.toMillis();
  if (typeof createdAt?.toDate === "function")
    return createdAt.toDate().getTime();
  return 0;
}

/** Expenses and payments merged, newest first by date then createdAt. */
export function recentActivity(
  expenses: Expense[],
  payments: Payment[],
  limit = 5,
): RecentActivityItem[] {
  const items: RecentActivityItem[] = [
    ...expenses.map((expense) => ({ kind: "expense" as const, expense })),
    ...payments.map((payment) => ({ kind: "payment" as const, payment })),
  ];
  items.sort((a, b) => {
    const dateA = a.kind === "expense" ? a.expense.date : a.payment.date;
    const dateB = b.kind === "expense" ? b.expense.date : b.payment.date;
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const itemA = a.kind === "expense" ? a.expense : a.payment;
    const itemB = b.kind === "expense" ? b.expense : b.payment;
    return createdMillis(itemB) - createdMillis(itemA);
  });
  return items.slice(0, limit);
}
