import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CountUp } from "./CountUp";
import { formatCurrency } from "@/lib/formatters";

function stubMatchMedia(reduced: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("CountUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts from zero to the exact final value", async () => {
    stubMatchMedia(false);
    render(<CountUp value={130} format={formatCurrency} />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
    expect(await screen.findByText("$130.00", undefined, { timeout: 3000 })).toBeInTheDocument();
  });

  it("is not a live region", () => {
    stubMatchMedia(true);
    const { container } = render(<CountUp value={130} format={formatCurrency} />);
    expect(container.querySelector("span")).toHaveAttribute("aria-live", "off");
  });
});
