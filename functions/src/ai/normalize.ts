export interface NormalizedFields {
  description: string | null;
  category: string | null;
  date: string | null;
  amount: number | null;
  currency: string | null;
}

export interface NormalizationResult {
  fields: NormalizedFields;
  missing: string[];
}

const MAX_AMOUNT = 1_000_000;
const MIN_DATE = "2000-01-01";
const MAX_DESCRIPTION_LENGTH = 80;
const US_GROUPED = /^\d{1,3}(,\d{3})*(\.\d+)?$/;
const US_PLAIN = /^\d+(\.\d+)?$/;

/** Code-point loop: a control-char regex would trip the linter. */
function removeControlChars(value: string): string {
  let out = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if ((code >= 0x00 && code <= 0x1f) || code === 0x7f) {
      continue;
    }
    out += char;
  }
  return out;
}

function cleanLabel(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return removeControlChars(value).replace(/\s+/g, " ").trim().slice(0, MAX_DESCRIPTION_LENGTH).trim();
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeAmount(total: unknown): number | null {
  if (typeof total === "number") {
    if (!Number.isFinite(total) || total <= 0 || total > MAX_AMOUNT) {
      return null;
    }
    // Check after rounding: anything under half a cent becomes null, never 0.
    const rounded = roundToCents(total);
    return rounded > 0 ? rounded : null;
  }
  if (typeof total !== "string") {
    return null;
  }
  const stripped = removeControlChars(total)
    .replace(/[\s$€£¥₹₩¢]/g, "")
    .trim();
  if (!US_GROUPED.test(stripped) && !US_PLAIN.test(stripped)) {
    return null;
  }
  const value = Number.parseFloat(stripped.replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) {
    return null;
  }
  const rounded = roundToCents(value);
  return rounded > 0 ? rounded : null;
}

function addDaysUtc(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * 86_400_000).toISOString().slice(0, 10);
}

function normalizeDate(value: unknown, todayYmd: string): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const built = new Date(Date.UTC(year, month - 1, day));
  if (
    built.getUTCFullYear() !== year ||
    built.getUTCMonth() !== month - 1 ||
    built.getUTCDate() !== day
  ) {
    return null;
  }
  if (value < MIN_DATE || value > addDaysUtc(todayYmd, 1)) {
    return null;
  }
  return value;
}

function normalizeCurrency(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

/**
 * Validates and normalizes one extracted JSON object. Pure: nothing from the
 * model is passed through without a check, and anything ambiguous becomes
 * `null`. An all-`null` result is still a success.
 */
export function normalizeExtraction(
  raw: unknown,
  categoryIds: readonly string[],
  todayYmd: string = new Date().toISOString().slice(0, 10),
): NormalizationResult {
  const record =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const description = cleanLabel(record["description"]) || cleanLabel(record["merchant"]) || null;
  const category =
    typeof record["category"] === "string" && categoryIds.includes(record["category"])
      ? record["category"]
      : null;
  const date = normalizeDate(record["date"], todayYmd);
  const amount = normalizeAmount(record["total"]);
  const currency = normalizeCurrency(record["currency"]);
  const fields: NormalizedFields = { description, category, date, amount, currency };
  const missing = (["description", "category", "date", "amount"] as const).filter(
    (key) => fields[key] === null,
  );
  return { fields, missing: [...missing] };
}
