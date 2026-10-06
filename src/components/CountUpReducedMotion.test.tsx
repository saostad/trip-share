import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CountUp } from "./CountUp";
import { formatCurrency } from "@/lib/formatters";

// Separate file on purpose: motion caches the reduced-motion media query
// globally on first read, so the reduced and animated cases can't share a
// module load.
describe("CountUp reduced motion", () => {
  it("shows the final value immediately", () => {
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
    render(<CountUp value={130} format={formatCurrency} />);
    expect(screen.getByText("$130.00")).toBeInTheDocument();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
  });
});
