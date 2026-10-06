import { HttpsError } from "firebase-functions/v2/https";
import { describe, expect, it } from "vitest";
import {
  fetchProviderModelIds,
  parseGeminiModelsPage,
  parseOpenAiCompatibleModels,
  toListedModels,
  type FetchImpl,
} from "./modelLists";
import { getProvider, type ProviderDef } from "./providers";

const FAKE_KEY = "test-key-SECRET-xyz-123";

function gemini(): ProviderDef {
  const provider = getProvider("gemini");
  if (!provider) {
    throw new Error("gemini missing from registry");
  }
  return provider;
}

function together(): ProviderDef {
  const provider = getProvider("together");
  if (!provider) {
    throw new Error("together missing from registry");
  }
  return provider;
}

function nvidia(): ProviderDef {
  const provider = getProvider("nvidia");
  if (!provider) {
    throw new Error("nvidia missing from registry");
  }
  return provider;
}

interface RecordedCall {
  url: string;
  headers: Record<string, string>;
}

function mockFetch(
  handler: (call: RecordedCall) => { status: number; body: unknown } | Promise<never>,
  calls: RecordedCall[],
): FetchImpl {
  return (async (url: unknown, init?: { headers?: unknown }) => {
    const call = { url: String(url), headers: (init?.headers ?? {}) as Record<string, string> };
    calls.push(call);
    const outcome = handler(call);
    if (outcome instanceof Promise) {
      await outcome;
      throw new Error("unreachable");
    }
    return {
      ok: outcome.status >= 200 && outcome.status < 300,
      status: outcome.status,
      json: async () => outcome.body,
      text: async () =>
        typeof outcome.body === "string" ? outcome.body : JSON.stringify(outcome.body),
    } as unknown as Response;
  }) as FetchImpl;
}

async function expectHttpsError(promise: Promise<unknown>, code: string): Promise<HttpsError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(HttpsError);
    expect((error as HttpsError).code).toBe(code);
    return error as HttpsError;
  }
  throw new Error("expected an HttpsError");
}

const geminiPage1 = {
  models: [
    {
      name: "models/gemini-2.0-flash",
      displayName: "Gemini 2.0 Flash",
      supportedGenerationMethods: ["generateContent", "countTokens"],
    },
    {
      name: "models/embedding-001",
      displayName: "Embedding 001",
      supportedGenerationMethods: ["embedContent"],
    },
    { name: "no-prefix", supportedGenerationMethods: ["generateContent"] },
    { name: "models/", supportedGenerationMethods: ["generateContent"] },
    { name: "models/no-methods" },
    null,
  ],
  nextPageToken: "token-abc",
};

const geminiPage2 = {
  models: [
    {
      name: "models/gemini-1.5-pro",
      displayName: "Gemini 1.5 Pro",
      supportedGenerationMethods: ["generateContent"],
    },
  ],
};

// Shape source: Together's GET /v1/models returns a bare JSON array
// (OpenAPI schema `ModelInfoList: type: array`); each entry carries a `type`
// such as "chat" or "embedding". There is no {object, data} envelope.
const togetherBody = [
  { id: "meta-llama/Llama-3-8b-chat", type: "chat" },
  { id: "embed-model", type: "embedding" },
  { id: "another-chat", type: "chat" },
  { id: "", type: "chat" },
  { id: "untyped" },
  null,
];

// Shape source: NVIDIA's public GET /v1/models returns
// {object: "list", data: [{id, object, created, owned_by}]} (checked against
// the live endpoint). Entries have no `type` field.
const nvidiaBody = {
  object: "list",
  data: [
    { id: "meta/llama-3.2-11b-vision-instruct", object: "model", created: 1727790000, owned_by: "meta" },
    { id: "nvidia/nv-embedqa-e5-v5", object: "model", created: 1727790000, owned_by: "nvidia" },
    { id: "", object: "model", created: 1727790000, owned_by: "nvidia" },
    null,
  ],
};

describe("parseGeminiModelsPage", () => {
  it("keeps generateContent models and strips the models/ prefix", () => {
    const parsed = parseGeminiModelsPage(geminiPage1, "Google Gemini");
    expect(parsed.ids).toEqual(["gemini-2.0-flash"]);
    expect(parsed.nextPageToken).toBe("token-abc");
  });

  it("returns no token on the last page", () => {
    const parsed = parseGeminiModelsPage(geminiPage2, "Google Gemini");
    expect(parsed.ids).toEqual(["gemini-1.5-pro"]);
    expect(parsed.nextPageToken).toBeUndefined();
  });

  it("throws internal on an unexpected envelope", () => {
    for (const body of [null, [], "models", { models: "nope" }]) {
      try {
        parseGeminiModelsPage(body, "Google Gemini");
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe("internal");
        continue;
      }
      expect.unreachable("expected an internal HttpsError");
    }
  });
});

describe("parseOpenAiCompatibleModels", () => {
  it("keeps only chat models for Together", () => {
    expect(parseOpenAiCompatibleModels(togetherBody, "Together.ai", true)).toEqual([
      "meta-llama/Llama-3-8b-chat",
      "another-chat",
    ]);
  });

  it("keeps everything with an id for NVIDIA", () => {
    expect(parseOpenAiCompatibleModels(nvidiaBody, "NVIDIA", false)).toEqual([
      "meta/llama-3.2-11b-vision-instruct",
      "nvidia/nv-embedqa-e5-v5",
    ]);
  });

  it("reads an empty array or a missing data key as an empty list", () => {
    expect(parseOpenAiCompatibleModels([], "Together.ai", true)).toEqual([]);
    expect(parseOpenAiCompatibleModels({}, "NVIDIA", false)).toEqual([]);
  });

  it("throws internal on an unexpected envelope", () => {
    for (const body of [null, "models", 42, { data: "nope" }]) {
      try {
        parseOpenAiCompatibleModels(body, "NVIDIA", false);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe("internal");
        continue;
      }
      expect.unreachable("expected an internal HttpsError");
    }
  });
});

