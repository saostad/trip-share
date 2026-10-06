import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

/**
 * Typed wrappers for the AI admin callables.
 *
 * The request/response shapes below mirror `functions/src/index.ts`, kept
 * identical by hand: `functions/` and the web app are two npm packages, so
 * the types live in both places separately. (`provider` is a plain string
 * here because the only provider list lives on the server — this file must
 * never hard-code provider ids. Providers come from `getAiAdminStatus`.)
 */
export interface AiSettings {
  enabled: boolean;
  provider: string;
  model: string;
  dailyLimitPerUser: number;
}

export interface AiProviderStatus {
  id: string;
  label: string;
  keyConfigured: boolean;
}

export interface AiAdminStatusResponse {
  providers: AiProviderStatus[];
  settings: AiSettings | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface ListAiModelsRequest {
  provider: string;
}

export interface ListedModel {
  id: string;
  label: string;
}

export interface ListAiModelsResponse {
  models: ListedModel[];
}

export type SaveAiSettingsInput = AiSettings;

export async function getAiAdminStatus(): Promise<AiAdminStatusResponse> {
  const callable = httpsCallable<void, AiAdminStatusResponse>(functions, "getAiAdminStatus");
  const result = await callable();
  return result.data;
}

export async function listAiModels(provider: string): Promise<ListAiModelsResponse> {
  const callable = httpsCallable<ListAiModelsRequest, ListAiModelsResponse>(
    functions,
    "listAiModels",
  );
  const result = await callable({ provider });
  return result.data;
}

export async function saveAiSettings(input: SaveAiSettingsInput): Promise<AiSettings> {
  const callable = httpsCallable<SaveAiSettingsInput, AiSettings>(functions, "saveAiSettings");
  const result = await callable(input);
  return result.data;
}
