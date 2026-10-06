import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettleCelebration } from "./SettleCelebration";
import type { Expense, Payment } from "@/types";

function expense(id: string): Expense {
  return {
    id,
    description: "Test",
    date: "2026-10-01",
    amount: 50,
    paidBy: "Ava",
    sharedBy: ["Ava", "Liam"],
    createdAt: { toDate: () => new Date("2026-10-01T10:00:00Z") } as never,
  };
}

function payment(id: string): Payment {
  return {
    id,
    from: "Liam",
    to: "Ava",
    amount: 25,
    date: "2026-10-02",
    createdAt: { toDate: () => new Date("2026-10-02T10:00:00Z") } as never,
  };
}

const EXPENSES = [expense("e1")];

function renderCelebration(
  tripId: string,
  payments: Payment[],
  hasTransfers: boolean,
) {
  return render(
    <SettleCelebration
      tripId={tripId}
      expenses={EXPENSES}
      payments={payments}
      hasTransfers={hasTransfers}
    />,
  );
}

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("SettleCelebration", () => {
  it("appears on a fresh transition and disappears with transfers", () => {
    const { rerender, unmount } = renderCelebration("t1", [], true);
    expect(
      screen.queryByText("Everyone is all square"),
    ).not.toBeInTheDocument();

    rerender(
      <SettleCelebration
        tripId="t1"
        expenses={EXPENSES}
        payments={[]}
        hasTransfers={false}
      />,
    );
    expect(screen.getByText("Everyone is all square")).toBeInTheDocument();
    expect(screen.getByText("Nothing left to pay.")).toBeInTheDocument();

    rerender(
      <SettleCelebration
        tripId="t1"
        expenses={EXPENSES}
        payments={[]}
        hasTransfers
      />,
    );
    expect(
      screen.queryByText("Everyone is all square"),
    ).not.toBeInTheDocument();
    unmount();
  });

  it("stays hidden when mounting already empty", () => {
    renderCelebration("t2", [], false);
    expect(
      screen.queryByText("Everyone is all square"),
    ).not.toBeInTheDocument();
  });

  it("celebrates once per trip state; a new payment resets it", () => {
    const first = renderCelebration("t3", [], true);
    first.rerender(
      <SettleCelebration
        tripId="t3"
        expenses={EXPENSES}
        payments={[]}
        hasTransfers={false}
      />,
    );
    expect(screen.getByText("Everyone is all square")).toBeInTheDocument();
    first.unmount();

    const second = renderCelebration("t3", [], true);
    second.rerender(
      <SettleCelebration
        tripId="t3"
        expenses={EXPENSES}
        payments={[]}
        hasTransfers={false}
      />,
    );
    expect(
      screen.queryByText("Everyone is all square"),
    ).not.toBeInTheDocument();
    second.unmount();

    const withPayment = [payment("p9")];
    const third = renderCelebration("t3", withPayment, true);
    third.rerender(
      <SettleCelebration
        tripId="t3"
        expenses={EXPENSES}
        payments={withPayment}
        hasTransfers={false}
      />,
    );
    expect(screen.getByText("Everyone is all square")).toBeInTheDocument();
    third.unmount();
  });

  it("renders confetti pieces when visible", () => {
    const { container, rerender, unmount } = renderCelebration("t4", [], true);
    rerender(
      <SettleCelebration
        tripId="t4"
        expenses={EXPENSES}
        payments={[]}
        hasTransfers={false}
      />,
    );
    const box = container.querySelector('div[aria-hidden="true"]');
    expect(box?.childElementCount).toBe(40);
    unmount();
  });
});
