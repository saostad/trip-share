import { describe, expect, it } from "vitest";
import {
  checklistState,
  myPosition,
  recentActivity,
} from "./tripOverview";
import { calculateBalances, computeSettlements } from "./balances";
import { collapseBalancesForGroups } from "./settlementGroups";
import type { Expense, Payment, SettlementGroup, Trip } from "@/types";

function expense(overrides: Partial<Expense> & { id: string }): Expense {
  return {
    description: "Test",
    date: "2026-10-01",
    amount: 100,
    paidBy: "Ava",
    sharedBy: ["Ava", "Liam"],
    createdAt: { toDate: () => new Date("2026-10-01T10:00:00Z") } as never,
    ...overrides,
  };
}

function payment(overrides: Partial<Payment> & { id: string }): Payment {
  return {
    from: "Liam",
    to: "Ava",
    amount: 10,
    date: "2026-10-02",
    createdAt: { toDate: () => new Date("2026-10-02T10:00:00Z") } as never,
    ...overrides,
  };
}

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "t1",
    ownerId: "u1",
    name: "Test",
    participants: ["Ava", "Liam"],
    collaboratorIds: [],
    participantLinks: {},
    settlementMethod: "greedy",
    shareToken: null,
    createdAt: {} as never,
    updatedAt: {} as never,
    ...overrides,
  };
}

describe("myPosition", () => {
  it("reports owed with counterparties who owe me", () => {
    const position = myPosition(trip(), [expense({ id: "e1" })], [], "Ava");
    expect(position.kind).toBe("owed");
    if (position.kind !== "owed") return;
    expect(position.amount).toBeCloseTo(50, 5);
    expect(position.counterparties).toEqual([
      { name: "Liam", amount: 50, direction: "owesMe" },
    ]);
    expect(position.inGroup).toBe(false);
  });

  it("reports owes with counterparties I owe", () => {
    const position = myPosition(trip(), [expense({ id: "e1" })], [], "Liam");
    expect(position.kind).toBe("owes");
    if (position.kind !== "owes") return;
    expect(position.amount).toBeCloseTo(50, 5);
    expect(position.counterparties).toEqual([
      { name: "Ava", amount: 50, direction: "iOwe" },
    ]);
  });

  it("reports square at zero and at the $0.004 edge", () => {
    const even = myPosition(
      trip(),
      [
        expense({ id: "e1", amount: 50, paidBy: "Ava" }),
        expense({ id: "e2", amount: 50, paidBy: "Liam" }),
      ],
      [],
      "Ava",
    );
    expect(even.kind).toBe("square");
    const tiny = myPosition(
      trip(),
      [expense({ id: "e1", amount: 0.008, sharedBy: ["Ava", "Liam"] })],
      [],
      "Ava",
    );
    expect(tiny.kind).toBe("square");
  });

  it("reports unlinked totals when I have no name", () => {
    const position = myPosition(
      trip(),
      [expense({ id: "e1", amount: 100 }), expense({ id: "e2", amount: 50 })],
      [],
      null,
    );
    expect(position).toEqual({
      kind: "unlinked",
      totalSpent: 150,
      perPersonAverage: 75,
    });
  });

  it("reports unlinked when my name is not a participant", () => {
    const position = myPosition(trip(), [expense({ id: "e1" })], [], "Zoe");
    expect(position.kind).toBe("unlinked");
  });

  it("flags group membership", () => {
    const grouped = trip({
      settlementGroups: [
        { id: "g1", name: "Fam", members: ["Ava", "Liam"], representative: "Ava" },
      ],
    });
    const position = myPosition(grouped, [expense({ id: "e1" })], [], "Ava");
    expect(position.kind).toBe("owed");
    if (position.kind !== "owed") return;
    expect(position.inGroup).toBe(true);
  });

  it("reports empty when there are no expenses and no payments", () => {
    expect(myPosition(trip(), [], [], "Ava")).toEqual({ kind: "empty" });
  });

  it("reports empty for an unlinked user when there is nothing yet", () => {
    expect(myPosition(trip(), [], [], null)).toEqual({ kind: "empty" });
  });

  it("reports a linked position once there is at least one expense", () => {
    const position = myPosition(trip(), [expense({ id: "e1" })], [], "Ava");
    expect(position.kind).toBe("owed");
  });

  it("reports a linked position once there is at least one payment", () => {
    const position = myPosition(trip(), [], [payment({ id: "p1" })], "Ava");
    expect(position.kind).toBe("owes");
  });
});

