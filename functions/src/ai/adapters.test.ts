import { HttpsError } from "firebase-functions/v2/https";
import { describe, expect, it } from "vitest";
import {
  buildGeminiRequest,
  buildOpenAiCompatibleRequest,
  extractJsonObject,
  JsonExtractionError,
  parseGeminiResponse,
  parseOpenAiCompatibleResponse,
  runAdapter,
  type AdapterCall,
} from "./adapters";
import type { FetchImpl } from "./modelLists";
import { getProvider, type ProviderDef } from "./providers";

const FAKE_KEY = "test-key-SECRET-xyz-123";

function provider(id: string): ProviderDef {
  const found = getProvider(id);
  if (!found) {
    throw new Error(`${id} missing from registry`);
  }
  return found;
}

function geminiCall(): AdapterCall {
  return {
    provider: provider("gemini"),
    model: "gemini-2.0-flash",
    apiKey: FAKE_KEY,
    image: { mimeType: "image/jpeg", base64: "aGVsbG8=" },
    prompt: "Do it.",
  };
}

function openAiCall(): AdapterCall {
  return {
    provider: provider("together"),
    model: "meta-llama/chat",
    apiKey: FAKE_KEY,
    image: { mimeType: "image/png", base64: "aGVsbG8=" },
    prompt: "Do it.",
  };
}

interface RecordedCall {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

function mockFetch(
  handler: (call: RecordedCall) => { status: number; body: unknown },
  calls: RecordedCall[],
): FetchImpl {
  return (async (url: unknown, init?: { headers?: unknown; body?: unknown }) => {
    const call = {
      url: String(url),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
    };
    calls.push(call);
    const outcome = handler(call);
    return {
      ok: outcome.status >= 200 && outcome.status < 300,
      status: outcome.status,
      json: async () => outcome.body,
      text: async () =>
        typeof outcome.body === "string" ? outcome.body : JSON.stringify(outcome.body),
    } as unknown as Response;
  }) as FetchImpl;
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<HttpsError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(HttpsError);
    expect((error as HttpsError).code).toBe(code);
    return error as HttpsError;
  }
  throw new Error("expected an HttpsError");
}

function expectSyncCode(fn: () => unknown, code: string): HttpsError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpsError);
    expect((error as HttpsError).code).toBe(code);
    return error as HttpsError;
  }
  throw new Error("expected an HttpsError");
}

describe("buildGeminiRequest", () => {
  it("strips models/, encodes the id, and sends the key in the header", () => {
    const request = buildGeminiRequest({ ...geminiCall(), model: "models/gemini-2.0-flash" });
    expect(request.url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    );
    expect(request.url).not.toContain(FAKE_KEY);
    expect(request.headers).toMatchObject({ "x-goog-api-key": FAKE_KEY });
  });

  it("carries the prompt, the image and a JSON response schema", () => {
    const request = buildGeminiRequest(geminiCall());
    const body = request.body as Record<string, unknown>;
    expect(body["systemInstruction"]).toEqual({ parts: [{ text: "Do it." }] });
    const contents = body["contents"] as Array<Record<string, unknown>>;
    expect(contents).toHaveLength(1);
    const parts = contents[0]?.["parts"] as Array<Record<string, unknown>>;
    expect(parts[1]).toEqual({ inlineData: { mimeType: "image/jpeg", data: "aGVsbG8=" } });
    const config = body["generationConfig"] as Record<string, unknown>;
    expect(config["temperature"]).toBe(0);
    expect(config["responseMimeType"]).toBe("application/json");
    const schema = config["responseSchema"] as Record<string, unknown>;
    expect(Object.keys(schema["properties"] as object).sort()).toEqual([
      "category",
      "currency",
      "date",
      "description",
      "merchant",
      "total",
    ]);
  });

  it("sets no small maxOutputTokens", () => {
    const request = buildGeminiRequest(geminiCall());
    const config = (request.body as Record<string, unknown>)["generationConfig"] as Record<
      string,
      unknown
    >;
    expect("maxOutputTokens" in config).toBe(false);
  });
});

