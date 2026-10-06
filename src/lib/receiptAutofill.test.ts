import { describe, expect, it } from "vitest";
import {
  applyReceiptExtraction,
  touchedFieldsForEdit,
  type AutofillCurrent,
  type AutofillField,
} from "./receiptAutofill";
import type { ExtractionFields } from "./aiApi";

const EMPTY: AutofillCurrent = { description: "", category: null, date: "2026-10-06", amount: "" };

const FULL: ExtractionFields = {
  description: "Lunch",
  category: "food",
  date: "2026-10-05",
  amount: 12.5,
  currency: "USD",
};

const NONE = new Set<AutofillField>();

describe("applyReceiptExtraction", () => {
  it("fills untouched fields", () => {
    const { next, filled } = applyReceiptExtraction(EMPTY, NONE, FULL);
    expect(next).toEqual({
      description: "Lunch",
      category: "food",
      date: "2026-10-05",
      amount: "12.50",
    });
    expect(filled).toEqual(["description", "category", "date", "amount"]);
  });

  it("keeps touched fields", () => {
    const { next, filled } = applyReceiptExtraction(
      { ...EMPTY, amount: "9.99", description: "Mine" },
      new Set<AutofillField>(["amount", "description"]),
      FULL,
    );
    expect(next.amount).toBe("9.99");
    expect(next.description).toBe("Mine");
    expect(next.category).toBe("food");
    expect(next.date).toBe("2026-10-05");
    expect(filled).toEqual(["category", "date"]);
  });

  it("never writes null values", () => {
    const { next, filled } = applyReceiptExtraction(
      EMPTY,
      NONE,
      { description: null, category: null, date: null, amount: null, currency: null },
    );
    expect(next).toEqual(EMPTY);
    expect(filled).toEqual([]);
  });

  it("never writes zero, empty, or non-finite values", () => {
    const { next, filled } = applyReceiptExtraction(
      EMPTY,
      NONE,
      { description: "  ", category: "", date: "", amount: 0, currency: "USD" },
    );
    expect(next).toEqual(EMPTY);
    expect(filled).toEqual([]);
  });

  it("fills nothing when every field is touched", () => {
    const current: AutofillCurrent = {
      description: "Mine",
      category: "drinks",
      date: "2026-01-01",
      amount: "1.00",
    };
    const { next, filled } = applyReceiptExtraction(
      current,
      new Set<AutofillField>(["description", "category", "date", "amount"]),
      FULL,
    );
    expect(next).toEqual(current);
    expect(filled).toEqual([]);
  });
});

describe("touchedFieldsForEdit", () => {
  it("marks both linked fields for a preset tap or description edit", () => {
    expect(touchedFieldsForEdit("preset")).toEqual(["description", "category"]);
    expect(touchedFieldsForEdit("description")).toEqual(["description", "category"]);
  });

  it("marks only the edited field for date and amount", () => {
    expect(touchedFieldsForEdit("date")).toEqual(["date"]);
    expect(touchedFieldsForEdit("amount")).toEqual(["amount"]);
  });
});
