import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { OverviewTabView } from "./OverviewTab";
import { myPosition, type MyPosition } from "@/lib/tripOverview";
import type { Expense, Trip } from "@/types";

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
      screen.getAllByRole("button", { name: "Add expense" }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("link", { name: "Settle up" }),
    ).not.toBeInTheDocument();
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

  it("keeps the quick actions for non-empty positions", () => {
    renderUnlinked(true, false);
    expect(screen.getByRole("link", { name: "Settle up" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Add expense" }).length,
    ).toBeGreaterThan(0);
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

describe("hero view toggle", () => {
  const trip: Trip = {
    id: "t1",
    ownerId: "u1",
    name: "Test",
    participants: ["Ava", "Liam", "Maya"],
    collaboratorIds: [],
    participantLinks: {},
    settlementMethod: "greedy",
    settlementGroups: [
      { id: "g1", name: "Fam", members: ["Ava", "Liam"], representative: "Ava" },
    ],
    shareToken: null,
    createdAt: {} as never,
    updatedAt: {} as never,
  };
  const expenses: Expense[] = [
    {
      id: "e1",
      description: "Dinner",
      date: "2026-10-01",
      amount: 120,
      paidBy: "Ava",
      sharedBy: ["Ava", "Liam", "Maya"],
      createdAt: {} as never,
    },
  ];

  function renderHero(myName: string | null, opts?: { hasGroups?: boolean }) {
    const hasGroups = opts?.hasGroups ?? true;
    render(
      <MemoryRouter>
        <OverviewTabView
          position={myPosition(trip, expenses, [], myName)}
          groupPosition={myPosition(trip, expenses, [], myName, "group")}
          hasGroups={hasGroups}
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
  }

  it("defaults to By group on a grouped trip", () => {
    renderHero("Ava");
    expect(
      screen.getByRole("radiogroup", { name: "Overview view" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "By group" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByText("Fam gets back")).toBeInTheDocument();
    expect(screen.getByText(/Maya owes your group/)).toBeInTheDocument();
    expect(
      screen.getByText(/Ava pays or receives for Fam/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See Settle up" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("You get back")).not.toBeInTheDocument();
  });

  it("switching to By person shows the person lines", () => {
    renderHero("Ava");
    fireEvent.click(screen.getByRole("radio", { name: "By person" }));
    expect(screen.getByRole("radio", { name: "By person" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByText("You get back")).toBeInTheDocument();
    expect(screen.getByText(/Liam owes you/)).toBeInTheDocument();
    expect(screen.getByText(/Maya owes you/)).toBeInTheDocument();
    expect(
      screen.getByText(/Your group settles as one/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "see Settle up" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Fam gets back")).not.toBeInTheDocument();
  });

  it("keeps person wording with group names when I'm ungrouped", () => {
    renderHero("Maya");
    expect(screen.getByText("You owe")).toBeInTheDocument();
    expect(screen.getByText(/You owe Fam/)).toBeInTheDocument();
    expect(screen.queryByText(/pays or receives for/)).not.toBeInTheDocument();
  });

  it("shows the group note with a capitalised link when the group is square", () => {
    const squareTrip: Trip = { ...trip, participants: ["Ava", "Liam"] };
    const squareExpenses: Expense[] = (["e1", "e2"] as const).map(
      (id, i) => ({
        id,
        description: id === "e1" ? "Dinner" : "Lunch",
        date: "2026-10-01",
        amount: 50,
        paidBy: i === 0 ? "Ava" : "Liam",
        sharedBy: ["Ava", "Liam"],
        createdAt: {} as never,
      }),
    );
    render(
      <MemoryRouter>
        <OverviewTabView
          position={myPosition(squareTrip, squareExpenses, [], "Ava")}
          groupPosition={myPosition(squareTrip, squareExpenses, [], "Ava", "group")}
          hasGroups
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
    expect(
      screen.getByRole("radiogroup", { name: "Overview view" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Fam is all square")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See Settle up" }),
    ).toBeInTheDocument();
  });

  it("shows no toggle without groups", () => {
    renderHero("Ava", { hasGroups: false });
    expect(
      screen.queryByRole("radiogroup", { name: "Overview view" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("You get back")).toBeInTheDocument();
  });

  it("shows no toggle on the empty or unlinked heroes", () => {
    const { unmount } = render(
      <MemoryRouter>
        <OverviewTabView
          position={{ kind: "empty" }}
          groupPosition={{ kind: "empty" }}
          hasGroups
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
    expect(
      screen.queryByRole("radiogroup", { name: "Overview view" }),
    ).not.toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter>
        <OverviewTabView
          position={{ kind: "unlinked", totalSpent: 120, perPersonAverage: 40 }}
          groupPosition={{ kind: "unlinked", totalSpent: 120, perPersonAverage: 40 }}
          hasGroups
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
    expect(
      screen.queryByRole("radiogroup", { name: "Overview view" }),
    ).not.toBeInTheDocument();
  });
});