describe("parseGeminiResponse", () => {
  const ok = {
    candidates: [
      {
        content: { parts: [{ text: '{"total": 5}' }] },
        finishReason: "STOP",
      },
    ],
  };

  it("returns the joined text on STOP", () => {
    expect(parseGeminiResponse(ok, "Google Gemini")).toBe('{"total": 5}');
  });

  it("throws on a block, a cut-off, and empty or missing answers", () => {
    const blocked = expectSyncCode(
      () =>
        parseGeminiResponse(
          { promptFeedback: { blockReason: "SAFETY" }, candidates: [] },
          "Google Gemini",
        ),
      "failed-precondition",
    );
    expect(blocked.message).toContain("blocked: SAFETY");
    const cutOff = expectSyncCode(
      () =>
        parseGeminiResponse(
          { candidates: [{ content: { parts: [{ text: "" }] }, finishReason: "MAX_TOKENS" }] },
          "Google Gemini",
        ),
      "failed-precondition",
    );
    expect(cutOff.message).toContain("MAX_TOKENS");
    expectSyncCode(() => parseGeminiResponse({ candidates: [] }, "Google Gemini"), "internal");
    expectSyncCode(
      () =>
        parseGeminiResponse(
          { candidates: [{ content: { parts: [{ text: "  " }] }, finishReason: "STOP" }] },
          "Google Gemini",
        ),
      "internal",
    );
    expectSyncCode(() => parseGeminiResponse(null, "Google Gemini"), "internal");
  });
});

describe("buildOpenAiCompatibleRequest", () => {
  it("has no system message, a data URI, no response_format and temperature 0", () => {
    const request = buildOpenAiCompatibleRequest(openAiCall());
    expect(request.url).toBe("https://api.together.ai/v1/chat/completions");
    expect(request.headers).toMatchObject({ Authorization: `Bearer ${FAKE_KEY}` });
    const body = request.body as Record<string, unknown>;
    expect(body["model"]).toBe("meta-llama/chat");
    expect(body["temperature"]).toBe(0);
    expect(body["max_tokens"]).toBe(2048);
    expect("response_format" in body).toBe(false);
    const messages = body["messages"] as Array<Record<string, unknown>>;
    expect(messages.map((message) => message["role"])).toEqual(["user"]);
    const content = messages[0]?.["content"] as Array<Record<string, unknown>>;
    expect(content[0]).toEqual({ type: "text", text: "Do it." });
    expect(content[1]).toEqual({
      type: "image_url",
      image_url: { url: "data:image/png;base64,aGVsbG8=" },
    });
  });
});

describe("parseOpenAiCompatibleResponse", () => {
  it("reads string content", () => {
    expect(
      parseOpenAiCompatibleResponse(
        { choices: [{ message: { content: '{"total": 5}' }, finish_reason: "stop" }] },
        "Together.ai",
      ),
    ).toBe('{"total": 5}');
  });

  it("joins text parts of array content", () => {
    expect(
      parseOpenAiCompatibleResponse(
        {
          choices: [
            {
              message: {
                content: [
                  { type: "text", text: '{"to' },
                  { type: "image_url", image_url: {} },
                  { type: "text", text: 'tal": 5}' },
                ],
              },
              finish_reason: "stop",
            },
          ],
        },
        "Together.ai",
      ),
    ).toBe('{"total": 5}');
  });

  it("throws a cut-off error on length and internal on missing content", () => {
    const cutOff = expectSyncCode(
      () =>
        parseOpenAiCompatibleResponse(
          { choices: [{ message: { content: "half" }, finish_reason: "length" }] },
          "Together.ai",
        ),
      "failed-precondition",
    );
    expect(cutOff.message).toContain("cut off");
    expectSyncCode(() => parseOpenAiCompatibleResponse({ choices: [] }, "Together.ai"), "internal");
    expectSyncCode(
      () =>
        parseOpenAiCompatibleResponse(
          { choices: [{ message: {}, finish_reason: "stop" }] },
          "Together.ai",
        ),
      "internal",
    );
  });
});

