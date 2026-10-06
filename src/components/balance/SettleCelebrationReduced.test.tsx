import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettleCelebration } from "./SettleCelebration";
import type { Expense } from "@/types";

// Separate file on purpose: motion caches the reduced-motion media query
// globally on first read, so the reduced and animated cases can't share a
// module load.
describe("SettleCelebration reduced motion", () => {
  it("renders the card without confetti", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    const expenses: Expense[] = [
      {
        id: "e1",
        description: "Test",
        date: "2026-10-01",
        amount: 50,
        paidBy: "Ava",
        sharedBy: ["Ava", "Liam"],
        createdAt: { toDate: () => new Date("2026-10-01T10:00:00Z") } as never,
      },
    ];
    const { container, rerender } = render(
      <SettleCelebration
        tripId="t9"
        expenses={expenses}
        payments={[]}
        hasTransfers
      />,
    );
    rerender(
      <SettleCelebration
        tripId="t9"
        expenses={expenses}
        payments={[]}
        hasTransfers={false}
      />,
    );
    expect(screen.getByText("All settled! 🎉")).toBeInTheDocument();
    expect(
      container.querySelector('div[aria-hidden="true"]'),
    ).not.toBeInTheDocument();
  });
});