describe("myPosition group mode", () => {
  const groups: SettlementGroup[] = [
    {
      id: "g1",
      name: "Ava family",
      members: ["Ava", "Liam"],
      representative: "Ava",
    },
    {
      id: "g2",
      name: "Maya family",
      members: ["Maya", "Noah"],
      representative: "Maya",
    },
  ];
  const participants = ["Ava", "Liam", "Maya", "Noah"];
  const groupedTrip = () =>
    trip({ participants, settlementGroups: groups });
  const familyExpense = () =>
    expense({
      id: "e1",
      amount: 200,
      paidBy: "Ava",
      sharedBy: participants,
    });

  it("uses my group's collapsed net and group-mode transfers with group labels", () => {
    const expenses = [familyExpense()];
    const position = myPosition(groupedTrip(), expenses, [], "Ava", "group");
    expect(position.kind).toBe("owed");
    if (position.kind !== "owed") return;

    const collapsed = collapseBalancesForGroups(
      calculateBalances(expenses, participants, []),
      groups,
    );
    expect(position.amount).toBeCloseTo(collapsed["Ava"] ?? 0, 5);
    expect(position.amount).toBeCloseTo(100, 5);

    const expected = computeSettlements("greedy", expenses, participants, [], {
      groupMode: true,
      groups,
    }).filter((t) => t.from === "Ava" || t.to === "Ava");
    expect(position.counterparties).toHaveLength(expected.length);
    expect(position.counterparties).toEqual(
      expected.map((t) => ({
        name: t.to === "Ava" ? t.from : t.to,
        amount: t.amount,
        direction: t.to === "Ava" ? "owesMe" : "iOwe",
        label: "Maya family",
      })),
    );
    expect(position.group).toEqual({
      name: "Ava family",
      representative: "Ava",
    });
    expect(position.inGroup).toBe(true);
  });

  it("keeps my own key with group-mode transfers when I'm ungrouped", () => {
    const soloGroups: SettlementGroup[] = [
      {
        id: "g1",
        name: "Fam",
        members: ["Ava", "Liam"],
        representative: "Ava",
      },
    ];
    const soloParticipants = ["Ava", "Liam", "Maya"];
    const soloTrip = trip({
      participants: soloParticipants,
      settlementGroups: soloGroups,
    });
    const expenses = [
      expense({
        id: "e1",
        amount: 120,
        paidBy: "Maya",
        sharedBy: soloParticipants,
      }),
    ];
    const position = myPosition(soloTrip, expenses, [], "Maya", "group");
    expect(position.kind).toBe("owed");
    if (position.kind !== "owed") return;
    expect(position.amount).toBeCloseTo(80, 5);
    expect(position.counterparties).toEqual([
      { name: "Ava", amount: 80, direction: "owesMe", label: "Fam" },
    ]);
    expect(position.group).toBeUndefined();
    expect(position.inGroup).toBe(false);
  });

  it("ignores the mode when the trip has no groups", () => {
    const expenses = [expense({ id: "e1" })];
    const person = myPosition(trip(), expenses, [], "Ava", "person");
    expect(myPosition(trip(), expenses, [], "Ava", "group")).toEqual(person);
    const emptyGroups = trip({ settlementGroups: [] });
    expect(myPosition(emptyGroups, expenses, [], "Ava", "group")).toEqual(
      person,
    );
    if (person.kind !== "owed") return;
    expect(person.counterparties).toEqual([
      { name: "Liam", amount: 50, direction: "owesMe" },
    ]);
    expect(person.group).toBeUndefined();
  });

  it("collapses two 3-person families onto one transfer (user-trip shape)", () => {
    const members = ["Saeid", "Aiden", "Daveen", "Ali", "Donya", "Sara"];
    const families: SettlementGroup[] = [
      {
        id: "g1",
        name: "Saeid family",
        members: ["Saeid", "Aiden", "Daveen"],
        representative: "Saeid",
      },
      {
        id: "g2",
        name: "Ali family",
        members: ["Ali", "Donya", "Sara"],
        representative: "Ali",
      },
    ];
    const familyTrip = trip({
      participants: members,
      settlementGroups: families,
    });
    const expenses = [
      expense({
        id: "e1",
        amount: 600,
        paidBy: "Saeid",
        sharedBy: members,
      }),
    ];

    const person = myPosition(familyTrip, expenses, [], "Saeid", "person");
    expect(person.kind).toBe("owed");
    if (person.kind !== "owed") return;
    // Person mode includes debts inside my own family.
    expect(person.counterparties.map((c) => c.name).sort()).toEqual([
      "Aiden",
      "Ali",
      "Daveen",
      "Donya",
      "Sara",
    ]);

    const group = myPosition(familyTrip, expenses, [], "Saeid", "group");
    expect(group.kind).toBe("owed");
    if (group.kind !== "owed") return;
    const transfers = computeSettlements("greedy", expenses, members, [], {
      groupMode: true,
      groups: families,
    });
    expect(transfers).toHaveLength(1);
    expect(group.counterparties).toHaveLength(1);
    expect(group.counterparties).toEqual([
      {
        name: "Ali",
        amount: transfers[0].amount,
        direction: "owesMe",
        label: "Ali family",
      },
    ]);
    expect(group.amount).toBeCloseTo(300, 5);
    expect(group.group).toEqual({
      name: "Saeid family",
      representative: "Saeid",
    });
  });
});