describe("extractJsonObject", () => {
  it("strips code fences", () => {
    expect(extractJsonObject('```json\n{"total": 5}\n```')).toEqual({ total: 5 });
  });

  it("strips think blocks, even with braces inside", () => {
    expect(extractJsonObject('<think>{"total": 999}</think>\n{"total": 5}')).toEqual({ total: 5 });
  });

  it("finds the object in prose before and after", () => {
    expect(extractJsonObject('Sure! Here it is: {"total": 5} hope that helps.')).toEqual({
      total: 5,
    });
  });

  it("respects braces inside strings and escapes", () => {
    expect(extractJsonObject('{"a": "brace } in { string \\"q\\""}')).toEqual({
      a: 'brace } in { string "q"',
    });
  });

  it("throws internal with the message and keeps the raw text", () => {
    try {
      extractJsonObject("just prose, no object at all");
    } catch (error) {
      expect(error).toBeInstanceOf(JsonExtractionError);
      expect((error as HttpsError).code).toBe("internal");
      expect((error as HttpsError).message).toBe("The model's answer had no JSON");
      expect((error as JsonExtractionError).rawText).toBe("just prose, no object at all");
      return;
    }
    expect.unreachable("expected a JsonExtractionError");
  });

  it("skips an invalid first candidate for a later valid one", () => {
    expect(extractJsonObject("{oops} {\"ok\":true}")).toEqual({ ok: true });
  });
});

describe("runAdapter", () => {
  const geminiOk = {
    candidates: [
      { content: { parts: [{ text: '{"total": 5}' }] }, finishReason: "STOP" },
    ],
  };

  it("runs the Gemini path by kind and returns text plus status", async () => {
    const calls: RecordedCall[] = [];
    const fetchImpl = mockFetch(() => ({ status: 200, body: geminiOk }), calls);
    const result = await runAdapter(geminiCall(), fetchImpl);
    expect(result).toEqual({ rawText: '{"total": 5}', httpStatus: 200 });
    expect(calls[0]?.url).toContain(":generateContent");
  });

  it("runs the OpenAI-compatible path by kind", async () => {
    const calls: RecordedCall[] = [];
    const fetchImpl = mockFetch(
      () => ({
        status: 200,
        body: { choices: [{ message: { content: '{"total": 5}' }, finish_reason: "stop" }] },
      }),
      calls,
    );
    const result = await runAdapter(openAiCall(), fetchImpl);
    expect(result.rawText).toBe('{"total": 5}');
    expect(calls[0]?.url).toBe("https://api.together.ai/v1/chat/completions");
  });

  it("maps a 404 to the model-not-found message", async () => {
    const fetchImpl = mockFetch(() => ({ status: 404, body: { error: "nope" } }), []);
    const error = await expectCode(runAdapter(openAiCall(), fetchImpl), "failed-precondition");
    expect(error.message).toBe("Model `meta-llama/chat` was not found at `Together.ai`.");
  });

  it("redacts an echoed key from the provider message", async () => {
    const fetchImpl = mockFetch(
      () => ({ status: 400, body: { error: { message: `bad key ${FAKE_KEY} here` } } }),
      [],
    );
    const error = await expectCode(runAdapter(openAiCall(), fetchImpl), "failed-precondition");
    expect(error.message).not.toContain(FAKE_KEY);
    expect(error.message).toContain("[redacted]");
  });

  it("maps a timeout to deadline-exceeded", async () => {
    const hanging = ((...args: [unknown, { signal?: AbortSignal }?]) => {
      const signal = args[1]?.signal;
      return new Promise<never>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    }) as unknown as FetchImpl;
    await expectCode(runAdapter(geminiCall(), hanging, 20), "deadline-exceeded");
  });

  it("maps a stalled body read to deadline-exceeded", async () => {
    // Models real fetch: an abort rejects a pending body read.
    const stalledBody = ((...args: [unknown, { signal?: AbortSignal }?]) => {
      const signal = args[1]?.signal;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          new Promise<never>((_resolve, reject) => {
            signal?.addEventListener("abort", () => reject(new Error("aborted")));
          }),
        text: async () => "",
      } as unknown as Response);
    }) as unknown as FetchImpl;
    await expectCode(runAdapter(geminiCall(), stalledBody, 20), "deadline-exceeded");
  });
});
