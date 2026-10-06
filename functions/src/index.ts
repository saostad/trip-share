import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { requireAdmin } from "./auth";
import { fetchProviderModelIds, toListedModels, type ListedModel } from "./ai/modelLists";
import { getProvider, isKeyConfigured, PROVIDERS, type ProviderDef } from "./ai/providers";
import { parseAiSettings, validateAiSettingsInput, type AiSettings } from "./ai/settings";

initializeApp();

/**
 * Callable request/response shapes. The web app mirrors these in
 * `src/lib/aiApi.ts`, kept identical by hand: `functions/` and the web app
 * are two npm packages, so the types live in both places separately.
 */
export interface AiProviderStatus {
  id: string;
  label: string;
  keyConfigured: boolean;
}

export type AiSettingsStatus = "missing" | "invalid" | "ok";

export interface AiAdminStatusResponse {
  providers: AiProviderStatus[];
  settings: AiSettings | null;
  settingsStatus: AiSettingsStatus;
  settingsError: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface ListAiModelsRequest {
  provider: string;
}

export interface ListAiModelsResponse {
  models: ListedModel[];
}

export type SaveAiSettingsResponse = AiSettings;

// Every callable below serves a provider chosen at request time, and secret
// binding is static per function, so each one binds all three provider
// secrets. There is no way to bind only the selected provider's secret.
const allSecrets = PROVIDERS.map((provider) => provider.secret);

const callableOptions = {
  region: "us-central1",
  maxInstances: 5,
  secrets: allSecrets,
} as const;

function readUpdatedAt(data: unknown): string | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const value = (data as Record<string, unknown>)["updatedAt"];
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return typeof value === "string" ? value : null;
}

function readUpdatedBy(data: unknown): string | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const value = (data as Record<string, unknown>)["updatedBy"];
  return typeof value === "string" ? value : null;
}

function readProviderParam(data: unknown): ProviderDef {
  const providerId =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>)["provider"]
      : undefined;
  const provider = typeof providerId === "string" ? getProvider(providerId) : undefined;
  if (provider === undefined) {
    const known = PROVIDERS.map((p) => p.id).join(", ");
    throw new HttpsError("invalid-argument", `Invalid 'provider': must be one of ${known}.`);
  }
  return provider;
}

/** Admin status: per-provider key state plus the saved AI settings. */
export const getAiAdminStatus = onCall(
  { ...callableOptions },
  async (request): Promise<AiAdminStatusResponse> => {
    await requireAdmin(request);
    const snapshot = await getFirestore().doc("appConfig/ai").get();
    const data = snapshot.data();
    const state = parseAiSettings(data);
    return {
      providers: PROVIDERS.map((provider) => ({
        id: provider.id,
        label: provider.label,
        keyConfigured: isKeyConfigured(provider.secret.value()),
      })),
      settings: state.status === "ok" ? state.settings : null,
      settingsStatus: state.status,
      settingsError: state.status === "invalid" ? state.reason : null,
      updatedAt: readUpdatedAt(data),
      updatedBy: readUpdatedBy(data),
    };
  },
);

/** Live model list for one provider, for the admin settings page. */
export const listAiModels = onCall(
  { ...callableOptions },
  async (request): Promise<ListAiModelsResponse> => {
    await requireAdmin(request);
    const provider = readProviderParam(request.data);
    const apiKey = provider.secret.value();
    if (!isKeyConfigured(apiKey)) {
      throw new HttpsError(
        "failed-precondition",
        `API key for ${provider.label} is not set.`,
      );
    }
    const ids = await fetchProviderModelIds(provider, apiKey);
    return { models: toListedModels(ids) };
  },
);

/** Validates and saves the AI settings to `appConfig/ai`. */
export const saveAiSettings = onCall(
  { ...callableOptions },
  async (request): Promise<SaveAiSettingsResponse> => {
    const adminEmail = await requireAdmin(request);
    const settings = validateAiSettingsInput(request.data);
    const provider = getProvider(settings.provider);
    if (provider === undefined) {
      throw new HttpsError("internal", "Validated provider is unknown.");
    }
    if (settings.enabled && !isKeyConfigured(provider.secret.value())) {
      throw new HttpsError(
        "failed-precondition",
        `Cannot enable auto-fill: API key for ${provider.label} is not set.`,
      );
    }
    await getFirestore()
      .doc("appConfig/ai")
      .set({
        ...settings,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: adminEmail,
      });
    return settings;
  },
);