describe("checklistState", () => {
  it("starts all undone on a brand-new owner trip", () => {
    const state = checklistState(
      trip({ participants: ["Ava"] }),
      [],
      [],
      true,
    );
    expect(state.steps).toEqual([
      { id: "people", done: false },
      { id: "expense", done: false },
      { id: "invite", done: false },
      { id: "settle", done: false },
    ]);
    expect(state.complete).toBe(false);
  });

  it("completes people at 2 participants", () => {
    const state = checklistState(trip(), [], [], true);
    expect(state.steps.find((s) => s.id === "people")).toEqual({
      id: "people",
      done: true,
    });
  });

  it("completes expense at 1 expense", () => {
    const state = checklistState(trip(), [expense({ id: "e1" })], [], true);
    expect(state.steps.find((s) => s.id === "expense")).toEqual({
      id: "expense",
      done: true,
    });
  });

  it("completes invite on share link or collaborator", () => {
    expect(
      checklistState(trip({ shareToken: "abc" }), [], [], true).steps.find(
        (s) => s.id === "invite",
      ),
    ).toEqual({ id: "invite", done: true });
    expect(
      checklistState(trip({ collaboratorIds: ["u2"] }), [], [], true).steps.find(
        (s) => s.id === "invite",
      ),
    ).toEqual({ id: "invite", done: true });
  });

  it("omits invite for non-owners", () => {
    const state = checklistState(trip(), [], [], false);
    expect(state.steps.map((s) => s.id)).toEqual(["people", "expense", "settle"]);
  });

  it("completes settle only with expenses and sub-cent balances", () => {
    const unbalanced = checklistState(trip(), [expense({ id: "e1" })], [], true);
    expect(unbalanced.steps.find((s) => s.id === "settle")).toEqual({
      id: "settle",
      done: false,
    });
    const balanced = checklistState(
      trip(),
      [expense({ id: "e1" })],
      [payment({ id: "p1", from: "Liam", to: "Ava", amount: 50 })],
      true,
    );
    expect(balanced.steps.find((s) => s.id === "settle")).toEqual({
      id: "settle",
      done: true,
    });
    expect(balanced.complete).toBe(false);
  });

  it("is complete when every step is done", () => {
    const state = checklistState(
      trip({ shareToken: "abc" }),
      [expense({ id: "e1" })],
      [payment({ id: "p1", from: "Liam", to: "Ava", amount: 50 })],
      true,
    );
    expect(state.complete).toBe(true);
  });
});

describe("recentActivity", () => {
  it("merges newest first by date then createdAt, honoring the limit", () => {
    const oldExpense = expense({
      id: "old",
      date: "2026-10-01",
      createdAt: { toDate: () => new Date("2026-10-01T10:00:00Z") } as never,
    });
    const newExpense = expense({
      id: "new",
      date: "2026-10-03",
      createdAt: { toDate: () => new Date("2026-10-03T10:00:00Z") } as never,
    });
    const midPayment = payment({
      id: "mid",
      date: "2026-10-02",
      createdAt: { toDate: () => new Date("2026-10-02T10:00:00Z") } as never,
    });
    const earlySameDay = expense({
      id: "early",
      date: "2026-10-03",
      createdAt: { toDate: () => new Date("2026-10-03T08:00:00Z") } as never,
    });

    const ids = (limit?: number) =>
      recentActivity([oldExpense, newExpense, earlySameDay], [midPayment], limit).map(
        (item) => (item.kind === "expense" ? item.expense.id : item.payment.id),
      );

    expect(ids()).toEqual(["new", "early", "mid", "old"]);
    expect(ids(2)).toEqual(["new", "early"]);
  });

  it("returns an empty array with no data", () => {
    expect(recentActivity([], [])).toEqual([]);
  });
});
