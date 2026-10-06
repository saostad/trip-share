import { describe, expect, it } from "vitest";
import { resolveIsAdmin } from "./adminAccess";

describe("resolveIsAdmin", () => {
  it("is true only for a confirmed existing admin doc", () => {
    expect(resolveIsAdmin({ exists: true })).toBe(true);
  });

  it("fails closed on a missing doc or a failed lookup", () => {
    expect(resolveIsAdmin({ exists: false })).toBe(false);
    expect(resolveIsAdmin({ exists: undefined })).toBe(false);
  });
});
