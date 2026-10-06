import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExpenseList } from "./ExpenseList";
import type { Expense } from "@/types";

function expense(id: string, description: string): Expense {
  return {
    id,
    description,
    date: "2026-10-01",
    amount: 50,
    paidBy: "Ava",
    sharedBy: ["Ava", "Liam"],
    createdAt: { toDate: () => new Date("2026-10-01T10:00:00Z") } as never,
  };
}

describe("ExpenseList highlight", () => {
  it("marks only newly added rows", () => {
    const { rerender } = render(
      <ExpenseList expenses={[expense("e1", "Cabin")]} />,
    );
    expect(screen.getByText("Cabin").closest("li")).not.toHaveAttribute(
      "data-highlight",
    );

    rerender(
      <ExpenseList
        expenses={[expense("e1", "Cabin"), expense("e2", "Groceries")]}
      />,
    );
    expect(screen.getByText("Cabin").closest("li")).not.toHaveAttribute(
      "data-highlight",
    );
    const added = screen.getByText("Groceries").closest("li");
    expect(added).toHaveAttribute("data-highlight", "true");
    expect(added).toHaveClass("row-flash");
  });
});
