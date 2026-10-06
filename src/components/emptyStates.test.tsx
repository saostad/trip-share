import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ExpenseList } from "./expense/ExpenseList";
import { PaymentList } from "./balance/PaymentList";
import { SettlementList } from "./balance/SettlementList";
import { OverviewTabView } from "@/pages/trip/tabs/OverviewTab";
import type { Expense } from "@/types";

function expense(overrides: Partial<Expense> & { id: string }): Expense {
  return {
    description: "Test",
    date: "2026-10-01",
    amount: 50,
    paidBy: "Ava",
    sharedBy: ["Ava", "Liam"],
    createdAt: { toDate: () => new Date("2026-10-01T10:00:00Z") } as never,
    ...overrides,
  };
}

describe("ExpenseList empty", () => {
  it("offers the first expense and a How it works link", () => {
    const onAdd = vi.fn();
    render(
      <MemoryRouter>
        <ExpenseList expenses={[]} onAdd={onAdd} />
      </MemoryRouter>,
    );
    expect(screen.getByText("No expenses yet")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Add your first expense" }),
    );
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "/how-it-works",
    );
  });

  it("hides the button when read-only", () => {
    render(
      <MemoryRouter>
        <ExpenseList expenses={[]} readOnly onAdd={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText("No expenses yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add your first expense" }),
    ).not.toBeInTheDocument();
  });
});

describe("PaymentList empty", () => {
  it("explains when to record with a Record button", () => {
    const onAdd = vi.fn();
    render(<PaymentList payments={[]} onAdd={onAdd} />);
    expect(screen.getByText("No payments yet")).toBeInTheDocument();
    expect(
      screen.getByText("When someone pays someone back, record it here."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Record a payment" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("hides the button when read-only", () => {
    render(<PaymentList payments={[]} readOnly onAdd={vi.fn()} />);
    expect(screen.getByText("No payments yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Record a payment" }),
    ).not.toBeInTheDocument();
  });
});

describe("SettlementList empty", () => {
  it("asks for expenses when there is nothing to settle", () => {
    render(
      <SettlementList expenses={[]} participants={["Ava", "Liam"]} payments={[]} />,
    );
    expect(
      screen.getByText("Add expenses to see who owes whom"),
    ).toBeInTheDocument();
  });

  it("celebrates all square when balances net out", () => {
    render(
      <SettlementList
        expenses={[
          expense({ id: "e1", paidBy: "Ava" }),
          expense({ id: "e2", paidBy: "Liam" }),
        ]}
        participants={["Ava", "Liam"]}
        payments={[]}
      />,
    );
    expect(screen.getByText("Everyone is all square")).toBeInTheDocument();
  });
});

describe("Recent activity empty", () => {
  it("shows the illustrated empty state", () => {
    render(
      <MemoryRouter>
        <OverviewTabView
          position={{ kind: "empty" }}
          isOwner
          isArchived={false}
          checklist={{ steps: [], complete: true }}
          checklistDismissed={false}
          activity={[]}
          onAddExpense={vi.fn()}
          onEditTrip={vi.fn()}
          onDismissChecklist={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
    expect(
      screen.getByText("Expenses and payments will show up here."),
    ).toBeInTheDocument();
  });
});
