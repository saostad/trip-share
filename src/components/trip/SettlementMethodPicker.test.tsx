import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SettlementMethodPicker } from "./SettlementMethodPicker";
import type { SettlementMethod } from "@/types";

const METHODS: SettlementMethod[] = [
  "greedy",
  "minimize",
  "treasurer",
  "smallest",
  "pairwise",
];

describe("SettlementMethodPicker", () => {
  it("shows every option with its plain description", () => {
    render(<SettlementMethodPicker value="greedy" onChange={vi.fn()} />);
    expect(screen.getByText("How payments are suggested")).toBeInTheDocument();
    for (const label of [
      "Greedy (largest first)",
      "Minimize transactions",
      "Central pot (auto treasurer)",
      "Smallest first (clear one person)",
      "Pairwise netting",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(
      screen.getByText("Pairs the biggest amounts first. Best for most trips."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Only suggests payments between people who shared expenses."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Greedy \(largest first\)/ }),
    ).toBeChecked();
  });

  it("marks only the default as Recommended", () => {
    render(<SettlementMethodPicker value="minimize" onChange={vi.fn()} />);
    expect(screen.getAllByText("Recommended")).toHaveLength(1);
    expect(
      screen.getByRole("radio", { name: /Minimize transactions/ }),
    ).toBeChecked();
  });

  it("reports the picked method", () => {
    const onChange = vi.fn();
    render(<SettlementMethodPicker value="greedy" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /Pairwise netting/ }));
    expect(onChange).toHaveBeenCalledWith("pairwise");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("covers every settlement method", () => {
    render(<SettlementMethodPicker value="greedy" onChange={vi.fn()} />);
    expect(screen.getAllByRole("radio")).toHaveLength(METHODS.length);
  });
});
