import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import type { Expense } from "@/types";
import { calculateBalances } from "./balances";

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
