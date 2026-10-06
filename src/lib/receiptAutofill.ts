import type { ExtractionFields } from "./aiApi";

/** The expense fields auto-fill can write, in fill order. */
export type AutofillField = "description" | "category" | "date" | "amount";

/** Field values in the form's own shapes: amount is the input string. */
export interface AutofillCurrent {
  description: string;
  category: string | null;
  date: string;
  amount: string;
}

export interface ApplyReceiptExtractionResult {
  next: AutofillCurrent;
  /** Fields actually written, in fill order. */
  filled: AutofillField[];
}

/** Which user edits mark which fields as touched. */
export type AutofillEdit = "preset" | "description" | "date" | "amount";

/**
 * Fields an edit marks as touched. A preset tap or a description edit marks
 * both linked fields, because each of those writes both category and
 * description. Pure.
 */
export function touchedFieldsForEdit(edit: AutofillEdit): AutofillField[] {
  switch (edit) {
    case "preset":
    case "description":
      return ["description", "category"];
    case "date":
      return ["date"];
    case "amount":
      return ["amount"];
  }
}

/**
 * Merges an extraction result into the form's fields (D14): a field is filled
 * only if the user hasn't touched it since the file was picked and the result
 * value isn't null. Never writes null, 0, or an empty string. Pure.
 */
export function applyReceiptExtraction(
  current: AutofillCurrent,
  touched: ReadonlySet<AutofillField>,
  result: ExtractionFields,
): ApplyReceiptExtractionResult {
  const next: AutofillCurrent = { ...current };
  const filled: AutofillField[] = [];

  if (
    !touched.has("description") &&
    result.description !== null &&
    result.description.trim() !== ""
  ) {
    next.description = result.description;
    filled.push("description");
  }
  if (!touched.has("category") && result.category !== null && result.category !== "") {
    next.category = result.category;
    filled.push("category");
  }
  if (!touched.has("date") && result.date !== null && result.date !== "") {
    next.date = result.date;
    filled.push("date");
  }
  if (
    !touched.has("amount") &&
    typeof result.amount === "number" &&
    Number.isFinite(result.amount) &&
    result.amount > 0
  ) {
    next.amount = result.amount.toFixed(2);
    filled.push("amount");
  }

  return { next, filled };
}
