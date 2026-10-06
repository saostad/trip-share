import { HttpsError } from "firebase-functions/v2/https";
import { afterEach, describe, expect, it } from "vitest";
import {
  getProvider,
  getProviderKey,
  INVALID_KEYS_MESSAGE,
  isKeyConfigured,
  parseProviderKeys,
  PROVIDERS,
  type ProviderDef,
} from "./providers";

function provider(id: string): ProviderDef {
  const found = getProvider(id);
  if (!found) {
    throw new Error(`${id} missing from registry`);
  }
  return found;
}

describe("provider registry", () => {
  it("has unique ids", () => {
    const ids = PROVIDERS.map((provider) => provider.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["gemini", "together", "nvidia"]);
  });

  it("gives every provider an https base URL and model help", () => {
    for (const provider of PROVIDERS) {
      expect(provider.baseUrl).toMatch(/^https:\/\//);
      expect(provider.label.trim()).not.toBe("");
      expect(provider.modelHelp.trim()).not.toBe("");
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
  it.each([["undefined", undefined], ["empty", ""], ["whitespace", "  "]])(
    "is false for %s",
    (_label, value) => {
      expect(isKeyConfigured(value)).toBe(false);
    },
  );

  it("is true for any non-blank string, including none", () => {
    expect(isKeyConfigured("AIzaSy-test-key")).toBe(true);
    // The `none` placeholder is gone: an unused provider has no entry at all.
    expect(isKeyConfigured("none")).toBe(true);
  });
});

describe("parseProviderKeys", () => {
  it("reads an empty value as no keys", () => {
    for (const raw of [undefined, "", "   "]) {
      expect(parseProviderKeys(raw)).toEqual({ status: "ok", keys: {}, ignoredNames: [] });
    }
  });

  it("parses known entries and trims them", () => {
    expect(parseProviderKeys('{"gemini":"  k1  ","nvidia":"k2"}')).toEqual({
      status: "ok",
      keys: { gemini: "k1", nvidia: "k2" },
      ignoredNames: [],
    });
  });

  it("treats an empty string as no key for that provider", () => {
    expect(parseProviderKeys('{"gemini":"  ","together":"k"}')).toEqual({
      status: "ok",
      keys: { together: "k" },
      ignoredNames: [],
    });
  });

  it("reports unknown names and keeps their values out", () => {
    const parsed = parseProviderKeys('{"togther":"typo-value","gemini":"k"}');
    expect(parsed).toEqual({
      status: "ok",
      keys: { gemini: "k" },
      ignoredNames: ["togther"],
    });
    expect(JSON.stringify(parsed)).not.toContain("typo-value");
  });

  it("rejects anything that isn't a JSON object", () => {
    for (const raw of ["not json{", "[]", '"str"', "42", "null"]) {
      expect(parseProviderKeys(raw)).toEqual({ status: "invalid" });
    }
  });

  it("rejects a known provider's non-string entry", () => {
    expect(parseProviderKeys('{"gemini":42}')).toEqual({ status: "invalid" });
    expect(parseProviderKeys('{"gemini":null}')).toEqual({ status: "invalid" });
    expect(parseProviderKeys('{"gemini":{"nested":true}}')).toEqual({ status: "invalid" });
  });
});

describe("getProviderKey", () => {
  const saved = process.env["AI_PROVIDER_KEYS"];

  afterEach(() => {
    if (saved === undefined) {
      delete process.env["AI_PROVIDER_KEYS"];
    } else {
      process.env["AI_PROVIDER_KEYS"] = saved;
    }
  });

  it("returns the trimmed key, or undefined when unset", () => {
    process.env["AI_PROVIDER_KEYS"] = '{"gemini":"  k1  "}';
    expect(getProviderKey(provider("gemini"))).toBe("k1");
    expect(getProviderKey(provider("nvidia"))).toBeUndefined();
  });

  it("throws without the secret content when the secret is invalid", () => {
    const raw = "{oops-not-json!!";
    process.env["AI_PROVIDER_KEYS"] = raw;
    try {
      getProviderKey(provider("gemini"));
    } catch (error) {
      expect(error).toBeInstanceOf(HttpsError);
      expect((error as HttpsError).code).toBe("failed-precondition");
      expect((error as HttpsError).message).toBe(INVALID_KEYS_MESSAGE);
      expect((error as HttpsError).message).not.toContain(raw);
      return;
    }
    expect.unreachable("expected a failed-precondition HttpsError");
  });
});
