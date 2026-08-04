import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import type { Expense } from "@/types";
import {
  calculateBalances,
  computeSettlements,
  minimizeTransactionsWithDetails,
  pickTreasurer,
  simplifyDebtsWithDetails,
  treasurerWithDetails,
} from "./balances";

const makeExpense = (
  overrides: Partial<Expense> & Pick<Expense, "amount" | "paidBy" | "sharedBy">,
): Expense => ({
  id: "e1",
  description: "Test",
  date: "2024-01-01",
  createdAt: Timestamp.now(),
  ...overrides,
});

describe("calculateBalances", () => {
  it("returns zero balances when there are no expenses", () => {
    const result = calculateBalances([], ["Alice", "Bob"]);
    expect(result).toEqual({ Alice: 0, Bob: 0 });
  });

  it("calculates balances for a single expense split equally", () => {
    const expenses = [
      makeExpense({ amount: 100, paidBy: "Alice", sharedBy: ["Alice", "Bob"] }),
    ];
    const result = calculateBalances(expenses, ["Alice", "Bob"]);
    // Alice paid 100, shares 50 -> net +50
    // Bob shares 50 -> net -50
    expect(result.Alice).toBeCloseTo(50);
    expect(result.Bob).toBeCloseTo(-50);
  });

  it("calculates balances when payer is not in sharedBy", () => {
    const expenses = [
      makeExpense({ amount: 60, paidBy: "Alice", sharedBy: ["Bob", "Charlie"] }),
    ];
    const result = calculateBalances(expenses, ["Alice", "Bob", "Charlie"]);
    // Alice paid 60, not sharing -> net +60
    // Bob shares 30 -> net -30
    // Charlie shares 30 -> net -30
    expect(result.Alice).toBeCloseTo(60);
    expect(result.Bob).toBeCloseTo(-30);
    expect(result.Charlie).toBeCloseTo(-30);
  });

  it("sums up to zero across all participants", () => {
    const expenses = [
      makeExpense({ id: "e1", amount: 90, paidBy: "Alice", sharedBy: ["Alice", "Bob", "Charlie"] }),
      makeExpense({ id: "e2", amount: 60, paidBy: "Bob", sharedBy: ["Alice", "Bob"] }),
    ];
    const result = calculateBalances(expenses, ["Alice", "Bob", "Charlie"]);
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(0);
  });

  it("handles a single participant paying and sharing with themselves", () => {
    const expenses = [
      makeExpense({ amount: 50, paidBy: "Alice", sharedBy: ["Alice"] }),
    ];
    const result = calculateBalances(expenses, ["Alice"]);
    // Alice paid 50, shares 50 -> net 0
    expect(result.Alice).toBeCloseTo(0);
  });
});

describe("minimizeTransactionsWithDetails", () => {
  it("settles a simple two-person debt in one transfer", () => {
    const balances = { Alice: 50, Bob: -50 };
    const result = minimizeTransactionsWithDetails(balances);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe("Bob");
    expect(result[0].to).toBe("Alice");
    expect(result[0].amount).toBeCloseTo(50);
    expect(result[0].method).toBe("minimize");
  });

  it("uses fewer transfers than greedy on the classic counterexample", () => {
    // [-3,-2,-2,+3,+4] — greedy largest-first needs 4; optimal needs 3
    const balances = {
      A: -3,
      B: -2,
      C: -2,
      D: 3,
      E: 4,
    };
    const greedy = simplifyDebtsWithDetails(balances);
    const optimal = minimizeTransactionsWithDetails(balances);
    expect(optimal.length).toBeLessThanOrEqual(greedy.length);
    expect(optimal.length).toBe(3);

    // All balances must be fully settled
    const remaining: Record<string, number> = { ...balances };
    for (const t of optimal) {
      remaining[t.from] = (remaining[t.from] ?? 0) + t.amount;
      remaining[t.to] = (remaining[t.to] ?? 0) - t.amount;
    }
    for (const v of Object.values(remaining)) {
      expect(Math.abs(v)).toBeLessThan(0.01);
    }
  });

  it("computeSettlements dispatches minimize", () => {
    const expenses = [
      makeExpense({ amount: 100, paidBy: "Alice", sharedBy: ["Alice", "Bob"] }),
    ];
    const result = computeSettlements(
      "minimize",
      expenses,
      ["Alice", "Bob"],
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].method).toBe("minimize");
    expect(result[0].from).toBe("Bob");
    expect(result[0].to).toBe("Alice");
  });
});

