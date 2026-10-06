import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

const VARIANTS = ["neutral", "primary", "positive", "negative", "warning"] as const;

// The token substring each variant's class must contain.
// Neutral uses the muted token (there is no --neutral token).
const VARIANT_TOKEN: Record<(typeof VARIANTS)[number], string> = {
  neutral: "muted",
  primary: "primary",
  positive: "positive",
  negative: "negative",
  warning: "warning",
};

describe("Badge", () => {
  it.each(VARIANTS)("renders variant %s with its token class", (variant) => {
    render(<Badge variant={variant}>{variant} label</Badge>);
    const el = screen.getByText(`${variant} label`);
    expect(el).toHaveAttribute("data-slot", "badge");
    expect(el.className).toContain(VARIANT_TOKEN[variant]);
  });

  it("renders sm and md sizes with different classes", () => {
    const { rerender } = render(<Badge size="sm">sized</Badge>);
    const smClass = screen.getByText("sized").className;
    rerender(<Badge size="md">sized</Badge>);
    const mdClass = screen.getByText("sized").className;
    expect(smClass).not.toBe(mdClass);
  });
});
