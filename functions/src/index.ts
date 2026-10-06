import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall, type CallableOptions } from "firebase-functions/v2/https";
import { requireAdmin } from "./auth";
import {
  checkTripAccess,
  requireUsableSettings,
  runExtractionPipeline,
  runTestPipeline,
  withExtractionLog,
  type TestPipelineResult,
} from "./ai/extract";
import { validateCategoriesField, validateExtractInput, validateImageField } from "./ai/extractInput";
import { fetchProviderModelIds, toListedModels, type ListedModel } from "./ai/modelLists";
import type { NormalizedFields } from "./ai/normalize";
import {
  AI_PROVIDER_KEYS,
  getProvider,
  getProviderKey,
  isKeyConfigured,
  PROVIDERS,
  readProviderKeysState,
  type ProviderDef,
  type ProviderId,
} from "./ai/providers";
import {
  parseAiSettings,
  validateAiSettingsInput,
  validateModelField,
  validateProviderField,
  type AiSettings,
} from "./ai/settings";
import { checkAndIncrementUsage } from "./ai/usage";

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
  modelHelp: string;
}

export type AiSettingsStatus = "missing" | "invalid" | "ok";

export type AiKeysStatus = "ok" | "invalid";

export interface AiAdminStatusResponse {
  providers: AiProviderStatus[];
  settings: AiSettings | null;
  settingsStatus: AiSettingsStatus;
  settingsError: string | null;
  keysStatus: AiKeysStatus;
  ignoredKeyNames: string[];
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

export interface ExtractReceiptRequest {
  tripId: string;
  image: {
    mimeType: string;
    base64: string;
  };
  categories: Array<{
    id: string;
    label: string;
  }>;
}

export interface ExtractReceiptResponse {
  fields: NormalizedFields;
  missing: string[];
}

export interface TestReceiptExtractionRequest {
  provider: string;
  model: string;
  image: {
    mimeType: string;
    base64: string;
  };
  categories: Array<{
    id: string;
    label: string;
  }>;
}

export type TestReceiptExtractionResponse = TestPipelineResult;

// Every callable below either calls a provider or reports key status, so
// each one binds the single AI_PROVIDER_KEYS secret.
const callableOptions: CallableOptions = {
  region: "us-central1",
  maxInstances: 5,
  secrets: [AI_PROVIDER_KEYS],
};

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
    // An invalid secret is reported, never thrown: the admin page must be
    // able to explain the problem.
    const keysState = readProviderKeysState();
    const keys = keysState.status === "ok" ? keysState.keys : {};
    return {
      providers: PROVIDERS.map((provider) => ({
        id: provider.id,
        label: provider.label,
        keyConfigured:
          keysState.status === "ok" && isKeyConfigured(keys[provider.id as ProviderId]),
        modelHelp: provider.modelHelp,
      })),
      settings: state.status === "ok" ? state.settings : null,
      settingsStatus: state.status,
      settingsError: state.status === "invalid" ? state.reason : null,
      keysStatus: keysState.status,
      ignoredKeyNames: keysState.status === "ok" ? keysState.ignoredNames : [],
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
    const apiKey = getProviderKey(provider);
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

/** Extracts receipt fields for a trip member, under the daily cap. */
export const extractReceipt = onCall(
  { ...callableOptions, timeoutSeconds: 60, memory: "512MiB" },
  async (request): Promise<ExtractReceiptResponse> => {
    return withExtractionLog("extractReceipt", request.auth?.uid, async (log) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Sign in required.");
      }
      const uid = request.auth.uid;
      const input = validateExtractInput(request.data);
      const tripSnapshot = await getFirestore().doc(`trips/${input.tripId}`).get();
      const access = checkTripAccess(tripSnapshot.data(), uid);
      if (access.archived) {
        throw new HttpsError("failed-precondition", "This trip is archived");
      }
      // Settings are re-read on every call; nothing is cached between calls.
      const settingsSnapshot = await getFirestore().doc("appConfig/ai").get();
      const settings = requireUsableSettings(parseAiSettings(settingsSnapshot.data()));
      const provider = getProvider(settings.provider);
      if (provider === undefined) {
        throw new HttpsError("internal", "Saved provider is unknown.");
      }
      log.provider = provider.id;
      log.model = settings.model;
      const apiKey = getProviderKey(provider);
      if (!isKeyConfigured(apiKey)) {
        throw new HttpsError("failed-precondition", `API key for ${provider.label} is not set.`);
      }
      await checkAndIncrementUsage(getFirestore(), uid, settings.dailyLimitPerUser);
      const result = await runExtractionPipeline({
        provider,
        model: settings.model,
        apiKey,
        image: input.image,
        categories: input.categories,
      });
      log.httpStatus = result.httpStatus;
      return { fields: result.fields, missing: result.missing };
    });
  },
);

/**
 * Tests a provider/model pair on one image for the admin settings page. Uses
 * the request's provider and model (not the saved settings) and doesn't
 * count toward the usage cap.
 */
export const testReceiptExtraction = onCall(
  { ...callableOptions, timeoutSeconds: 60, memory: "512MiB" },
  async (request): Promise<TestReceiptExtractionResponse> => {
    return withExtractionLog("testReceiptExtraction", request.auth?.uid, async (log) => {
      await requireAdmin(request);
      const data =
        typeof request.data === "object" && request.data !== null
          ? (request.data as Record<string, unknown>)
          : {};
      const providerId = validateProviderField(data["provider"]);
      const model = validateModelField(data["model"]);
      const image = validateImageField(data["image"]);
      const categories = validateCategoriesField(data["categories"]);
      const provider = getProvider(providerId);
      if (provider === undefined) {
        throw new HttpsError("internal", "Validated provider is unknown.");
      }
      log.provider = provider.id;
      log.model = model;
      const apiKey = getProviderKey(provider);
      if (!isKeyConfigured(apiKey)) {
        throw new HttpsError("failed-precondition", `API key for ${provider.label} is not set.`);
      }
      return runTestPipeline({ provider, model, apiKey, image, categories });
    });
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
    if (settings.enabled && !isKeyConfigured(getProviderKey(provider))) {
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
