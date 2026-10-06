import { HttpsError } from "firebase-functions/v2/https";
import type { FetchImpl } from "./modelLists";
import { MAX_ERROR_BODY_CHARS, toProviderHttpError } from "./providerErrors";
import type { ProviderDef } from "./providers";

export interface ExtractionImage {
  readonly mimeType: string;
  readonly base64: string;
}

export interface AdapterCall {
  readonly provider: ProviderDef;
  readonly model: string;
  readonly apiKey: string;
  readonly image: ExtractionImage;
  readonly prompt: string;
}

export interface AdapterResult {
  readonly rawText: string;
  readonly httpStatus: number;
}

export interface BuiltRequest {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
}

const EXTRACTION_TIMEOUT_MS = 45_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripModelsPrefix(model: string): string {
  return model.startsWith("models/") ? model.slice("models/".length) : model;
}

/**
 * Builds the Gemini `generateContent` request. Pure.
 * No `maxOutputTokens`: thinking models spend output tokens on thinking, and
 * a low limit returns empty candidates with `finishReason: "MAX_TOKENS"`.
 */
export function buildGeminiRequest(call: AdapterCall): BuiltRequest {
  const model = stripModelsPrefix(call.model);
  return {
    url: `${call.provider.baseUrl}/models/${encodeURIComponent(model)}:generateContent`,
    headers: { "x-goog-api-key": call.apiKey, "Content-Type": "application/json" },
    body: {
      systemInstruction: { parts: [{ text: call.prompt }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: "Extract the receipt details from the attached image as JSON." },
            {
              inlineData: {
                mimeType: call.image.mimeType,
                data: call.image.base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            merchant: { type: "STRING", nullable: true },
            description: { type: "STRING", nullable: true },
            category: { type: "STRING", nullable: true },
            date: { type: "STRING", nullable: true },
            total: { type: "NUMBER", nullable: true },
            currency: { type: "STRING", nullable: true },
          },
          required: ["merchant", "description", "category", "date", "total", "currency"],
        },
      },
    },
  };
}

/** Reads the answer text out of a Gemini response. Pure. */
export function parseGeminiResponse(
  body: unknown,
  providerLabel: string,
): string {
  if (!isRecord(body)) {
    throw new HttpsError("internal", `${providerLabel} returned an unexpected answer.`);
  }
  const feedback = body["promptFeedback"];
  const blockReason =
    isRecord(feedback) && typeof feedback["blockReason"] === "string"
      ? feedback["blockReason"]
      : undefined;
  if (blockReason !== undefined && blockReason !== "") {
    throw new HttpsError(
      "failed-precondition",
      `${providerLabel} refused the image (blocked: ${blockReason}).`,
    );
  }
  const candidates = body["candidates"];
  if (!Array.isArray(candidates) || candidates.length === 0 || !isRecord(candidates[0])) {
    throw new HttpsError("internal", `${providerLabel} returned no answer.`);
  }
  const candidate = candidates[0];
  const finishReason = candidate["finishReason"];
  if (typeof finishReason === "string" && finishReason !== "" && finishReason !== "STOP") {
    throw new HttpsError(
      "failed-precondition",
      `${providerLabel} stopped early (${finishReason}).`,
    );
  }
  const content = candidate["content"];
  const parts = isRecord(content) ? content["parts"] : undefined;
  if (!Array.isArray(parts)) {
    throw new HttpsError("internal", `${providerLabel} returned an empty answer.`);
  }
  const text = parts
    .map((part) => (isRecord(part) && typeof part["text"] === "string" ? part["text"] : ""))
    .join("");
  if (text.trim() === "") {
    throw new HttpsError("internal", `${providerLabel} returned an empty answer.`);
  }
  return text;
}

/**
 * Builds the OpenAI-compatible `chat/completions` request. Pure.
 * No system message (some vision models reject one alongside an image) and
 * no `response_format` (not all providers honor it).
 */
