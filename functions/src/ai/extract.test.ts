import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FetchImpl } from "./modelLists";
import { getProvider, type ProviderDef } from "./providers";
import {
  checkTripAccess,
  requireUsableSettings,
  runTestPipeline,
  withExtractionLog,
  type PipelineInput,
} from "./extract";

vi.mock("firebase-functions/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn() },
}));

const info = vi.mocked(logger.info);
const warn = vi.mocked(logger.warn);

const FAKE_KEY = "test-key-SECRET-xyz-123";

function provider(id: string): ProviderDef {
  const found = getProvider(id);
  if (!found) {
    throw new Error(`${id} missing from registry`);
  }
  return found;
}

function testInput(): PipelineInput {
  return {
    provider: provider("together"),
    model: "meta-llama/chat",
    apiKey: FAKE_KEY,
    image: { mimeType: "image/jpeg", base64: "aGVsbG8=" },
    categories: [{ id: "food", label: "Food" }],
  };
}

function mockFetch(body: unknown, status = 200): FetchImpl {
  return (async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  }) as unknown as Response) as FetchImpl;
}

describe("checkTripAccess", () => {
  it("admits the owner and collaborators", () => {
    expect(
      checkTripAccess({ ownerId: "u", collaboratorIds: [], archived: false }, "u"),
    ).toEqual({ archived: false });
    expect(
      checkTripAccess({ ownerId: "o", collaboratorIds: ["u"], archived: false }, "u"),
    ).toEqual({ archived: false });
  });

  it("reports the archived flag for members", () => {
    expect(checkTripAccess({ ownerId: "u", collaboratorIds: [], archived: true }, "u")).toEqual({
      archived: true,
    });
  });

  it("denies strangers, missing trips and malformed docs with the same error", () => {
    const cases: unknown[] = [
      undefined,
      null,
      "trip",
      [],
      {},
      { ownerId: "o", collaboratorIds: [] },
      { ownerId: "o" },
      { ownerId: "o", collaboratorIds: "u" },
    ];
    const messages = new Set<string>();
    for (const data of cases) {
      try {
        checkTripAccess(data, "u");
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe("permission-denied");
        messages.add((error as HttpsError).message);
        continue;
      }
      expect.unreachable("expected a permission-denied HttpsError");
    }
    expect(messages.size).toBe(1);
  });
});

describe("requireUsableSettings", () => {
  it("returns enabled settings", () => {
    const settings = { enabled: true, provider: "gemini", model: "m", dailyLimitPerUser: 30 } as const;
    expect(requireUsableSettings({ status: "ok", settings: { ...settings } })).toEqual(settings);
  });

  it("gives each unusable state its own message", () => {
    const cases = [
      [{ status: "missing" }, "Receipt auto-fill isn't set up"],
      [{ status: "invalid", reason: "Invalid 'model'." }, "AI settings are invalid; ask an admin"],
      [
        {
          status: "ok",
          settings: { enabled: false, provider: "gemini", model: "m", dailyLimitPerUser: 30 },
        },
        "Receipt auto-fill is turned off",
      ],
    ] as const;
    for (const [state, message] of cases) {
      try {
        requireUsableSettings(state);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe("failed-precondition");
        expect((error as HttpsError).message).toBe(message);
        continue;
      }
      expect.unreachable("expected a failed-precondition HttpsError");
    }
  });
});

describe("runTestPipeline", () => {
  it("returns fields, raw text and latency on success", async () => {
    const fetchImpl = mockFetch({
      choices: [
        {
          message: { content: '{"total": 9.5, "category": "food"}' },
          finish_reason: "stop",
        },
      ],
    });
    const result = await runTestPipeline(testInput(), { fetchImpl });
    expect(result.fields).toMatchObject({ amount: 9.5, category: "food" });
    expect(result.rawText).toContain('"total"');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect("error" in result).toBe(false);
  });

  it("returns rawText and error instead of throwing when the answer has no JSON", async () => {
    const fetchImpl = mockFetch({
      choices: [{ message: { content: "I cannot read this photo, sorry." }, finish_reason: "stop" }],
    });
    const result = await runTestPipeline(testInput(), { fetchImpl });
    expect(result).toMatchObject({
      fields: null,
      missing: [],
      rawText: "I cannot read this photo, sorry.",
      error: "The model's answer had no JSON",
    });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("cuts rawText to 2000 characters", async () => {
    const long = `{"total": 1, "pad": "${"x".repeat(3000)}"}`;
    const fetchImpl = mockFetch({
      choices: [{ message: { content: long }, finish_reason: "stop" }],
    });
    const result = await runTestPipeline(testInput(), { fetchImpl });
    expect(result.rawText).toHaveLength(2000);
  });

  it("lets provider errors throw", async () => {
    const fetchImpl = mockFetch({ error: { message: "down" } }, 500);
    await expect(runTestPipeline(testInput(), { fetchImpl })).rejects.toMatchObject({
      code: "unavailable",
    });
  });
});

describe("withExtractionLog", () => {
  beforeEach(() => {
    info.mockClear();
    warn.mockClear();
  });

  it("writes exactly one info line on success", async () => {
    const result = await withExtractionLog("extractReceipt", "uid-1", async (log) => {
      log.provider = "gemini";
      log.model = "m";
      log.httpStatus = 200;
      return "done";
    });
    expect(result).toBe("done");
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    const line = info.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(line).sort()).toEqual([
      "fn",
      "httpStatus",
      "latencyMs",
      "model",
      "outcome",
      "provider",
      "uid",
    ]);
    expect(line).toMatchObject({
      fn: "extractReceipt",
      uid: "uid-1",
      provider: "gemini",
      model: "m",
      outcome: "ok",
      httpStatus: 200,
    });
    expect(typeof line["latencyMs"]).toBe("number");
  });

  it("writes exactly one warn line with the error code on failure", async () => {
    await expect(
      withExtractionLog("testReceiptExtraction", "uid-2", async () => {
        throw new HttpsError("resource-exhausted", "cap");
      }),
    ).rejects.toMatchObject({ code: "resource-exhausted" });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(info).not.toHaveBeenCalled();
    const line = warn.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(line).toMatchObject({ fn: "testReceiptExtraction", uid: "uid-2", outcome: "resource-exhausted" });
    expect("httpStatus" in line).toBe(false);
  });

  it("reads the HTTP status off provider errors", async () => {
    const failure = new HttpsError("unavailable", "down") as HttpsError & { httpStatus: number };
    failure.httpStatus = 503;
    await expect(
      withExtractionLog("extractReceipt", "uid-1", async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    const line = warn.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(line).toMatchObject({ outcome: "unavailable", httpStatus: 503 });
  });
});
