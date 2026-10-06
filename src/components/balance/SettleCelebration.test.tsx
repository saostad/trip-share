import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SettleCelebration } from "./SettleCelebration";
import { clearCelebratedSignature } from "./celebrationStorage";
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
      screen.queryByText("All settled! 🎉"),
    ).not.toBeInTheDocument();

    rerender(
      <SettleCelebration
        tripId="t1"
        expenses={EXPENSES}
        payments={[]}
        hasTransfers={false}
      />,
    );
    expect(screen.getByText("All settled! 🎉")).toBeInTheDocument();
    expect(screen.getByText("Everyone's paid back. Nice trip.")).toBeInTheDocument();

    rerender(
      <SettleCelebration
        tripId="t1"
        expenses={EXPENSES}
        payments={[]}
        hasTransfers
      />,
    );
    expect(
      screen.queryByText("All settled! 🎉"),
    ).not.toBeInTheDocument();
    unmount();
  });

  it("stays hidden when mounting already empty", () => {
    renderCelebration("t2", [], false);
    expect(
      screen.queryByText("All settled! 🎉"),
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
    expect(screen.getByText("All settled! 🎉")).toBeInTheDocument();
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
      screen.queryByText("All settled! 🎉"),
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
    expect(screen.getByText("All settled! 🎉")).toBeInTheDocument();
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
    expect(box?.childElementCount).toBe(20);
    unmount();
  });

  it("offers the Excel download when a handler is provided", () => {
    const onDownloadExcel = vi.fn();
    const { rerender, unmount } = render(
      <SettleCelebration
        tripId="t5"
        expenses={EXPENSES}
        payments={[]}
        hasTransfers
        onDownloadExcel={onDownloadExcel}
      />,
    );
    rerender(
      <SettleCelebration
        tripId="t5"
        expenses={EXPENSES}
        payments={[]}
        hasTransfers={false}
        onDownloadExcel={onDownloadExcel}
      />,
    );
    const button = screen.getByRole("button", { name: "Download Excel" });
    fireEvent.click(button);
    expect(onDownloadExcel).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("celebrates again after the signature is cleared", () => {
    const { rerender, unmount } = renderCelebration("t6", [], true);
    rerender(
      <SettleCelebration
        tripId="t6"
        expenses={EXPENSES}
        payments={[]}
        hasTransfers={false}
      />,
    );
    expect(screen.getByText("All settled! 🎉")).toBeInTheDocument();
    unmount();

    clearCelebratedSignature("t6");
    const second = renderCelebration("t6", [], true);
    second.rerender(
      <SettleCelebration
        tripId="t6"
        expenses={EXPENSES}
        payments={[]}
        hasTransfers={false}
      />,
    );
    expect(screen.getByText("All settled! 🎉")).toBeInTheDocument();
    second.unmount();
  });
});
