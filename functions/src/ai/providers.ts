import { HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

/**
 * The only list of AI providers anywhere in the repo (plan decision D7).
 * The client never hard-codes provider ids; it gets `{ id, label,
 * keyConfigured, modelHelp }` from the `getAiAdminStatus` callable, which
 * reads this registry.
 *
 * All provider keys live in ONE secret, `AI_PROVIDER_KEYS`, whose value is a
 * JSON object mapping provider ids to keys, holding only the providers in
 * use (plan decisions D1, D4, D17). For the emulator, put one line in
 * `functions/.secret.local` (gitignored, never deployed):
 * `AI_PROVIDER_KEYS={"gemini":"…","nvidia":"…"}`.
 */

export type ProviderKind = "gemini" | "openai-compatible";

/**
 * Which entries of the provider's live model list are usable for receipt
 * extraction (plan decision D8). Kept in the registry so no other file
 * branches on provider ids.
 */
export type ModelsFilter = "generate-content" | "chat" | "all";

export interface ProviderDef {
  readonly id: string;
  readonly label: string;
  readonly kind: ProviderKind;
  readonly baseUrl: string;
  readonly modelsFilter: ModelsFilter;
  /** One sentence telling the admin where to copy a model ID on the provider's site. */
  readonly modelHelp: string;
}

export const AI_PROVIDER_KEYS = defineSecret("AI_PROVIDER_KEYS");

export const PROVIDERS = [
  {
    id: "gemini",
    label: "Google Gemini",
    kind: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    modelsFilter: "generate-content",
    modelHelp: "Copy a model ID from the models table in the Gemini API documentation.",
  },
  {
    id: "together",
    label: "Together.ai",
    kind: "openai-compatible",
    baseUrl: "https://api.together.ai/v1",
    modelsFilter: "chat",
    modelHelp: "Copy a model ID from the models page on the Together.ai website.",
  },
  {
    id: "nvidia",
    label: "NVIDIA",
    kind: "openai-compatible",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    modelsFilter: "all",
    modelHelp: "Copy a model ID from the model catalog on build.nvidia.com.",
  },
] as const satisfies ReadonlyArray<ProviderDef>;

export type ProviderId = (typeof PROVIDERS)[number]["id"];

export function getProvider(id: string): ProviderDef | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}

export type ParsedProviderKeys =
  | { status: "ok"; keys: Partial<Record<ProviderId, string>>; ignoredNames: string[] }
  | { status: "invalid" };

/**
 * Parses the `AI_PROVIDER_KEYS` secret value. Pure. An empty value means no
 * keys; anything that isn't a JSON object — or a known provider's entry that
 * isn't a string — is `invalid`. Unknown names are reported (names only) so
 * a typo like `togther` shows up instead of silently doing nothing.
 */
export function parseProviderKeys(raw: string | undefined): ParsedProviderKeys {
  if (raw === undefined || raw.trim() === "") {
    return { status: "ok", keys: {}, ignoredNames: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { status: "invalid" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { status: "invalid" };
  }
  const keys: Partial<Record<ProviderId, string>> = {};
  const ignoredNames: string[] = [];
  for (const [name, value] of Object.entries(parsed)) {
    if (getProvider(name) === undefined) {
      ignoredNames.push(name);
      continue;
    }
    if (typeof value !== "string") {
      return { status: "invalid" };
    }
    const trimmed = value.trim();
    if (trimmed !== "") {
      keys[name as ProviderId] = trimmed;
    }
  }
  return { status: "ok", keys, ignoredNames };
}

/**
 * Reads and parses the secret without throwing, for `getAiAdminStatus`,
 * which reports an invalid secret instead of failing. Call inside the
 * handler on every call; parsing is cheap, so the result isn't cached.
 */
export function readProviderKeysState(): ParsedProviderKeys {
  return parseProviderKeys(AI_PROVIDER_KEYS.value());
}

export const INVALID_KEYS_MESSAGE = "AI_PROVIDER_KEYS is not a valid JSON object of provider keys";

/**
 * Returns one provider's key (`undefined` when unset) for handlers that call
 * a provider. Throws `failed-precondition` when the secret itself is
 * invalid. The secret's content never appears in the message.
 */
export function getProviderKey(provider: ProviderDef): string | undefined {
  const state = readProviderKeysState();
  if (state.status === "invalid") {
    throw new HttpsError("failed-precondition", INVALID_KEYS_MESSAGE);
  }
  return state.keys[provider.id as ProviderId];
}

/**
 * Whether a key value counts as configured: a non-empty string after
 * trimming. No placeholders: every provider you don't use simply has no
 * entry in the secret.
 */
export function isKeyConfigured(value: string | undefined): value is string {
  if (value === undefined) {
    return false;
  }
  return value.trim() !== "";
}
