import { defineSecret, type SecretParam } from "firebase-functions/params";

/**
 * The only list of AI providers anywhere in the repo (plan decision D7).
 * The client never hard-codes provider ids; it gets `{ id, label,
 * keyConfigured }` from the `getAiAdminStatus` callable, which reads this
 * registry.
 */

export type ProviderKind = "gemini" | "openai-compatible";

export interface ProviderDef {
  readonly id: string;
  readonly label: string;
  readonly kind: ProviderKind;
  readonly baseUrl: string;
  readonly secret: SecretParam;
}

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const togetherApiKey = defineSecret("TOGETHER_API_KEY");
const nvidiaApiKey = defineSecret("NVIDIA_API_KEY");

export const PROVIDERS = [
  {
    id: "gemini",
    label: "Google Gemini",
    kind: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    secret: geminiApiKey,
  },
  {
    id: "together",
    label: "Together.ai",
    kind: "openai-compatible",
    baseUrl: "https://api.together.ai/v1",
    secret: togetherApiKey,
  },
  {
    id: "nvidia",
    label: "NVIDIA",
    kind: "openai-compatible",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    secret: nvidiaApiKey,
  },
] as const satisfies ReadonlyArray<ProviderDef>;

export type ProviderId = (typeof PROVIDERS)[number]["id"];

export function getProvider(id: string): ProviderDef | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}

/**
 * Whether a secret value counts as a configured API key (plan decision D4).
 * An unused provider's secret is set to the literal `none`, which — like a
 * missing, empty or whitespace-only value — means "key not set".
 */
export function isKeyConfigured(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return false;
  }
  return trimmed.toLowerCase() !== "none";
}
