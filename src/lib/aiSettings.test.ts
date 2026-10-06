import { afterEach, describe, expect, it, vi } from "vitest";
import { doc, getDoc } from "firebase/firestore";
import { fetchAutofillEnabled, parseAutofillEnabled } from "./aiSettings";

vi.mock("firebase/firestore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/firestore")>();
  return { ...actual, doc: vi.fn(), getDoc: vi.fn() };
});

function snap(data: unknown) {
  return { exists: () => true, data: () => data };
}

const missing = { exists: () => false, data: () => undefined };

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("parseAutofillEnabled", () => {
  it("is true only for enabled === true", () => {
    expect(parseAutofillEnabled({ enabled: true })).toBe(true);
  });

  it("is false for missing data", () => {
    expect(parseAutofillEnabled(undefined)).toBe(false);
    expect(parseAutofillEnabled(null)).toBe(false);
    expect(parseAutofillEnabled({})).toBe(false);
  });

  it("is false for enabled === false", () => {
    expect(parseAutofillEnabled({ enabled: false })).toBe(false);
  });

  it("is false for a string 'true'", () => {
    expect(parseAutofillEnabled({ enabled: "true" })).toBe(false);
  });

  it("is false for non-objects", () => {
    expect(parseAutofillEnabled(true)).toBe(false);
    expect(parseAutofillEnabled("enabled")).toBe(false);
  });
});

describe("fetchAutofillEnabled", () => {
  it("reads appConfig/ai", async () => {
    vi.mocked(doc).mockReturnValue({} as never);
    vi.mocked(getDoc).mockResolvedValue(snap({ enabled: true }) as never);
    await expect(fetchAutofillEnabled()).resolves.toBe(true);
    expect(doc).toHaveBeenCalledWith(expect.anything(), "appConfig", "ai");
  });

  it("is false when the doc is missing", async () => {
    vi.mocked(doc).mockReturnValue({} as never);
    vi.mocked(getDoc).mockResolvedValue(missing as never);
    await expect(fetchAutofillEnabled()).resolves.toBe(false);
  });

  it("warns and is false on error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(doc).mockReturnValue({} as never);
    vi.mocked(getDoc).mockRejectedValue(new Error("denied"));
    await expect(fetchAutofillEnabled()).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith("[autofill] could not load appConfig/ai", expect.any(Error));
  });
});