export function buildOpenAiCompatibleRequest(call: AdapterCall): BuiltRequest {
  return {
    url: `${call.provider.baseUrl}/chat/completions`,
    headers: { Authorization: `Bearer ${call.apiKey}`, "Content-Type": "application/json" },
    body: {
      model: call.model,
      temperature: 0,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: call.prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${call.image.mimeType};base64,${call.image.base64}`,
              },
            },
          ],
        },
      ],
    },
  };
}

/** Reads the answer text out of an OpenAI-compatible response. Pure. */
export function parseOpenAiCompatibleResponse(
  body: unknown,
  providerLabel: string,
): string {
  if (!isRecord(body)) {
    throw new HttpsError("internal", `${providerLabel} returned an unexpected answer.`);
  }
  const choices = body["choices"];
  if (!Array.isArray(choices) || choices.length === 0 || !isRecord(choices[0])) {
    throw new HttpsError("internal", `${providerLabel} returned no answer.`);
  }
  const choice = choices[0];
  const finishReason = choice["finish_reason"];
  if (finishReason === "length") {
    throw new HttpsError(
      "failed-precondition",
      `${providerLabel}'s answer was cut off (length). Try again or use another model.`,
    );
  }
  if (finishReason === "content_filter") {
    throw new HttpsError(
      "failed-precondition",
      `${providerLabel} refused the image (content filter).`,
    );
  }
  const message = choice["message"];
  const content = isRecord(message) ? message["content"] : undefined;
  let text = "";
  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    text = content
      .map((part) =>
        isRecord(part) && part["type"] === "text" && typeof part["text"] === "string"
          ? part["text"]
          : "",
      )
      .join("");
  }
  if (text.trim() === "") {
    throw new HttpsError("internal", `${providerLabel} returned an empty answer.`);
  }
  return text;
}

/**
 * Thrown when a model's answer holds no JSON object. Carries the raw answer
 * server-side so the admin test callable can show it; the callable protocol
 * only ever sends the code and message to the client.
 */
export class JsonExtractionError extends HttpsError {
  readonly rawText: string;

  constructor(rawText: string) {
    super("internal", "The model's answer had no JSON");
    this.rawText = rawText;
  }
}

function stripThinkBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, " ");
}

function stripCodeFences(text: string): string {
  return text.replace(/```[a-zA-Z]*\r?\n?([\s\S]*?)```/g, "$1");
}

/**
 * Pulls the first top-level JSON object out of a model answer. Pure.
 * Strips `<think>` blocks and code fences, then scans for balanced `{…}`
 * candidates while respecting strings and escapes. Throws
 * `JsonExtractionError` when nothing parses — never an all-null result,
 * which would report a failure as success.
 */
export function extractJsonObject(text: string): Record<string, unknown> {
  const cleaned = stripCodeFences(stripThinkBlocks(text));
  let index = 0;
  while (index < cleaned.length) {
    const start = cleaned.indexOf("{", index);
    if (start === -1) {
      break;
    }
    const end = findBalancedEnd(cleaned, start);
    if (end === -1) {
      break;
    }
    try {
      const parsed: unknown = JSON.parse(cleaned.slice(start, end + 1));
      if (isRecord(parsed)) {
        return parsed;
      }
    } catch {
      // Not valid JSON: keep looking for a later candidate.
    }
    index = end + 1;
  }
  throw new JsonExtractionError(text);
}

/** Index of the `}` balancing the `{` at `start`, or -1 if unbalanced. */
function findBalancedEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (char === "\\") {
        i++;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Runs one extraction call against the provider selected by `kind`.
 * Error messages carry only the label, the status and a short redacted
 * provider message — never the key, URL, headers, image data or full body.
 */
export async function runAdapter(
  call: AdapterCall,
  fetchImpl: FetchImpl = fetch,
  timeoutMs: number = EXTRACTION_TIMEOUT_MS,
): Promise<AdapterResult> {
  const request =
    call.provider.kind === "gemini"
      ? buildGeminiRequest(call)
      : buildOpenAiCompatibleRequest(call);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new HttpsError("deadline-exceeded", `${call.provider.label} did not respond in time.`);
    }
    throw new HttpsError("unavailable", `${call.provider.label} could not be reached.`);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const bodyText = (await response.text().catch(() => "")).slice(0, MAX_ERROR_BODY_CHARS);
    throw toProviderHttpError({
      providerLabel: call.provider.label,
      model: call.model,
      status: response.status,
      bodyText,
      apiKey: call.apiKey,
    });
  }
  let parsed: unknown;
  try {
    parsed = (await response.json()) as unknown;
  } catch {
    throw new HttpsError("internal", `${call.provider.label} returned an unreadable answer.`);
  }
  const rawText =
    call.provider.kind === "gemini"
      ? parseGeminiResponse(parsed, call.provider.label)
      : parseOpenAiCompatibleResponse(parsed, call.provider.label);
  return { rawText, httpStatus: response.status };
}
