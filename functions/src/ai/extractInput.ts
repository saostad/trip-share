import { HttpsError } from "firebase-functions/v2/https";
import { replaceControlChars } from "./text";

/**
 * Request validation for `extractReceipt` and `testReceiptExtraction`. Pure:
 * every failure throws `invalid-argument` naming the field.
 */

export interface ValidatedImage {
  readonly mimeType: string;
  /** Base64 with any `data:` prefix stripped. */
  readonly base64: string;
}

export interface ValidatedCategory {
  readonly id: string;
  /** Label with control characters removed. */
  readonly label: string;
}

export interface ValidatedExtractInput {
  readonly tripId: string;
  readonly image: ValidatedImage;
  readonly categories: ValidatedCategory[];
}

const MAX_TRIP_ID_LENGTH = 128;
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_CATEGORIES = 30;
const CATEGORY_ID = /^[a-z0-9_-]{1,32}$/;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
const MAX_LABEL_LENGTH = 40;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateTripIdField(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > MAX_TRIP_ID_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid 'tripId': must be 1 to ${MAX_TRIP_ID_LENGTH} characters.`,
    );
  }
  if (value.includes("/")) {
    throw new HttpsError("invalid-argument", "Invalid 'tripId': must not contain '/'.");
  }
  return value;
}

function stripDataPrefix(base64: string): string {
  if (!base64.startsWith("data:")) {
    return base64;
  }
  const comma = base64.indexOf(",");
  if (comma === -1) {
    throw new HttpsError("invalid-argument", "Invalid 'image.base64': malformed data URI.");
  }
  return base64.slice(comma + 1);
}

export function validateImageField(value: unknown): ValidatedImage {
  if (!isRecord(value)) {
    throw new HttpsError("invalid-argument", "Invalid 'image': must be an object.");
  }
  const mimeType = value["mimeType"];
  if (
    typeof mimeType !== "string" ||
    !(IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)
  ) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid 'image.mimeType': must be one of ${IMAGE_MIME_TYPES.join(", ")}.`,
    );
  }
  if (typeof value["base64"] !== "string") {
    throw new HttpsError("invalid-argument", "Invalid 'image.base64': must be a string.");
  }
  const base64 = stripDataPrefix(value["base64"]);
  if (base64 === "" || !BASE64.test(base64) || base64.length % 4 !== 0) {
    throw new HttpsError("invalid-argument", "Invalid 'image.base64': not valid base64.");
  }
  const decodedBytes = Buffer.from(base64, "base64").byteLength;
  if (decodedBytes < 1 || decodedBytes > MAX_IMAGE_BYTES) {
    throw new HttpsError("invalid-argument", "Invalid 'image.base64': must decode to 1 byte–5 MB.");
  }
  return { mimeType, base64 };
}

export function validateCategoriesField(value: unknown): ValidatedCategory[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CATEGORIES) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid 'categories': must be an array of 1 to ${MAX_CATEGORIES} items.`,
    );
  }
  const seen = new Set<string>();
  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw new HttpsError("invalid-argument", "Invalid 'categories': every item must be an object.");
    }
    const id = entry["id"];
    if (typeof id !== "string" || !CATEGORY_ID.test(id)) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid 'categories.id': must match ^[a-z0-9_-]{1,32}$.",
      );
    }
    if (seen.has(id)) {
      throw new HttpsError("invalid-argument", `Invalid 'categories': duplicate id '${id}'.`);
    }
    seen.add(id);
    // Control chars become spaces, then trim: length applies to the usable
    // label, so an all-control label is rejected instead of stored as spaces.
    const label =
      typeof entry["label"] === "string" ? replaceControlChars(entry["label"]).trim() : "";
    if (label.length < 1 || label.length > MAX_LABEL_LENGTH) {
      throw new HttpsError(
        "invalid-argument",
        `Invalid 'categories.label': must be 1 to ${MAX_LABEL_LENGTH} characters.`,
      );
    }
    return { id, label };
  });
}

export function validateExtractInput(data: unknown): ValidatedExtractInput {
  if (!isRecord(data)) {
    throw new HttpsError("invalid-argument", "Invalid request: expected an object.");
  }
  return {
    tripId: validateTripIdField(data["tripId"]),
    image: validateImageField(data["image"]),
    categories: validateCategoriesField(data["categories"]),
  };
}
