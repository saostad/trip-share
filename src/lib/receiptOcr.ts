import { createWorker } from "tesseract.js";

export interface ReceiptOcrResult {
  amount: number | null;
  date: string | null; // YYYY-MM-DD
  merchant: string | null;
  rawText: string;
}

/** Parse common receipt totals from OCR text. */
export function parseReceiptText(text: string): Omit<ReceiptOcrResult, "rawText"> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const amount = extractAmount(text, lines);
  const date = extractDate(text);
  const merchant = extractMerchant(lines);

  return { amount, date, merchant };
}

function extractAmount(text: string, lines: string[]): number | null {
  const labeled =
    /(?:total|amount\s*due|balance\s*due|grand\s*total|amount\s*paid)\s*[:.]?\s*\$?\s*([0-9]{1,6}(?:[.,][0-9]{2})?)/gi;

  const labeledMatches: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = labeled.exec(text)) !== null) {
    const n = normalizeMoney(m[1]);
    if (n !== null) labeledMatches.push(n);
  }
  if (labeledMatches.length) {
    return Math.max(...labeledMatches);
  }

  // Fallback: largest $-looking amount in the last third of the receipt
  const tail = lines.slice(Math.floor(lines.length * 0.5)).join("\n");
  const money = /\$?\s*([0-9]{1,5}[.,][0-9]{2})/g;
  const found: number[] = [];
  while ((m = money.exec(tail)) !== null) {
    const n = normalizeMoney(m[1]);
    if (n !== null && n >= 0.5 && n < 100_000) found.push(n);
  }
  if (!found.length) return null;
  return Math.max(...found);
}

function normalizeMoney(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "");
  // European style 12,50 → already handled if comma was decimal; if both, prefer last 2 digits
  let s = raw.includes(",") && raw.includes(".")
    ? raw.replace(/\./g, "").replace(",", ".")
    : cleaned.includes(",") && /^\d+,\d{2}$/.test(raw)
      ? raw.replace(",", ".")
      : cleaned;
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function extractDate(text: string): string | null {
  // YYYY-MM-DD
  let m = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) return toIso(m[1], m[2], m[3]);

  // MM/DD/YYYY or MM-DD-YYYY
  m = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (m) return toIso(m[3], m[1], m[2]);

  // DD/MM/YYYY ambiguous — assume US MM/DD if first <= 12
  return null;
}

function toIso(y: string, mo: string, d: string): string | null {
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function extractMerchant(lines: string[]): string | null {
  // First non-trivial line often is store name
  for (const line of lines.slice(0, 6)) {
    if (line.length < 3 || line.length > 40) continue;
    if (/^\d/.test(line)) continue;
    if (/total|receipt|invoice|tel|www\.|http/i.test(line)) continue;
    if (/^\$?\d/.test(line)) continue;
    return line.replace(/[^\w\s&'-]/g, "").trim() || null;
  }
  return null;
}

/** Run Tesseract on an image URL or File/Blob. */
export async function runReceiptOcr(
  source: string | File | Blob,
  onProgress?: (pct: number) => void
): Promise<ReceiptOcrResult> {
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(source);
    const parsed = parseReceiptText(text);
    return { ...parsed, rawText: text };
  } finally {
    await worker.terminate();
  }
}
