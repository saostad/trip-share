import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InfoTip } from "./InfoTip";

function renderTip() {
  return render(
    <InfoTip term="mark as paid" title="Mark as paid" body="Records this payment so balances update." />,
  );
}

describe("InfoTip", () => {
  it("has a trigger labelled with the term", () => {
    renderTip();
    expect(
      screen.getByRole("button", { name: "What does mark as paid mean?" }),
    ).toBeInTheDocument();
  });

  it("opens on click and shows the title and body", () => {
    renderTip();
    expect(screen.queryByText("Mark as paid")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "What does mark as paid mean?" }));
    expect(screen.getByText("Mark as paid")).toBeInTheDocument();
    expect(
      screen.getByText("Records this payment so balances update."),
    ).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    renderTip();
    fireEvent.click(screen.getByRole("button", { name: "What does mark as paid mean?" }));
    expect(screen.getByText("Mark as paid")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(screen.queryByText("Records this payment so balances update.")).not.toBeInTheDocument();
  });
});