describe("treasurerWithDetails", () => {
  it("auto-picks the person with the largest positive balance as treasurer", () => {
    const balances = { Alice: 80, Bob: -50, Carol: -30 };
    expect(pickTreasurer(balances)).toBe("Alice");
  });

  it("falls back to most expenses paid when balances are tied", () => {
    const expenses = [
      makeExpense({ amount: 100, paidBy: "Bob", sharedBy: ["Alice", "Bob", "Carol"] }),
      makeExpense({ amount: 10, paidBy: "Alice", sharedBy: ["Alice"] }),
    ];
    // Equal positive balances → pick whoever paid the most for expenses
    const equal = { Alice: 1, Bob: 1, Carol: 1 };
    expect(pickTreasurer(equal, expenses)).toBe("Bob"); // paid 100
  });

  it("routes all settlements through the treasurer", () => {
    const balances = { Alice: 80, Bob: -50, Carol: -30 };
    const result = treasurerWithDetails(balances);
    expect(result.every((t) => t.from === "Alice" || t.to === "Alice")).toBe(
      true,
    );
    expect(result).toHaveLength(2);
    // Bob and Carol pay Alice
    const fromBob = result.find((t) => t.from === "Bob");
    const fromCarol = result.find((t) => t.from === "Carol");
    expect(fromBob?.to).toBe("Alice");
    expect(fromBob?.amount).toBeCloseTo(50);
    expect(fromCarol?.to).toBe("Alice");
    expect(fromCarol?.amount).toBeCloseTo(30);
  });

  it("debtors pay the auto-picked treasurer (largest positive)", () => {
    // Dan is largest positive → treasurer; others settle via Dan
    const balances = { Dan: 100, Eve: -40, Frank: -60 };
    const result = treasurerWithDetails(balances);
    expect(pickTreasurer(balances)).toBe("Dan");
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.to === "Dan")).toBe(true);
  });

  it("treasurer pays other creditors when multiple people are owed", () => {
    // Alice is largest positive → treasurer; Bob is also a creditor
    const balances = { Alice: 50, Bob: 30, Carol: -80 };
    const result = treasurerWithDetails(balances);
    expect(pickTreasurer(balances)).toBe("Alice");
    expect(result).toHaveLength(2);
    const carolPays = result.find((t) => t.from === "Carol");
    const alicePaysBob = result.find((t) => t.from === "Alice" && t.to === "Bob");
    expect(carolPays?.to).toBe("Alice");
    expect(carolPays?.amount).toBeCloseTo(80);
    expect(alicePaysBob?.amount).toBeCloseTo(30);
  });

  it("computeSettlements dispatches treasurer", () => {
    const expenses = [
      makeExpense({ amount: 90, paidBy: "Alice", sharedBy: ["Alice", "Bob", "Carol"] }),
    ];
    const result = computeSettlements(
      "treasurer",
      expenses,
      ["Alice", "Bob", "Carol"],
      [],
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((t) => t.method === "treasurer")).toBe(true);
    const treasurer = pickTreasurer(
      { Alice: 60, Bob: -30, Carol: -30 },
      expenses,
    );
    expect(treasurer).toBe("Alice");
    expect(result.every((t) => t.from === treasurer || t.to === treasurer)).toBe(
      true,
    );
  });
});
