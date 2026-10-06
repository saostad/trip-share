import type { Expense } from "@/types";

/** The friends in the worked example. */
export const WORKED_EXAMPLE_FRIENDS = ["Ava", "Liam", "Maya"] as const;

function exampleExpense(
  id: string,
  description: string,
  amount: number,
  paidBy: string,
): Expense {
  return {
    id,
    description,
    category: null,
    date: "2026-07-04",
    amount,
    paidBy,
    sharedBy: [...WORKED_EXAMPLE_FRIENDS],
    createdAt: null as unknown as Expense["createdAt"],
  };
}

/** Three friends, three expenses, every expense split three ways. */
export const WORKED_EXAMPLE_EXPENSES: Expense[] = [
  exampleExpense("cabin", "Cabin", 300, "Ava"),
  exampleExpense("groceries", "Groceries", 150, "Liam"),
  exampleExpense("gas", "Gas", 60, "Maya"),
];
