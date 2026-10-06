import { describe, expect, it } from "vitest";
import { getProvider, isKeyConfigured, PROVIDERS } from "./providers";

describe("provider registry", () => {
  it("has unique ids", () => {
    const ids = PROVIDERS.map((provider) => provider.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["gemini", "together", "nvidia"]);
  });

  it("gives every provider a secret and an https base URL", () => {
    for (const provider of PROVIDERS) {
      expect(provider.secret).toBeDefined();
      expect(provider.baseUrl).toMatch(/^https:\/\//);
      expect(provider.label.trim()).not.toBe("");
    }
  });

  it("uses the expected base URLs", () => {
    expect(getProvider("gemini")?.baseUrl).toBe("https://generativelanguage.googleapis.com/v1beta");
    expect(getProvider("together")?.baseUrl).toBe("https://api.together.ai/v1");
    expect(getProvider("nvidia")?.baseUrl).toBe("https://integrate.api.nvidia.com/v1");
  });

  it("returns undefined for unknown provider ids", () => {
    expect(getProvider("openai")).toBeUndefined();
    expect(getProvider("")).toBeUndefined();
  });
});

describe("isKeyConfigured", () => {
  it.each([
    ["undefined", undefined],
    ["empty", ""],
    ["whitespace", "  "],
    ["lowercase none", "none"],
    ["uppercase NONE", "NONE"],
    ["mixed-case None with spaces", "  None\t"],
  ])("is false for %s", (_label, value) => {
    expect(isKeyConfigured(value)).toBe(false);
  });

  it("is true for a real-looking key", () => {
    expect(isKeyConfigured("AIzaSy-test-key")).toBe(true);
  });

  it("matches 'none' exactly, not as a substring", () => {
    expect(isKeyConfigured("nonexistent")).toBe(true);
  });
});
