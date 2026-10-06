import { HttpsError } from "firebase-functions/v2/https";
import { describe, expect, it } from "vitest";
import {
  parseAiSettings,
  validateAiSettingsInput,
  validateModelField,
  validateProviderField,
} from "./settings";

/** Asserts a sync function throws the HttpsError code with the field named. */
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

describe("parseAiSettings", () => {
  it("reports missing for a missing doc", () => {
    expect(parseAiSettings(undefined)).toEqual({ status: "missing" });
    expect(parseAiSettings(null)).toEqual({ status: "missing" });
  });

  it("reports invalid for a non-object doc", () => {
    for (const data of ["gemini", 42, []]) {
      const state = parseAiSettings(data);
      expect(state.status).toBe("invalid");
    }
  });

  it("reports invalid for an unknown provider without making one up", () => {
    const unknown = parseAiSettings({
      enabled: true,
      provider: "openai",
      model: "gpt-4",
      dailyLimitPerUser: 10,
    });
    expect(unknown.status).toBe("invalid");
    if (unknown.status === "invalid") {
      expect(unknown.reason).toContain("provider");
    }
    const missing = parseAiSettings({
      enabled: true,
      model: "gemini-2.0-flash",
      dailyLimitPerUser: 10,
    });
    expect(missing.status).toBe("invalid");
  });

  it("reports invalid when the model is missing or blank", () => {
    for (const model of [undefined, "   ", 42]) {
      const state = parseAiSettings({ enabled: true, provider: "gemini", model, dailyLimitPerUser: 10 });
      expect(state.status).toBe("invalid");
      if (state.status === "invalid") {
        expect(state.reason).toContain("model");
      }
    }
  });

  it("reports invalid when enabled is not a boolean", () => {
    const state = parseAiSettings({
      enabled: "yes",
      provider: "gemini",
      model: "m",
      dailyLimitPerUser: 10,
    });
    expect(state.status).toBe("invalid");
    if (state.status === "invalid") {
      expect(state.reason).toContain("enabled");
    }
  });

  it("defaults a missing dailyLimitPerUser to 30", () => {
    expect(parseAiSettings({ enabled: false, provider: "nvidia", model: "meta/llama" })).toEqual({
      status: "ok",
      settings: { enabled: false, provider: "nvidia", model: "meta/llama", dailyLimitPerUser: 30 },
    });
  });

  it("reports invalid for an invalid stored limit", () => {
    for (const dailyLimitPerUser of [0, 501, 1.5, "30", null]) {
      const state = parseAiSettings({
        enabled: true,
        provider: "gemini",
        model: "m",
        dailyLimitPerUser,
      });
      expect(state.status).toBe("invalid");
      if (state.status === "invalid") {
        expect(state.reason).toContain("dailyLimitPerUser");
      }
    }
  });

  it("parses a valid doc and trims the model", () => {
    expect(
      parseAiSettings({
        enabled: true,
        provider: "together",
        model: "  meta-llama/Llama-3  ",
        dailyLimitPerUser: 10,
      }),
    ).toEqual({
      status: "ok",
      settings: {
        enabled: true,
        provider: "together",
        model: "meta-llama/Llama-3",
        dailyLimitPerUser: 10,
      },
    });
  });
});

describe("validateAiSettingsInput", () => {
  const valid = {
    enabled: true,
    provider: "gemini",
    model: "gemini-2.0-flash",
    dailyLimitPerUser: 25,
  };

  it("accepts valid input and trims the model", () => {
    expect(validateAiSettingsInput({ ...valid, model: "  gemini-2.0-flash\n" })).toEqual(valid);
  });

  it("accepts the limit boundaries 1 and 500", () => {
    expect(validateAiSettingsInput({ ...valid, dailyLimitPerUser: 1 }).dailyLimitPerUser).toBe(1);
    expect(validateAiSettingsInput({ ...valid, dailyLimitPerUser: 500 }).dailyLimitPerUser).toBe(
      500,
    );
  });

  it("rejects a non-object body", () => {
    expectInvalidArgument(() => validateAiSettingsInput(undefined), "object");
    expectInvalidArgument(() => validateAiSettingsInput("settings"), "object");
    expectInvalidArgument(() => validateAiSettingsInput([]), "object");
  });

  it("rejects an unknown, missing or non-string provider", () => {
    expectInvalidArgument(() => validateAiSettingsInput({ ...valid, provider: "openai" }), "provider");
    expectInvalidArgument(() => validateAiSettingsInput({ ...valid, provider: undefined }), "provider");
    expectInvalidArgument(() => validateAiSettingsInput({ ...valid, provider: 42 }), "provider");
  });

  it("rejects a missing, blank, over-long or control-char model", () => {
    expectInvalidArgument(() => validateAiSettingsInput({ ...valid, model: undefined }), "model");
    expectInvalidArgument(() => validateAiSettingsInput({ ...valid, model: "   " }), "model");
    expectInvalidArgument(() => validateAiSettingsInput({ ...valid, model: "x".repeat(201) }), "model");
    expectInvalidArgument(() => validateAiSettingsInput({ ...valid, model: "a\nb" }), "model");
    expectInvalidArgument(() => validateAiSettingsInput({ ...valid, model: "ab" }), "model");
    expect(validateAiSettingsInput({ ...valid, model: "x".repeat(200) }).model).toBe(
      "x".repeat(200),
    );
  });

  it("rejects a missing, fractional, out-of-range or non-number limit", () => {
    for (const dailyLimitPerUser of [undefined, 0, 501, 1.5, "30", null]) {
      expectInvalidArgument(
        () => validateAiSettingsInput({ ...valid, dailyLimitPerUser }),
        "dailyLimitPerUser",
      );
    }
  });

  it("rejects a missing or non-boolean enabled flag", () => {
    expectInvalidArgument(() => validateAiSettingsInput({ ...valid, enabled: undefined }), "enabled");
    expectInvalidArgument(() => validateAiSettingsInput({ ...valid, enabled: "true" }), "enabled");
    expectInvalidArgument(() => validateAiSettingsInput({ ...valid, enabled: 1 }), "enabled");
  });
});

describe("shared field validators", () => {
  it("validateProviderField accepts registry ids and rejects the rest", () => {
    expect(validateProviderField("nvidia")).toBe("nvidia");
    expectInvalidArgument(() => validateProviderField("openai"), "provider");
    expectInvalidArgument(() => validateProviderField(undefined), "provider");
  });

  it("validateModelField trims and enforces the same rules as settings input", () => {
    expect(validateModelField("  m  ")).toBe("m");
    expectInvalidArgument(() => validateModelField(""), "model");
    expectInvalidArgument(() => validateModelField("x".repeat(201)), "model");
  });

  it("rejects a pasted page URL with the paste-the-ID message", () => {
    try {
      validateModelField("https://example.com/models/gemini-x");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpsError);
      expect((error as HttpsError).code).toBe("invalid-argument");
      expect((error as HttpsError).message).toBe(
        "Invalid 'model': paste the model ID, not the page URL.",
      );
      return;
    }
    expect.unreachable("expected an invalid-argument HttpsError");
  });

  it("drops a leading models/ prefix", () => {
    expect(validateModelField("models/gemini-2.0-flash")).toBe("gemini-2.0-flash");
    expectInvalidArgument(() => validateModelField("models/"), "model");
  });
});
