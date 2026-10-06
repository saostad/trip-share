import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/logger";
import { extractJsonObject, JsonExtractionError, runAdapter } from "./adapters";
import type { ValidatedCategory, ValidatedImage } from "./extractInput";
import type { FetchImpl } from "./modelLists";
import { normalizeExtraction, type NormalizedFields } from "./normalize";
import { buildReceiptPrompt } from "./prompt";
import type { ProviderDef } from "./providers";

/**
 * The extraction orchestration both callables share: prompt, adapter call,
 * JSON pull-out and normalization.
 */

export interface PipelineInput {
  readonly provider: ProviderDef;
  readonly model: string;
  readonly apiKey: string;
  readonly image: ValidatedImage;
  readonly categories: ValidatedCategory[];
}

export interface PipelineResult {
  readonly fields: NormalizedFields;
  readonly missing: string[];
  readonly rawText: string;
  readonly httpStatus: number;
}

export interface PipelineDeps {
  readonly fetchImpl?: FetchImpl;
  readonly timeoutMs?: number;
}

/**
 * Checks that `uid` may extract for a trip. Pure. A missing trip and a
 * non-member get the same `permission-denied` message so trip existence
 * doesn't leak; anything malformed fails closed the same way.
 */
export function checkTripAccess(data: unknown, uid: string): { archived: boolean } {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new HttpsError("permission-denied", "You don't have access to this trip.");
  }
  const record = data as Record<string, unknown>;
  const isOwner = record["ownerId"] === uid;
  const collaborators = record["collaboratorIds"];
  const isCollaborator = Array.isArray(collaborators) && collaborators.includes(uid);
  if (!isOwner && !isCollaborator) {
    throw new HttpsError("permission-denied", "You don't have access to this trip.");
  }
  return { archived: record["archived"] === true };
}

export async function runExtractionPipeline(
  input: PipelineInput,
  deps: PipelineDeps = {},
): Promise<PipelineResult> {
  const prompt = buildReceiptPrompt(input.categories);
  const { rawText, httpStatus } = await runAdapter(
    {
      provider: input.provider,
      model: input.model,
      apiKey: input.apiKey,
      image: input.image,
      prompt,
    },
    deps.fetchImpl,
    deps.timeoutMs,
  );
  const json = extractJsonObject(rawText);
  const { fields, missing } = normalizeExtraction(
    json,
    input.categories.map((category) => category.id),
  );
  return { fields, missing, rawText, httpStatus };
}

export interface TestPipelineSuccess {
  readonly fields: NormalizedFields;
  readonly missing: string[];
  readonly rawText: string;
  readonly latencyMs: number;
}

export interface TestPipelineDiagnostic {
  readonly fields: null;
  readonly missing: string[];
  readonly rawText: string;
  readonly latencyMs: number;
  readonly error: string;
}

export type TestPipelineResult = TestPipelineSuccess | TestPipelineDiagnostic;

const MAX_TEST_RAW_TEXT_CHARS = 2000;

/**
 * Runs the pipeline for the admin test callable. Unlike `extractReceipt`, a
 * missing-JSON answer is returned as diagnostic data (`fields: null` plus
 * the raw text and the error) instead of thrown — the one exception to
 * "don't return failures as data", because the test is a diagnostic tool.
 * Provider errors still throw.
 */
export interface ExtractionLogContext {
  provider?: string;
  model?: string;
  httpStatus?: number;
}

function readHttpStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "httpStatus" in error) {
    const status = (error as { httpStatus: unknown }).httpStatus;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

/**
 * Runs one extraction call with exactly one log line: `info` on success,
 * `warn` on error. The line holds only `fn`, `uid`, `provider`, `model`,
 * `outcome`, `latencyMs` and the HTTP status — never the key, the image,
 * `rawText` or the extracted fields.
 */
export async function withExtractionLog<T>(
  fn: string,
  uid: string | undefined,
  run: (log: ExtractionLogContext) => Promise<T>,
): Promise<T> {
  const log: ExtractionLogContext = {};
  const start = Date.now();
  try {
    const result = await run(log);
    logger.info({
      fn,
      uid,
      provider: log.provider,
      model: log.model,
      outcome: "ok",
      latencyMs: Date.now() - start,
      ...(log.httpStatus === undefined ? {} : { httpStatus: log.httpStatus }),
    });
    return result;
  } catch (error) {
    const outcome = error instanceof HttpsError ? error.code : "internal";
    const httpStatus = log.httpStatus ?? readHttpStatus(error);
    logger.warn({
      fn,
      uid,
      provider: log.provider,
      model: log.model,
      outcome,
      latencyMs: Date.now() - start,
      ...(httpStatus === undefined ? {} : { httpStatus }),
    });
    throw error;
  }
}

export async function runTestPipeline(
  input: PipelineInput,
  deps: PipelineDeps = {},
): Promise<TestPipelineResult> {
  const start = Date.now();
  try {
    const result = await runExtractionPipeline(input, deps);
    return {
      fields: result.fields,
      missing: result.missing,
      rawText: result.rawText.slice(0, MAX_TEST_RAW_TEXT_CHARS),
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof JsonExtractionError) {
      return {
        fields: null,
        missing: [],
        rawText: error.rawText.slice(0, MAX_TEST_RAW_TEXT_CHARS),
        latencyMs: Date.now() - start,
        error: error.message,
      };
    }
    throw error;
  }
}
