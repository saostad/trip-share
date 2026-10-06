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

function renderSettled(
  tripId: string,
  {
    expenses = EXPENSES,
    payments = [],
    hasTransfers = false,
    onDownloadExcel,
  }: {
    expenses?: Expense[];
    payments?: Payment[];
    hasTransfers?: boolean;
    onDownloadExcel?: () => void;
  } = {},
) {
  return render(
    <SettleCelebration
      tripId={tripId}
      expenses={expenses}
      payments={payments}
      hasTransfers={hasTransfers}
      onDownloadExcel={onDownloadExcel}
    />,
  );
}

function confettiBox(container: HTMLElement): Element | null {
  return container.querySelector(
    'div[aria-hidden="true"].pointer-events-none',
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
  it("keeps the card on re-render with the same settled props", () => {
    const { rerender, unmount } = renderSettled("r1");
    expect(screen.getByText("All settled! 🎉")).toBeInTheDocument();
    rerender(
      <SettleCelebration
        tripId="r1"
        expenses={EXPENSES}
        payments={[]}
        hasTransfers={false}
      />,
    );
    expect(screen.getByText("All settled! 🎉")).toBeInTheDocument();
    unmount();
  });

  it("shows card plus confetti once on the first settled view", () => {
    const { container, unmount } = renderSettled("r2");
    expect(screen.getByText("All settled! 🎉")).toBeInTheDocument();
    expect(screen.getByText("Everyone's paid back. Nice trip.")).toBeInTheDocument();
    expect(confettiBox(container)?.childElementCount).toBe(20);
    unmount();
  });

  it("remounts with card but no confetti once celebrated", () => {
    const first = renderSettled("r3");
    expect(confettiBox(first.container)).toBeInTheDocument();
    first.unmount();

    const second = renderSettled("r3");
    expect(screen.getByText("All settled! 🎉")).toBeInTheDocument();
    expect(confettiBox(second.container)).not.toBeInTheDocument();
    second.unmount();
  });

  it("shows no card with zero expenses", () => {
    const { container, unmount } = renderSettled("r4", { expenses: [] });
    expect(screen.queryByText("All settled! 🎉")).not.toBeInTheDocument();
    expect(confettiBox(container)).not.toBeInTheDocument();
    unmount();
  });

  it("shows no card while transfers remain", () => {
    const { unmount } = renderSettled("r5", { hasTransfers: true });
    expect(screen.queryByText("All settled! 🎉")).not.toBeInTheDocument();
    unmount();
  });

  it("bursts again for a new trip state", () => {
    const first = renderSettled("r6");
    expect(confettiBox(first.container)).toBeInTheDocument();
    first.unmount();

    const withPayment = [payment("p9")];
    const second = renderSettled("r6", { payments: withPayment });
    expect(screen.getByText("All settled! 🎉")).toBeInTheDocument();
    expect(confettiBox(second.container)).toBeInTheDocument();
    second.unmount();
  });

  it("celebrates again after the signature is cleared", () => {
    const first = renderSettled("r7");
    expect(confettiBox(first.container)).toBeInTheDocument();
    first.unmount();

    clearCelebratedSignature("r7");
    const second = renderSettled("r7");
    expect(confettiBox(second.container)).toBeInTheDocument();
    second.unmount();
  });

  it("confetti fires at most once per load when storage throws", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    try {
      const first = renderSettled("r8");
      expect(confettiBox(first.container)).toBeInTheDocument();
      first.unmount();

      const second = renderSettled("r8");
      expect(screen.getByText("All settled! 🎉")).toBeInTheDocument();
      expect(confettiBox(second.container)).not.toBeInTheDocument();
      second.unmount();
    } finally {
      setItem.mockRestore();
    }
  });

  it("offers the Excel download when a handler is provided", () => {
    const onDownloadExcel = vi.fn();
    const { unmount } = renderSettled("r9", { onDownloadExcel });
    fireEvent.click(screen.getByRole("button", { name: "Download Excel" }));
    expect(onDownloadExcel).toHaveBeenCalledTimes(1);
    unmount();
  });
});
