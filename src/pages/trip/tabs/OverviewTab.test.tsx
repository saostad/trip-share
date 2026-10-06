import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { OverviewTabView } from "./OverviewTab";

function renderEmpty(isArchived: boolean) {
  render(
    <MemoryRouter>
      <OverviewTabView
        position={{ kind: "empty" }}
        isOwner
        isArchived={isArchived}
        checklist={{ steps: [], complete: true }}
        checklistDismissed={false}
        activity={[]}
        onAddExpense={vi.fn()}
        onEditTrip={vi.fn()}
        onDismissChecklist={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("empty hero", () => {
  it("invites the first expense with an Add button", () => {
    renderEmpty(false);
    expect(screen.getByText("No expenses yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Add the first expense and TripShare keeps a running balance for everyone.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Add expense" }).length,
    ).toBeGreaterThan(0);
  });

  it("hides every Add button when archived", () => {
    renderEmpty(true);
    expect(screen.getByText("No expenses yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add expense" }),
    ).not.toBeInTheDocument();
  });
});
