import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { previewTrip } from "@/dev/fixtures";
import { TripForm } from "./TripForm";

describe("TripForm advanced options", () => {
  it("hides the method picker and groups editor until expanded", () => {
    render(
      <TripForm
        trip={previewTrip}
        expenses={[]}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(
      screen.queryByText("How payments are suggested"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Pay as a group (families, couples)"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Advanced options"));
    expect(
      screen.getByText("How payments are suggested"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Pay as a group (families, couples)"),
    ).toBeInTheDocument();
  });
});
