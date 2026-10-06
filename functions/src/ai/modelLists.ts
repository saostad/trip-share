import { HttpsError } from "firebase-functions/v2/https";
import type { ProviderDef } from "./providers";

export interface ListedModel {
  readonly id: string;
  readonly label: string;
}

/** Injectable `fetch`, so tests can run without network. Defaults to global fetch. */
export type FetchImpl = typeof fetch;

const MODELS_TIMEOUT_MS = 15_000;
const GEMINI_PAGE_SIZE = 100;
const MAX_GEMINI_PAGES = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses one Gemini `GET /models` page. Pure: no network.
 * Malformed entries are skipped; an unrecognized envelope throws `internal`.
 */
export function parseGeminiModelsPage(
  body: unknown,
  providerLabel: string,
): { ids: string[]; nextPageToken: string | undefined } {
  if (!isRecord(body)) {
    throw new HttpsError("internal", `${providerLabel} returned an unexpected model list.`);
  }
  const ids: string[] = [];
  const models = body["models"];
  if (models !== undefined) {
    if (!Array.isArray(models)) {
      throw new HttpsError("internal", `${providerLabel} returned an unexpected model list.`);
    }
    for (const entry of models) {
      if (!isRecord(entry)) {
        continue;
      }
      const name = entry["name"];
      const methods = entry["supportedGenerationMethods"];
      if (
        typeof name !== "string" ||
        !name.startsWith("models/") ||
        !Array.isArray(methods) ||
        !methods.includes("generateContent")
      ) {
        continue;
      }
      const id = name.slice("models/".length);
      if (id !== "") {
        ids.push(id);
      }
    }
  }
  const token = body["nextPageToken"];
  return {
    ids,
    nextPageToken: typeof token === "string" && token !== "" ? token : undefined,
  };
}

/**
 * Parses an OpenAI-compatible `GET /models` body (Together, NVIDIA). Pure.
 * Malformed entries are skipped; an unrecognized envelope throws `internal`.
 * With `chatOnly`, only entries with `type === "chat"` are kept.
 */
export function parseOpenAiCompatibleModels(
  body: unknown,
  providerLabel: string,
  chatOnly: boolean,
): string[] {
  if (!isRecord(body)) {
    throw new HttpsError("internal", `${providerLabel} returned an unexpected model list.`);
  }
  const data = body["data"];
  if (data === undefined) {
    return [];
  }
  if (!Array.isArray(data)) {
    throw new HttpsError("internal", `${providerLabel} returned an unexpected model list.`);
  }
  const ids: string[] = [];
  for (const entry of data) {
    if (!isRecord(entry)) {
      continue;
    }
    const id = entry["id"];
    if (typeof id !== "string" || id === "") {
      continue;
    }
    if (chatOnly && entry["type"] !== "chat") {
      continue;
    }
    ids.push(id);
  }
  return ids;
}

/** Dedupes and sorts ids by id. Labels mirror ids: providers offer no display names. */
export function toListedModels(ids: readonly string[]): ListedModel[] {
  return [...new Set(ids)].sort().map((id) => ({ id, label: id }));
}

function toHttpError(providerLabel: string, status: number): HttpsError {
  if (status === 401 || status === 403) {
    return new HttpsError(
      "failed-precondition",
      `${providerLabel} rejected the API key (HTTP ${status}). Check the key and try again.`,
    );
  }
  if (status === 429) {
    return new HttpsError(
      "resource-exhausted",
      `${providerLabel} rate-limited the request (HTTP 429). Try again later.`,
    );
  }
  if (status >= 500) {
    return new HttpsError(
      "unavailable",
      `${providerLabel} is unavailable (HTTP ${status}). Try again later.`,
    );
  }
  return new HttpsError(
    "internal",
    `${providerLabel} returned an unexpected error (HTTP ${status}).`,
  );
}

/**
 * GETs a JSON body with a 15s timeout. Error messages carry only the provider
 * label, the HTTP status and a safe interpretation — never the key, the
 * request URL (Gemini puts the key in it), headers or the response body.
 */
async function fetchJson(
  url: string,
  headers: Record<string, string>,
  providerLabel: string,
  fetchImpl: FetchImpl,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(url, { signal: controller.signal, headers });
  } catch {
    if (controller.signal.aborted) {
      throw new HttpsError("deadline-exceeded", `${providerLabel} did not respond in time.`);
    }
    throw new HttpsError("unavailable", `${providerLabel} could not be reached.`);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw toHttpError(providerLabel, response.status);
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new HttpsError("internal", `${providerLabel} returned an unreadable model list.`);
  }
}

async function fetchGeminiModelIds(
  provider: ProviderDef,
  apiKey: string,
  fetchImpl: FetchImpl,
  timeoutMs: number,
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_GEMINI_PAGES; page++) {
    let url = `${provider.baseUrl}/models?pageSize=${GEMINI_PAGE_SIZE}&key=${encodeURIComponent(apiKey)}`;
    if (pageToken !== undefined) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }
    // The URL holds the key: it must never be logged or returned.
    const body = await fetchJson(url, {}, provider.label, fetchImpl, timeoutMs);
    const parsed = parseGeminiModelsPage(body, provider.label);
    ids.push(...parsed.ids);
    if (parsed.nextPageToken === undefined) {
      return ids;
    }
    pageToken = parsed.nextPageToken;
  }
  throw new HttpsError("internal", `${provider.label} returned too many model pages.`);
}

async function fetchOpenAiCompatibleModelIds(
  provider: ProviderDef,
  apiKey: string,
  chatOnly: boolean,
  fetchImpl: FetchImpl,
  timeoutMs: number,
): Promise<string[]> {
  const body = await fetchJson(
    `${provider.baseUrl}/models`,
    { Authorization: `Bearer ${apiKey}` },
    provider.label,
    fetchImpl,
    timeoutMs,
  );
  return parseOpenAiCompatibleModels(body, provider.label, chatOnly);
}

/**
 * Fetches every usable model id for a provider, following Gemini paging.
 * `timeoutMs` is injectable for tests; production uses the 15s default.
 */
export async function fetchProviderModelIds(
  provider: ProviderDef,
  apiKey: string,
  fetchImpl: FetchImpl = fetch,
  timeoutMs: number = MODELS_TIMEOUT_MS,
): Promise<string[]> {
  if (provider.modelsFilter === "generate-content") {
    return fetchGeminiModelIds(provider, apiKey, fetchImpl, timeoutMs);
  }
  return fetchOpenAiCompatibleModelIds(
    provider,
    apiKey,
    provider.modelsFilter === "chat",
    fetchImpl,
    timeoutMs,
  );
}
