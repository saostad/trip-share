import { describe, expect, it } from "vitest";
import { formatCurrency } from "./formatters";

describe("formatCurrency", () => {
  it("formats small amounts with two decimals", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(50)).toBe("$50.00");
    expect(formatCurrency(255.99)).toBe("$255.99");
  });

  it("groups thousands", () => {
    expect(formatCurrency(1000)).toBe("$1,000.00");
    expect(formatCurrency(1149.65)).toBe("$1,149.65");
    expect(formatCurrency(1234567.89)).toBe("$1,234,567.89");
  });

  it("takes the absolute value", () => {
    expect(formatCurrency(-1149.65)).toBe("$1,149.65");
  });
});
