import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { OverviewTabView } from "./OverviewTab";
import type { MyPosition } from "@/lib/tripOverview";

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

describe("unlinked hero", () => {
  const position: MyPosition = {
    kind: "unlinked",
    totalSpent: 300,
    perPersonAverage: 150,
  };

  function renderUnlinked(isOwner: boolean, isArchived: boolean) {
    const onEditTrip = vi.fn();
    render(
      <MemoryRouter>
        <OverviewTabView
          position={position}
          isOwner={isOwner}
          isArchived={isArchived}
          checklist={{ steps: [], complete: true }}
          checklistDismissed={false}
          activity={[]}
          onAddExpense={vi.fn()}
          onEditTrip={onEditTrip}
          onDismissChecklist={vi.fn()}
        />
      </MemoryRouter>,
    );
    return { onEditTrip };
  }

  it("offers the owner a button that opens Edit trip", () => {
    const { onEditTrip } = renderUnlinked(true, false);
    const button = screen.getByRole("button", { name: "Choose which name is you" });
    fireEvent.click(button);
    expect(onEditTrip).toHaveBeenCalledTimes(1);
  });

  it("keeps the ask-the-creator text for non-owners", () => {
    renderUnlinked(false, false);
    expect(
      screen.getByText(/Ask the trip creator to link your account/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Choose which name is you" }),
    ).not.toBeInTheDocument();
  });

  it("shows neither hint for the owner of an archived trip", () => {
    renderUnlinked(true, true);
    expect(
      screen.queryByRole("button", { name: "Choose which name is you" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Ask the trip creator to link your account/),
    ).not.toBeInTheDocument();
  });
});