describe("toListedModels", () => {
  it("dedupes and sorts by id with labels mirroring ids", () => {
    expect(toListedModels(["b-model", "a-model", "b-model"])).toEqual([
      { id: "a-model", label: "a-model" },
      { id: "b-model", label: "b-model" },
    ]);
  });
});

describe("fetchProviderModelIds", () => {
  it("pages through Gemini results until the token runs out", async () => {
    const calls: RecordedCall[] = [];
    const fetchImpl = mockFetch((call) => {
      if (call.url.includes("pageToken=")) {
        return { status: 200, body: geminiPage2 };
      }
      return { status: 200, body: geminiPage1 };
    }, calls);
    const ids = await fetchProviderModelIds(gemini(), FAKE_KEY, fetchImpl);
    expect(ids).toEqual(["gemini-2.0-flash", "gemini-1.5-pro"]);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.url).toContain("pageToken=token-abc");
  });

  it("sends the Gemini key in the header, never in the URL", async () => {
    const calls: RecordedCall[] = [];
    const fetchImpl = mockFetch(() => ({ status: 200, body: geminiPage2 }), calls);
    await fetchProviderModelIds(gemini(), FAKE_KEY, fetchImpl);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).not.toContain(FAKE_KEY);
    expect(calls[0]?.url).not.toContain("key=");
    expect(calls[0]?.headers).toMatchObject({ "x-goog-api-key": FAKE_KEY });
  });

  it("sends the Together key as a Bearer token", async () => {
    const calls: RecordedCall[] = [];
    const fetchImpl = mockFetch(() => ({ status: 200, body: togetherBody }), calls);
    const ids = await fetchProviderModelIds(together(), FAKE_KEY, fetchImpl);
    expect(ids).toEqual(["meta-llama/Llama-3-8b-chat", "another-chat"]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.together.ai/v1/models");
    expect(calls[0]?.headers).toMatchObject({ Authorization: `Bearer ${FAKE_KEY}` });
  });

  it("keeps every NVIDIA model", async () => {
    const fetchImpl = mockFetch(() => ({ status: 200, body: nvidiaBody }), []);
    const ids = await fetchProviderModelIds(nvidia(), FAKE_KEY, fetchImpl);
    expect(ids).toEqual(["meta/llama-3.2-11b-vision-instruct", "nvidia/nv-embedqa-e5-v5"]);
  });

  it("maps 401 and 403 to key-rejected failures", async () => {
    for (const status of [401, 403]) {
      const fetchImpl = mockFetch(() => ({ status, body: { error: "bad key" } }), []);
      const error = await expectHttpsError(
        fetchProviderModelIds(nvidia(), FAKE_KEY, fetchImpl),
        "failed-precondition",
      );
      expect(error.message).toContain("rejected the API key");
    }
  });

  it("maps rate limits, outages and network failures without the key", async () => {
    const failing: FetchImpl = (() =>
      Promise.reject(new Error("socket hang up"))) as FetchImpl;
    const cases: Array<[FetchImpl, string]> = [
      [mockFetch(() => ({ status: 429, body: {} }), []), "resource-exhausted"],
      [mockFetch(() => ({ status: 500, body: {} }), []), "unavailable"],
      [failing, "unavailable"],
    ];
    for (const [fetchImpl, code] of cases) {
      const error = await expectHttpsError(
        fetchProviderModelIds(together(), FAKE_KEY, fetchImpl),
        code,
      );
      expect(error.message).not.toContain(FAKE_KEY);
    }
  });

  it("maps a timeout to deadline-exceeded", async () => {
    const hanging: FetchImpl = ((...args: [unknown, { signal?: AbortSignal }?]) => {
      const signal = args[1]?.signal;
      return new Promise<never>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    }) as unknown as FetchImpl;
    const error = await expectHttpsError(
      fetchProviderModelIds(gemini(), FAKE_KEY, hanging, 20),
      "deadline-exceeded",
    );
    expect(error.message).not.toContain(FAKE_KEY);
  });

  it("reads a 200 without a models key as an empty list", async () => {
    const fetchImpl = mockFetch(() => ({ status: 200, body: { error: "nothing here" } }), []);
    await expect(fetchProviderModelIds(gemini(), FAKE_KEY, fetchImpl)).resolves.toEqual([]);
  });

  it("never leaks the key into any thrown message or request URL", async () => {
    const fetchImpl = mockFetch(() => ({ status: 200, body: { models: "unexpected-shape" } }), []);
    const parseError = await expectHttpsError(
      fetchProviderModelIds(gemini(), FAKE_KEY, fetchImpl),
      "internal",
    );
    expect(parseError.message).not.toContain(FAKE_KEY);
    expect(parseError.message).not.toContain("key=");

    const cases: Array<[number, string]> = [
      [401, "failed-precondition"],
      [403, "failed-precondition"],
      [429, "resource-exhausted"],
      [500, "unavailable"],
    ];
    for (const [status, code] of cases) {
      const failing = mockFetch(() => ({ status, body: { key: FAKE_KEY } }), []);
      const error = await expectHttpsError(fetchProviderModelIds(gemini(), FAKE_KEY, failing), code);
      expect(error.message).not.toContain(FAKE_KEY);
      expect(error.message).not.toContain("key=");
    }
  });
});
