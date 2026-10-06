import { HttpsError } from "firebase-functions/v2/https";
import { getProvider, PROVIDERS, type ProviderId } from "./providers";

/**
 * AI auto-fill settings stored in `appConfig/ai` (plan decision D6).
 * Pure module: no Firestore or network access. Reads never invent a provider
 * or model that wasn't stored.
 */
export interface AiSettings {
  enabled: boolean;
  provider: ProviderId;
  model: string;
  dailyLimitPerUser: number;
}

export const DEFAULT_DAILY_LIMIT_PER_USER = 30;
export const MIN_DAILY_LIMIT_PER_USER = 1;
export const MAX_DAILY_LIMIT_PER_USER = 500;
export const MAX_MODEL_LENGTH = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasControlCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if ((code >= 0x00 && code <= 0x1f) || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function readProvider(value: unknown): ProviderId | undefined {
  if (typeof value !== "string" || getProvider(value) === undefined) {
    return undefined;
  }
  return value as ProviderId;
}

/**
 * Reads the stored `appConfig/ai` doc (`snapshot.data()`). Returns `null`
 * when the doc is missing or holds no usable settings — in particular when
 * the provider isn't in the registry. A missing `dailyLimitPerUser`
 * defaults to 30; a provider or model is never filled in.
 */
export function parseAiSettings(data: unknown): AiSettings | null {
  if (data === undefined || data === null) {
    return null;
  }
  if (!isRecord(data)) {
    return null;
  }
  const provider = readProvider(data["provider"]);
  if (provider === undefined) {
    return null;
  }
  if (typeof data["model"] !== "string" || data["model"].trim() === "") {
    return null;
  }
  if (typeof data["enabled"] !== "boolean") {
    return null;
  }
  const limit = data["dailyLimitPerUser"];
  if (limit === undefined) {
    return {
      enabled: data["enabled"],
      provider,
      model: data["model"].trim(),
      dailyLimitPerUser: DEFAULT_DAILY_LIMIT_PER_USER,
    };
  }
  if (
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit < MIN_DAILY_LIMIT_PER_USER ||
    limit > MAX_DAILY_LIMIT_PER_USER
  ) {
    return null;
  }
  return {
    enabled: data["enabled"],
    provider,
    model: data["model"].trim(),
    dailyLimitPerUser: limit,
  };
}

/**
 * Validates a `saveAiSettings` request body and returns the normalized
 * settings. Throws `invalid-argument` with a message naming the bad field.
 */
export function validateAiSettingsInput(input: unknown): AiSettings {
  if (!isRecord(input)) {
    throw new HttpsError("invalid-argument", "Invalid settings: expected an object.");
  }
  const provider = readProvider(input["provider"]);
  if (provider === undefined) {
    const known = PROVIDERS.map((p) => p.id).join(", ");
    throw new HttpsError(
      "invalid-argument",
      `Invalid 'provider': must be one of ${known}.`,
    );
  }
  if (typeof input["model"] !== "string") {
    throw new HttpsError("invalid-argument", "Invalid 'model': must be a string.");
  }
  const model = input["model"].trim();
  if (model.length < 1 || model.length > MAX_MODEL_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid 'model': must be 1 to ${MAX_MODEL_LENGTH} characters.`,
    );
  }
  if (hasControlCharacter(model)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid 'model': must not contain control characters.",
    );
  }
  const limit = input["dailyLimitPerUser"];
  if (
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit < MIN_DAILY_LIMIT_PER_USER ||
    limit > MAX_DAILY_LIMIT_PER_USER
  ) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid 'dailyLimitPerUser': must be an integer from ${MIN_DAILY_LIMIT_PER_USER} to ${MAX_DAILY_LIMIT_PER_USER}.`,
    );
  }
  if (typeof input["enabled"] !== "boolean") {
    throw new HttpsError("invalid-argument", "Invalid 'enabled': must be a boolean.");
  }
  return { enabled: input["enabled"], provider, model, dailyLimitPerUser: limit };
}
