import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { PaymentList } from "./PaymentList";
import type { Payment } from "@/types";

function payment(id: string, from: string, to: string): Payment {
  return {
    id,
    from,
    to,
    amount: 25,
    date: "2026-10-02",
    createdAt: { toDate: () => new Date("2026-10-02T10:00:00Z") } as never,
  };
}

describe("PaymentList highlight", () => {
  it("marks only newly added rows", () => {
    const { rerender, container } = render(
      <PaymentList payments={[payment("p1", "Liam", "Ava")]} />,
    );
    expect(
      container.querySelector('[data-highlight="true"]'),
    ).not.toBeInTheDocument();

    rerender(
      <PaymentList
        payments={[payment("p1", "Liam", "Ava"), payment("p2", "Maya", "Ava")]}
      />,
    );
    const flagged = container.querySelectorAll('[data-highlight="true"]');
    expect(flagged).toHaveLength(1);
    expect(flagged[0]).toHaveClass("row-flash");
    expect(flagged[0]?.textContent).toContain("Maya");
  });
});
