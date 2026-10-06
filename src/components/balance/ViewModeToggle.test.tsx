import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ViewModeToggle } from "./ViewModeToggle";

describe("ViewModeToggle", () => {
  it("marks the selected mode with aria-checked", () => {
    render(
      <ViewModeToggle value="group" onChange={vi.fn()} ariaLabel="Overview view" />,
    );
    expect(
      screen.getByRole("radiogroup", { name: "Overview view" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "By group" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "By person" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("calls onChange with the other mode when clicked", () => {
    const onChange = vi.fn();
    render(
      <ViewModeToggle value="group" onChange={onChange} ariaLabel="Balance view" />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "By person" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("person");
  });

  it("gives the radios a full-width tap-area overlay", () => {
    render(
      <ViewModeToggle value="person" onChange={vi.fn()} ariaLabel="Settlement view" />,
    );
    for (const name of ["By group", "By person"]) {
      const radio = screen.getByRole("radio", { name });
      expect(radio.className).toContain("after:inset-x-0");
      expect(radio.className).toContain("after:-inset-y-2.5");
    }
  });
});
