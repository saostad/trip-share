import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button hit-area expansion", () => {
  it.each([
    ["default", "after:-inset-y-1.5"],
    ["xs", "after:-inset-y-2.5"],
    ["sm", "after:-inset-y-2"],
    ["lg", "after:-inset-y-1"],
  ] as const)("text size %s spans full width", (size, insetY) => {
    render(<Button size={size}>Tap</Button>);
    const classes = screen.getByRole("button", { name: "Tap" }).className;
    // Without inset-x-0 the absolutely positioned ::after shrinks to 0 width.
    expect(classes).toContain("after:inset-x-0");
    expect(classes).toContain(insetY);
  });

  it.each([
    ["icon", "after:-inset-1.5"],
    ["icon-xs", "after:-inset-2.5"],
    ["icon-sm", "after:-inset-2"],
    ["icon-lg", "after:-inset-1"],
  ] as const)("icon size %s keeps its all-sides expansion", (size, inset) => {
    render(
      <Button size={size} aria-label="Tap">
        ×
      </Button>,
    );
    const classes = screen.getByRole("button", { name: "Tap" }).className;
    expect(classes).toContain(inset);
    expect(classes).not.toContain("after:inset-x-0");
  });
});
