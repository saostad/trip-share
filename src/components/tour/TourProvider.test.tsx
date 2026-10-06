import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TourProvider } from "./TourProvider";
import { useTour } from "./useTour";
import { TOUR_SEEN_KEY } from "./tourStorage";

function ReplayButton() {
  const { openTour } = useTour();
  return <button onClick={openTour}>Replay welcome tour</button>;
}

beforeEach(() => {
  localStorage.clear();
});

describe("TourProvider", () => {
  it("opens the tour on demand and sets the key on Done", () => {
    render(
      <TourProvider>
        <ReplayButton />
      </TourProvider>,
    );
    expect(screen.queryByText("Create a trip")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Replay welcome tour"));
    expect(screen.getByText("Create a trip")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(localStorage.getItem(TOUR_SEEN_KEY)).toBe("1");
  });

  it("sets the key on Skip", () => {
    render(
      <TourProvider>
        <ReplayButton />
      </TourProvider>,
    );
    fireEvent.click(screen.getByText("Replay welcome tour"));
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(localStorage.getItem(TOUR_SEEN_KEY)).toBe("1");
  });

  it("sets the key when the dialog is closed", () => {
    render(
      <TourProvider>
        <ReplayButton />
      </TourProvider>,
    );
    fireEvent.click(screen.getByText("Replay welcome tour"));
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(localStorage.getItem(TOUR_SEEN_KEY)).toBe("1");
  });
});
