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

export interface ListedModel {
  id: string;
  label: string;
}

export interface ListAiModelsResponse {
  models: ListedModel[];
}

export type SaveAiSettingsInput = AiSettings;

export interface ExtractionImageInput {
  mimeType: string;
  base64: string;
}

export interface ExtractionCategoryInput {
  id: string;
  label: string;
}

export interface ExtractReceiptRequest {
  tripId: string;
  image: ExtractionImageInput;
  categories: ExtractionCategoryInput[];
}

export interface ExtractionFields {
  description: string | null;
  category: string | null;
  date: string | null;
  amount: number | null;
  currency: string | null;
}

export interface ExtractReceiptResponse {
  fields: ExtractionFields;
  missing: string[];
}

export interface TestReceiptExtractionRequest {
  provider: string;
  model: string;
  image: ExtractionImageInput;
  categories: ExtractionCategoryInput[];
}

export interface TestExtractionSuccess {
  fields: ExtractionFields;
  missing: string[];
  rawText: string;
  latencyMs: number;
}

export interface TestExtractionDiagnostic {
  fields: null;
  missing: string[];
  rawText: string;
  latencyMs: number;
  error: string;
}

export type TestReceiptExtractionResponse = TestExtractionSuccess | TestExtractionDiagnostic;

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

export async function extractReceipt(input: ExtractReceiptRequest): Promise<ExtractReceiptResponse> {
  const callable = httpsCallable<ExtractReceiptRequest, ExtractReceiptResponse>(
    functions,
    "extractReceipt",
  );
  const result = await callable(input);
  return result.data;
}

export async function testReceiptExtraction(
  input: TestReceiptExtractionRequest,
): Promise<TestReceiptExtractionResponse> {
  const callable = httpsCallable<TestReceiptExtractionRequest, TestReceiptExtractionResponse>(
    functions,
    "testReceiptExtraction",
  );
  const result = await callable(input);
  return result.data;
}
