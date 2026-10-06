import { HttpsError } from "firebase-functions/v2/https";

/**
 * Shared provider HTTP error mapping for the model-list fetcher and the
 * extraction adapters. Messages carry only the provider label, the status
 * and a short redacted provider message — never the key, URL, headers,
 * image data or the full body.
 */

export const MAX_ERROR_BODY_CHARS = 8_000;
const MAX_PROVIDER_MESSAGE_CHARS = 300;

export class ProviderHttpError extends HttpsError {
  readonly httpStatus: number;

  constructor(
    code: "failed-precondition" | "resource-exhausted" | "unavailable" | "internal",
    message: string,
    httpStatus: number,
  ) {
    super(code, message);
    this.httpStatus = httpStatus;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function redactKey(text: string, apiKey: string): string {
  if (apiKey === "") {
    return text;
  }
  return text.split(apiKey).join("[redacted]");
}

/**
 * Pulls a short safe message out of a provider error body: `error.message`,
 * or a top-level `message` / `detail` string, else the raw text. Cut to 300
 * characters with every copy of the key redacted. Never throws.
 */
export function extractProviderMessage(bodyText: string, apiKey: string): string {
  let message = "";
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (isRecord(parsed)) {
      const nested = parsed["error"];
      if (isRecord(nested) && typeof nested["message"] === "string") {
        message = nested["message"];
      } else if (typeof parsed["message"] === "string") {
        message = parsed["message"];
      } else if (typeof parsed["detail"] === "string") {
        message = parsed["detail"];
      }
    }
  } catch {
    message = bodyText;
  }
  return redactKey(message.slice(0, MAX_PROVIDER_MESSAGE_CHARS).trim(), apiKey);
}

function hasApiKeyInvalidReason(bodyText: string): boolean {
  try {
    const parsed: unknown = JSON.parse(bodyText);
    const details =
      isRecord(parsed) && isRecord(parsed["error"]) ? parsed["error"]["details"] : undefined;
    return (
      Array.isArray(details) &&
      details.some((detail) => isRecord(detail) && detail["reason"] === "API_KEY_INVALID")
    );
  } catch {
    return false;
  }
}

export interface ProviderHttpErrorInput {
  readonly providerLabel: string;
  /** The model id for extraction calls; omitted for model-list calls. */
  readonly model?: string;
  readonly status: number;
  readonly bodyText: string;
  readonly apiKey: string;
}

export function toProviderHttpError(input: ProviderHttpErrorInput): ProviderHttpError {
  const { providerLabel, model, status, bodyText, apiKey } = input;
  if (status === 401 || status === 403) {
    return new ProviderHttpError(
      "failed-precondition",
      `${providerLabel} rejected the API key (HTTP ${status}). Check the key and try again.`,
      status,
    );
  }
  if (status === 400) {
    // Gemini returns 400 (not 401) for a bad key.
    if (hasApiKeyInvalidReason(bodyText)) {
      return new ProviderHttpError(
        "failed-precondition",
        `${providerLabel} rejected the API key (HTTP 400). Check the key and try again.`,
        status,
      );
    }
    const message = extractProviderMessage(bodyText, apiKey);
    return new ProviderHttpError(
      "failed-precondition",
      message === ""
        ? `${providerLabel} rejected the request (HTTP 400).`
        : `${providerLabel} rejected the request: ${message}`,
      status,
    );
  }
  if (status === 404) {
    if (model !== undefined) {
      return new ProviderHttpError(
        "failed-precondition",
        `Model \`${model}\` was not found at \`${providerLabel}\`.`,
        status,
      );
    }
    return new ProviderHttpError(
      "internal",
      `${providerLabel} returned an unexpected error (HTTP ${status}).`,
      status,
    );
  }
  if (status === 429) {
    return new ProviderHttpError(
      "resource-exhausted",
      `${providerLabel} rate-limited the request (HTTP 429). Try again later.`,
      status,
    );
  }
  if (status >= 500) {
    return new ProviderHttpError(
      "unavailable",
      `${providerLabel} is unavailable (HTTP ${status}). Try again later.`,
      status,
    );
  }
  return new ProviderHttpError(
    "internal",
    `${providerLabel} returned an unexpected error (HTTP ${status}).`,
    status,
  );
}
