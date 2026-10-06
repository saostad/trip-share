import { describe, expect, it } from "vitest";
import { normalizeExtraction } from "./normalize";

const TODAY = "2026-10-06";
const IDS = ["food", "hotel"];

describe("normalizeExtraction amount", () => {
  it("accepts a finite positive number up to 1,000,000, rounded to cents", () => {
    expect(normalizeExtraction({ total: 12.5 }, IDS, TODAY).fields.amount).toBe(12.5);
    expect(normalizeExtraction({ total: 19.99 }, IDS, TODAY).fields.amount).toBe(19.99);
    expect(normalizeExtraction({ total: 1000000 }, IDS, TODAY).fields.amount).toBe(1000000);
  });

  it("rejects zero, negative, infinite and over-limit numbers", () => {
    for (const total of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 1000000.01]) {
      expect(normalizeExtraction({ total }, IDS, TODAY).fields.amount).toBeNull();
    }
  });

  it("checks the rounded value: 0.004 is null, 0.005 is 0.01", () => {
    expect(normalizeExtraction({ total: 0.004 }, IDS, TODAY).fields.amount).toBeNull();
    expect(normalizeExtraction({ total: "0.004" }, IDS, TODAY).fields.amount).toBeNull();
    expect(normalizeExtraction({ total: 0.005 }, IDS, TODAY).fields.amount).toBe(0.01);
  });

  it("accepts US-format strings like $1,234.56", () => {
    expect(normalizeExtraction({ total: "$1,234.56" }, IDS, TODAY).fields.amount).toBe(1234.56);
    expect(normalizeExtraction({ total: "42" }, IDS, TODAY).fields.amount).toBe(42);
    expect(normalizeExtraction({ total: "  $ 2,000 " }, IDS, TODAY).fields.amount).toBe(2000);
  });

  it("rejects non-US formats such as 12,50", () => {
    for (const total of ["12,50", "1,23,456", "$-5", "abc", "", "12 USD", true, null]) {
      expect(normalizeExtraction({ total }, IDS, TODAY).fields.amount).toBeNull();
    }
  });
});

describe("normalizeExtraction date", () => {
  it("accepts a real date from 2000-01-01 up to today plus 1 day", () => {
    expect(normalizeExtraction({ date: "2000-01-01" }, IDS, TODAY).fields.date).toBe("2000-01-01");
    expect(normalizeExtraction({ date: "2026-10-06" }, IDS, TODAY).fields.date).toBe("2026-10-06");
    expect(normalizeExtraction({ date: "2026-10-07" }, IDS, TODAY).fields.date).toBe("2026-10-07");
  });

  it("rejects impossible, out-of-range and malformed dates", () => {
    for (const date of [
      "2026-02-30",
      "2026-13-01",
      "1999-12-31",
      "2026-10-08",
      "not-a-date",
      "2026-1-5",
      "10/06/2026",
      20261006,
      null,
    ]) {
      expect(normalizeExtraction({ date }, IDS, TODAY).fields.date).toBeNull();
    }
  });
});

describe("normalizeExtraction category", () => {
  it("keeps exactly one of the request ids", () => {
    expect(normalizeExtraction({ category: "food" }, IDS, TODAY).fields.category).toBe("food");
  });

  it("matches ids case-insensitively and returns the canonical id", () => {
    expect(normalizeExtraction({ category: "FOOD" }, IDS, TODAY).fields.category).toBe("food");
    expect(normalizeExtraction({ category: "Hotel" }, IDS, TODAY).fields.category).toBe("hotel");
  });

  it("rejects unknown and non-string categories", () => {
    for (const category of ["snacks", "", 42, null]) {
      expect(normalizeExtraction({ category }, IDS, TODAY).fields.category).toBeNull();
    }
  });
});

describe("normalizeExtraction description", () => {
  it("turns control chars into spaces, collapses whitespace, cuts to 80", () => {
    expect(
      normalizeExtraction({ description: "  Grand\u0000  Hotel\nLobby  " }, IDS, TODAY).fields
        .description,
    ).toBe("Grand Hotel Lobby");
    expect(
      normalizeExtraction({ description: "STARBUCKS\nSTORE #123" }, IDS, TODAY).fields.description,
    ).toBe("STARBUCKS STORE #123");
    expect(normalizeExtraction({ description: "x".repeat(81) }, IDS, TODAY).fields.description).toBe(
      "x".repeat(80),
    );
  });

  it("falls back to the merchant, else null", () => {
    expect(
      normalizeExtraction({ description: "", merchant: "  Cafe Rio  " }, IDS, TODAY).fields
        .description,
    ).toBe("Cafe Rio");
    expect(
      normalizeExtraction({ description: "   ", merchant: "  " }, IDS, TODAY).fields.description,
    ).toBeNull();
    expect(normalizeExtraction({}, IDS, TODAY).fields.description).toBeNull();
  });
});

describe("normalizeExtraction currency", () => {
  it("uppercases a trimmed ISO code", () => {
    expect(normalizeExtraction({ currency: "usd" }, IDS, TODAY).fields.currency).toBe("USD");
    expect(normalizeExtraction({ currency: "  eur " }, IDS, TODAY).fields.currency).toBe("EUR");
  });

  it("rejects anything but three letters", () => {
    for (const currency of ["US", "USDD", "U$D", "123", "", null, 840]) {
      expect(normalizeExtraction({ currency }, IDS, TODAY).fields.currency).toBeNull();
    }
  });
});

describe("normalizeExtraction missing", () => {
  it("lists null keys among description, category, date and amount only", () => {
    expect(
      normalizeExtraction(
        { description: "Lunch", category: "food", date: "2026-10-06", total: 9.5 },
        IDS,
        TODAY,
      ),
    ).toEqual({
      fields: {
        description: "Lunch",
        category: "food",
        date: "2026-10-06",
        amount: 9.5,
        currency: null,
      },
      missing: [],
    });
    expect(normalizeExtraction({}, IDS, TODAY).missing).toEqual([
      "description",
      "category",
      "date",
      "amount",
    ]);
  });

  it("treats an all-null result as success", () => {
    const result = normalizeExtraction({ total: "12,50", date: "yesterday" }, IDS, TODAY);
    expect(result.fields).toEqual({
      description: null,
      category: null,
      date: null,
      amount: null,
      currency: null,
    });
    expect(result.missing).toHaveLength(4);
  });

  it("treats a non-object answer as all-null", () => {
    expect(normalizeExtraction("nope", IDS, TODAY).missing).toHaveLength(4);
    expect(normalizeExtraction(null, IDS, TODAY).missing).toHaveLength(4);
  });
});
