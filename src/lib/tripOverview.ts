import {
  calculateBalances,
  computeSettlements,
} from "@/lib/balances";
import {
  buildGroupByRepresentative,
  collapseBalancesForGroups,
  hasUsableSettlementGroups,
} from "@/lib/settlementGroups";
import type { Expense, Payment, SettlementViewMode, Trip } from "@/types";

/** Matches the $0.01 threshold used by BalanceSummary. */
const SQUARE_THRESHOLD = 0.01;

export interface Counterparty {
  name: string;
  amount: number;
  /** "owesMe": they pay me. "iOwe": I pay them. */
  direction: "owesMe" | "iOwe";
  /**
   * Display name: the group's name when the counterparty key is a group
   * representative, otherwise the person's name. Set in group mode only.
   */
  label?: string;
}

export type MyPosition =
  | { kind: "empty" }
  | { kind: "unlinked"; totalSpent: number; perPersonAverage: number }
  | {
      kind: "owed" | "owes" | "square";
      /** Absolute net balance. */
      amount: number;
      counterparties: Counterparty[];
      inGroup: boolean;
      /** My group when the position was computed in group mode and I'm in one. */
      group?: { name: string; representative: string };
    };

/**
 * My personal position on a trip. In person mode (the default) the hero
 * amount is my individual net balance using the same math as the Balances
 * card, and counterparties come from the trip's settlement method in
 * person mode, filtered to transfers that involve me. In group mode the
 * amount is my unit's collapsed net and counterparties come from the same
 * group-mode computation the Settle tab uses, so the hero always agrees
 * with it. Without usable groups the mode has no effect.
 */
export function myPosition(
  trip: Pick<Trip, "participants" | "settlementMethod" | "settlementGroups">,
  expenses: Expense[],
  payments: Payment[],
  myName: string | null,
  mode: SettlementViewMode = "person",
): MyPosition {
  const participants = trip.participants;
  if (expenses.length === 0 && payments.length === 0) {
    return { kind: "empty" };
  }
  if (!myName || !participants.includes(myName)) {
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      kind: "unlinked",
      totalSpent,
      perPersonAverage:
        participants.length > 0 ? totalSpent / participants.length : 0,
    };
  }

  const groups = trip.settlementGroups ?? [];
  const inGroup = groups.some((g) => g.members.includes(myName));

  if (mode === "group" && hasUsableSettlementGroups(groups)) {
    const collapsed = collapseBalancesForGroups(
      calculateBalances(expenses, participants, payments),
      groups,
    );
    const myGroup = groups.find((g) => g.members.includes(myName));
    const myKey = myGroup ? myGroup.representative : myName;
    const net = collapsed[myKey] ?? 0;
    const kind: "owed" | "owes" | "square" =
      net > SQUARE_THRESHOLD
        ? "owed"
        : net < -SQUARE_THRESHOLD
          ? "owes"
          : "square";

    // The exact group-mode call the Settle tab makes.
    const settlements = computeSettlements(
      trip.settlementMethod,
      expenses,
      participants,
      payments,
      { groupMode: true, groups },
    );
    const groupByRep = buildGroupByRepresentative(groups);
    const counterparties: Counterparty[] = [];
    for (const t of settlements) {
      if (t.to === myKey) {
        counterparties.push({
          name: t.from,
          amount: t.amount,
          direction: "owesMe",
          label: groupByRep[t.from]?.name ?? t.from,
        });
      } else if (t.from === myKey) {
        counterparties.push({
          name: t.to,
          amount: t.amount,
          direction: "iOwe",
          label: groupByRep[t.to]?.name ?? t.to,
        });
      }
    }

    return {
      kind,
      amount: Math.abs(net),
      counterparties,
      inGroup,
      ...(myGroup
        ? { group: { name: myGroup.name, representative: myGroup.representative } }
        : {}),
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
