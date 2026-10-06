import { HttpsError } from "firebase-functions/v2/https";
import { extractJsonObject, runAdapter } from "./adapters";
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
