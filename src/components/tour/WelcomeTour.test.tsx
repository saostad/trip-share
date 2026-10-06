import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WelcomeTour } from "./WelcomeTour";

function renderTour(onClose = vi.fn()) {
  render(<WelcomeTour open onClose={onClose} />);
  return { onClose };
}

describe("WelcomeTour", () => {
  it("walks through all 4 steps with Next and Back", () => {
    renderTour();
    expect(screen.getByText("Create a trip")).toBeInTheDocument();
    expect(screen.getByLabelText("Step 1 of 4")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Add expenses")).toBeInTheDocument();
    expect(screen.getByText("Snap a receipt or type it in.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("See who owes whom")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Add expenses")).toBeInTheDocument();
  });

  it("shows Done on the last step and closes", () => {
    const { onClose } = renderTour();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Settle up with fewer payments")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables Back on the first step", () => {
    renderTour();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  });

  it("moves focus to Next when Back reaches the first step", () => {
    renderTour();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const back = screen.getByRole("button", { name: "Back" });
    back.focus();
    fireEvent.click(back);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Next" }),
    );
  });

  it("closes on Skip", () => {
    const { onClose } = renderTour();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const { onClose } = renderTour();
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves between steps with the arrow keys", () => {
    renderTour();
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowRight", code: "ArrowRight" });
    expect(screen.getByText("Add expenses")).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "ArrowLeft", code: "ArrowLeft" });
    expect(screen.getByText("Create a trip")).toBeInTheDocument();
  });

  it("finishes with ArrowRight on the last step", () => {
    const { onClose } = renderTour();
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 3; i++) {
      fireEvent.keyDown(dialog, { key: "ArrowRight", code: "ArrowRight" });
    }
    expect(screen.getByText("Settle up with fewer payments")).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "ArrowRight", code: "ArrowRight" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
