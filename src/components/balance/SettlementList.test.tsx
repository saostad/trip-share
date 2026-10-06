import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SettlementList } from "./SettlementList";
import type { Expense } from "@/types";

const EXPENSES: Expense[] = [
  {
    id: "e1",
    description: "Dinner",
    date: "2026-10-01",
    amount: 100,
    paidBy: "Ava",
    sharedBy: ["Ava", "Liam"],
    createdAt: {} as never,
  },
];

function renderList(props?: {
  archived?: boolean;
  onMarkPaid?: (t: { from: string; to: string; amount: number }) => void;
}) {
  return render(
    <MemoryRouter>
      <SettlementList
        expenses={EXPENSES}
        participants={["Ava", "Liam"]}
        archived={props?.archived}
        onMarkPaid={props?.onMarkPaid}
      />
    </MemoryRouter>,
  );
}

describe("SettlementList onMarkPaid", () => {
  it("calls onMarkPaid with the transfer when clicked", () => {
    const onMarkPaid = vi.fn();
    renderList({ onMarkPaid });
    fireEvent.click(screen.getByText("Mark as paid"));
    expect(onMarkPaid).toHaveBeenCalledTimes(1);
    expect(onMarkPaid).toHaveBeenCalledWith({
      from: "Liam",
      to: "Ava",
      amount: 50,
    });
  });

  it("shows no button without the prop", () => {
    renderList();
    expect(screen.queryByText("Mark as paid")).not.toBeInTheDocument();
  });

  it("shows no button when archived", () => {
    renderList({ archived: true, onMarkPaid: vi.fn() });
    expect(screen.queryByText("Mark as paid")).not.toBeInTheDocument();
  });
});
