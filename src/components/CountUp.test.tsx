import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
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
    const { container } = render(<CountUp value={130} format={formatCurrency} />);
    const animated = container.querySelector('span[aria-hidden="true"]');
    expect(animated).toHaveTextContent("$0.00");
    // Screen readers get the final value at once.
    expect(container.querySelector(".sr-only")).toHaveTextContent("$130.00");
    await waitFor(
      () => expect(animated).toHaveTextContent("$130.00"),
      { timeout: 3000 },
    );
  });

  it("never dips below the old value when the value rises", async () => {
    stubMatchMedia(false);
    const { container, rerender } = render(
      <CountUp value={128.5} format={formatCurrency} />,
    );
    const animated = container.querySelector('span[aria-hidden="true"]');
    await waitFor(
      () => expect(animated).toHaveTextContent("$128.50"),
      { timeout: 3000 },
    );
    rerender(<CountUp value={171.25} format={formatCurrency} />);
    for (let i = 0; i < 15; i++) {
      const text = animated ? animated.textContent || "" : "";
      let digits = "";
      for (const ch of text) {
        if ((ch >= "0" && ch <= "9") || ch === ".") digits += ch;
      }
      expect(Number(digits)).toBeGreaterThanOrEqual(128.49);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    await waitFor(
      () => expect(animated).toHaveTextContent("$171.25"),
      { timeout: 3000 },
    );
  });

  it("hides the animation from assistive tech", () => {
    stubMatchMedia(false);
    const { container } = render(<CountUp value={130} format={formatCurrency} />);
    expect(container.querySelector("[aria-live]")).not.toBeInTheDocument();
    // The animating span is hidden; the sr-only sibling has the final value.
    expect(
      container.querySelector('span[aria-hidden="true"]'),
    ).toBeInTheDocument();
    expect(container.querySelector(".sr-only")).toHaveTextContent("$130.00");
  });
});
