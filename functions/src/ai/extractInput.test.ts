import { HttpsError } from "firebase-functions/v2/https";
import { describe, expect, it } from "vitest";
import {
  validateCategoriesField,
  validateExtractInput,
  validateImageField,
  validateTripIdField,
} from "./extractInput";

const IMAGE = { mimeType: "image/jpeg", base64: "aGVsbG8=" };
const CATEGORIES = [{ id: "food", label: "Food" }];

function expectInvalidArgument(fn: () => unknown, field: string): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpsError);
    expect((error as HttpsError).code).toBe("invalid-argument");
    expect((error as HttpsError).message).toContain(field);
    return;
  }
  expect.unreachable("expected an invalid-argument HttpsError");
}

describe("validateExtractInput", () => {
  it("accepts valid input and strips the data: prefix", () => {
    expect(
      validateExtractInput({
        tripId: "trip-1",
        image: { mimeType: "image/png", base64: "data:image/png;base64,aGVsbG8=" },
        categories: CATEGORIES,
      }),
    ).toEqual({ tripId: "trip-1", image: { mimeType: "image/png", base64: "aGVsbG8=" }, categories: CATEGORIES });
  });

  it("rejects a non-object body", () => {
    expectInvalidArgument(() => validateExtractInput(undefined), "object");
    expectInvalidArgument(() => validateExtractInput([]), "object");
  });
});

describe("validateTripIdField", () => {
  it("accepts 1 to 128 characters", () => {
    expect(validateTripIdField("t")).toBe("t");
    expect(validateTripIdField("x".repeat(128))).toBe("x".repeat(128));
  });

  it("rejects empty, over-long, non-string and slash ids", () => {
    expectInvalidArgument(() => validateTripIdField(""), "tripId");
    expectInvalidArgument(() => validateTripIdField("x".repeat(129)), "tripId");
    expectInvalidArgument(() => validateTripIdField(42), "tripId");
    expectInvalidArgument(() => validateTripIdField("a/b"), "tripId");
  });
});

describe("validateImageField", () => {
  it("accepts the three photo mime types", () => {
    for (const mimeType of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateImageField({ mimeType, base64: "aGVsbG8=" }).mimeType).toBe(mimeType);
    }
  });

  it("rejects a non-object image and other mime types", () => {
    expectInvalidArgument(() => validateImageField(undefined), "image");
    expectInvalidArgument(() => validateImageField({ mimeType: "image/gif", base64: "aGVsbG8=" }), "mimeType");
    expectInvalidArgument(() => validateImageField({ mimeType: "application/pdf", base64: "aGVsbG8=" }), "mimeType");
  });

  it("rejects malformed, non-alphabet and empty base64", () => {
    expectInvalidArgument(() => validateImageField({ ...IMAGE, base64: 42 }), "base64");
    expectInvalidArgument(() => validateImageField({ ...IMAGE, base64: "" }), "base64");
    expectInvalidArgument(() => validateImageField({ ...IMAGE, base64: "!!!" }), "base64");
    expectInvalidArgument(() => validateImageField({ ...IMAGE, base64: "abc" }), "base64");
    expectInvalidArgument(() => validateImageField({ ...IMAGE, base64: "data:image/png" }), "base64");
  });

  it("rejects images over 5 MB and accepts exactly 5 MB", () => {
    const fiveMb = Buffer.alloc(5 * 1024 * 1024).toString("base64");
    expect(validateImageField({ mimeType: "image/webp", base64: fiveMb }).base64).toBe(fiveMb);
    const fiveMbPlusOne = Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64");
    expectInvalidArgument(
      () => validateImageField({ mimeType: "image/webp", base64: fiveMbPlusOne }),
      "base64",
    );
  });
});

describe("validateCategoriesField", () => {
  it("accepts 1 to 30 items and strips control chars from labels", () => {
    expect(validateCategoriesField(CATEGORIES)).toEqual(CATEGORIES);
    expect(validateCategoriesField([{ id: "a", label: "A\0B" }])).toEqual([
      { id: "a", label: "AB" },
    ]);
    expect(
      validateCategoriesField(Array.from({ length: 30 }, (_, i) => ({ id: `c${i}`, label: "L" }))),
    ).toHaveLength(30);
  });

  it("rejects empty, over-long and non-array categories", () => {
    expectInvalidArgument(() => validateCategoriesField([]), "categories");
    expectInvalidArgument(
      () => validateCategoriesField(Array.from({ length: 31 }, () => ({ id: "a", label: "L" }))),
      "categories",
    );
    expectInvalidArgument(() => validateCategoriesField("food"), "categories");
    expectInvalidArgument(() => validateCategoriesField([42]), "categories");
  });

  it("rejects bad ids and duplicate ids", () => {
    for (const id of ["Food", "has space", "", "x".repeat(33), 42]) {
      expectInvalidArgument(() => validateCategoriesField([{ id, label: "L" }]), "categories.id");
    }
    expectInvalidArgument(
      () => validateCategoriesField([{ id: "a", label: "A" }, { id: "a", label: "B" }]),
      "categories",
    );
  });

  it("rejects empty and over-long labels", () => {
    expectInvalidArgument(() => validateCategoriesField([{ id: "a", label: "" }]), "label");
    expectInvalidArgument(() => validateCategoriesField([{ id: "a", label: "x".repeat(41) }]), "label");
    expectInvalidArgument(() => validateCategoriesField([{ id: "a", label: 42 }]), "label");
  });
});
