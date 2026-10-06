import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { calculateBalances, computeSettlements } from "@/lib/balances";
import { formatCurrency } from "@/lib/formatters";
import {
  WORKED_EXAMPLE_EXPENSES,
  WORKED_EXAMPLE_FRIENDS,
} from "./workedExampleData";
import { WorkedExampleScene } from "./WorkedExample";

const friends = [...WORKED_EXAMPLE_FRIENDS];

describe("WorkedExampleScene", () => {
  it("shows balances that match the real balance math", () => {
    const balances = calculateBalances(WORKED_EXAMPLE_EXPENSES, friends, []);
    render(<WorkedExampleScene stage={2} />);
    for (const name of friends) {
      const net = balances[name] ?? 0;
      const expected =
        net > 0.01
          ? `${name} gets back ${formatCurrency(net)}`
          : net < -0.01
            ? `${name} owes ${formatCurrency(Math.abs(net))}`
            : `${name} is all square`;
      expect(screen.getByText(expected)).toBeInTheDocument();
    }
  });

  it("shows suggested payments that match the real settlement math", () => {
    const transfers = computeSettlements(
      "greedy",
      WORKED_EXAMPLE_EXPENSES,
      friends,
      [],
    );
    expect(transfers.length).toBe(2);
    render(<WorkedExampleScene stage={2} />);
    const caption = `${transfers.map((t) => `${t.from} pays ${t.to}`).join(" · ")} — ${transfers.length} payments settle all 3 expenses.`;
    expect(
      screen.getByText((_, element) => element?.textContent === caption),
    ).toBeInTheDocument();
    for (const transfer of transfers) {
      expect(screen.getAllByText(transfer.from).length).toBeGreaterThan(0);
      expect(screen.getAllByText(transfer.to).length).toBeGreaterThan(0);
      expect(
        screen.getByText(formatCurrency(transfer.amount)),
      ).toBeInTheDocument();
    }
    expect(
      screen.getByText(`${transfers.length} suggested payments`),
    ).toBeInTheDocument();
  });

  it("reveals balances and payments in later stages only", () => {
    const { rerender } = render(<WorkedExampleScene stage={0} />);
    expect(screen.getByText("3 expenses")).toBeInTheDocument();
    expect(screen.queryByText(/balance/)).not.toBeInTheDocument();
    expect(screen.queryByText(/suggested payments/)).not.toBeInTheDocument();

    rerender(<WorkedExampleScene stage={1} />);
    expect(screen.getByText("Each person's balance")).toBeInTheDocument();
    expect(screen.queryByText(/suggested payments/)).not.toBeInTheDocument();
  });
});
