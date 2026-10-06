import { describe, expect, it } from "vitest";
import {
  extractProviderMessage,
  redactKey,
  toProviderHttpError,
  type ProviderHttpErrorInput,
} from "./providerErrors";

const FAKE_KEY = "test-key-SECRET-xyz-123";

function map(overrides: Partial<ProviderHttpErrorInput> = {}) {
  return toProviderHttpError({
    providerLabel: "Google Gemini",
    status: 500,
    bodyText: "",
    apiKey: FAKE_KEY,
    ...overrides,
  });
}

describe("toProviderHttpError", () => {
  it("maps 401 and 403 to key-rejected failures", () => {
    for (const status of [401, 403]) {
      const error = map({ status });
      expect(error.code).toBe("failed-precondition");
      expect(error.message).toContain("rejected the API key");
      expect(error.httpStatus).toBe(status);
      expect(error.message).not.toContain(FAKE_KEY);
    }
  });

  it("maps a Gemini 400 with API_KEY_INVALID to key-rejected", () => {
    const error = map({
      status: 400,
      bodyText: JSON.stringify({
        error: { message: "API key not valid.", details: [{ reason: "API_KEY_INVALID" }] },
      }),
    });
    expect(error.code).toBe("failed-precondition");
    expect(error.message).toContain("rejected the API key (HTTP 400)");
  });

  it("maps other 400s to rejected-request with the provider message", () => {
    const error = map({
      status: 400,
      bodyText: JSON.stringify({ error: { message: "Unsupported image." } }),
    });
    expect(error.code).toBe("failed-precondition");
    expect(error.message).toBe("Google Gemini rejected the request: Unsupported image.");
  });

  it("maps 404 with a model to model-not-found, without one to internal", () => {
    const withModel = map({ status: 404, model: "gemini-nope" });
    expect(withModel.code).toBe("failed-precondition");
    expect(withModel.message).toBe("Model `gemini-nope` was not found at `Google Gemini`.");
    const withoutModel = map({ status: 404 });
    expect(withoutModel.code).toBe("internal");
  });

  it("maps 429 to resource-exhausted and 5xx to unavailable", () => {
    expect(map({ status: 429 }).code).toBe("resource-exhausted");
    expect(map({ status: 503 }).code).toBe("unavailable");
  });

  it("maps anything else to internal", () => {
    expect(map({ status: 418 }).code).toBe("internal");
  });
});

describe("extractProviderMessage", () => {
  it("prefers error.message, then message, then detail, then raw text", () => {
    expect(
      extractProviderMessage(JSON.stringify({ error: { message: "nested" } }), FAKE_KEY),
    ).toBe("nested");
    expect(extractProviderMessage(JSON.stringify({ message: "top" }), FAKE_KEY)).toBe("top");
    expect(extractProviderMessage(JSON.stringify({ detail: "det" }), FAKE_KEY)).toBe("det");
    expect(extractProviderMessage("plain failure", FAKE_KEY)).toBe("plain failure");
    expect(extractProviderMessage(JSON.stringify({ nothing: 1 }), FAKE_KEY)).toBe("");
  });

  it("cuts to 300 characters and redacts every copy of the key", () => {
    const long = `oops ${FAKE_KEY} ` + "x".repeat(500) + ` ${FAKE_KEY}`;
    const message = extractProviderMessage(long, FAKE_KEY);
    expect(message.length).toBeLessThanOrEqual(300);
    expect(message).not.toContain(FAKE_KEY);
    expect(message).toContain("[redacted]");
    expect(redactKey(`a${FAKE_KEY}b${FAKE_KEY}c`, FAKE_KEY)).toBe("a[redacted]b[redacted]c");
  });
});
