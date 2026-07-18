import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import type { Expense } from "@/types";
import { getRemovableParticipants, isParticipantProtected } from "./participants";

const makeExpense = (
  overrides: Partial<Expense> & Pick<Expense, "amount" | "paidBy" | "sharedBy">,
): Expense => ({
  id: "e1",
  description: "Test",
  date: "2024-01-01",
  createdAt: Timestamp.now(),
  ...overrides,
});

describe("isParticipantProtected", () => {
  it("returns false when there are no expenses", () => {
    expect(isParticipantProtected("Alice", [])).toBe(false);
  });

  it("returns true when participant is the payer", () => {
    const expenses = [
      makeExpense({ amount: 50, paidBy: "Alice", sharedBy: ["Bob"] }),
    ];
    expect(isParticipantProtected("Alice", expenses)).toBe(true);
  });

  it("returns true when participant is in sharedBy", () => {
    const expenses = [
      makeExpense({ amount: 50, paidBy: "Bob", sharedBy: ["Alice", "Charlie"] }),
    ];
    expect(isParticipantProtected("Alice", expenses)).toBe(true);
  });

  it("returns false when participant is in neither paidBy nor sharedBy", () => {
    const expenses = [
      makeExpense({ amount: 50, paidBy: "Bob", sharedBy: ["Charlie"] }),
    ];
    expect(isParticipantProtected("Alice", expenses)).toBe(false);
  });

  it("returns true when participant appears in multiple expenses", () => {
    const expenses = [
      makeExpense({ id: "e1", amount: 30, paidBy: "Alice", sharedBy: ["Bob"] }),
      makeExpense({ id: "e2", amount: 40, paidBy: "Bob", sharedBy: ["Alice"] }),
    ];
    expect(isParticipantProtected("Alice", expenses)).toBe(true);
  });
});

describe("getRemovableParticipants", () => {
  it("returns all participants as removable when there are no expenses", () => {
    const result = getRemovableParticipants(["Alice", "Bob", "Charlie"], []);
    expect(result.removable).toEqual(["Alice", "Bob", "Charlie"]);
    expect(result.protected).toEqual([]);
  });

  it("returns referenced participants as protected", () => {
    const expenses = [
      makeExpense({ amount: 100, paidBy: "Alice", sharedBy: ["Alice", "Bob"] }),
    ];
    const result = getRemovableParticipants(["Alice", "Bob", "Charlie"], expenses);
    expect(result.removable).toEqual(["Charlie"]);
    expect(result.protected).toEqual(["Alice", "Bob"]);
  });

  it("returns all participants as protected when all are referenced", () => {
    const expenses = [
      makeExpense({ amount: 90, paidBy: "Alice", sharedBy: ["Bob", "Charlie"] }),
    ];
    const result = getRemovableParticipants(["Alice", "Bob", "Charlie"], expenses);
    expect(result.removable).toEqual([]);
    expect(result.protected).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("handles empty participants list", () => {
    const result = getRemovableParticipants([], []);
    expect(result.removable).toEqual([]);
    expect(result.protected).toEqual([]);
  });
});
