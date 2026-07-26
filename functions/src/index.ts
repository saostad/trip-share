import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

initializeApp();

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const MODEL = "gemini-3.5-flash-lite";

interface ParseReceiptRequest {
  imageUrl: string;
  mimeType?: string;
}

interface ParseReceiptResult {
  amount: number | null;
  date: string | null;
  merchant: string | null;
  currency: string | null;
}

const PROMPT = `You are extracting data from a receipt or invoice photo.
Return ONLY a JSON object with these keys:
- amount: number | null (the total amount paid, not tax alone; use decimal dollars e.g. 42.5)
- date: string | null (ISO date YYYY-MM-DD if found)
- merchant: string | null (store or vendor name)
- currency: string | null (e.g. USD, EUR)

Rules:
- Prefer TOTAL / AMOUNT DUE / GRAND TOTAL over subtotals.
- If a field is unclear, use null.
- No markdown, no explanation — JSON only.`;

export const parseReceipt = onCall(
  {
    secrets: [geminiApiKey],
    cors: true,
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const data = request.data as ParseReceiptRequest;
    if (!data?.imageUrl || typeof data.imageUrl !== "string") {
      throw new HttpsError("invalid-argument", "imageUrl is required.");
    }

    // Basic allowlist: Firebase Storage download URLs / Google storage
    if (
      !data.imageUrl.includes("firebasestorage.googleapis.com") &&
      !data.imageUrl.includes("storage.googleapis.com")
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Only Firebase Storage images are supported."
      );
    }

    let imageBytes: ArrayBuffer;
    let contentType = data.mimeType || "image/jpeg";

    try {
      const res = await fetch(data.imageUrl);
      if (!res.ok) {
        throw new Error(`Fetch failed: ${res.status}`);
      }
      const ct = res.headers.get("content-type");
      if (ct) contentType = ct.split(";")[0].trim();
      imageBytes = await res.arrayBuffer();
    } catch {
      throw new HttpsError("not-found", "Could not download receipt image.");
    }

    if (imageBytes.byteLength > 8 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "Image too large (max 8MB).");
    }

    if (!contentType.startsWith("image/") && contentType !== "application/pdf") {
      throw new HttpsError(
        "invalid-argument",
        "Unsupported file type for OCR."
      );
    }

    const base64 = Buffer.from(imageBytes).toString("base64");
    const key = geminiApiKey.value();
    if (!key) {
      throw new HttpsError("failed-precondition", "GEMINI_API_KEY not configured.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;

    let geminiRes: Response;
    try {
      geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                {
                  inline_data: {
                    mime_type: contentType,
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
            responseMimeType: "application/json",
          },
        }),
      });
    } catch {
      throw new HttpsError("internal", "Failed to reach Gemini API.");
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      console.error("Gemini error", geminiRes.status, errText);
      throw new HttpsError(
        "internal",
        `Gemini request failed (${geminiRes.status}).`
      );
    }

    const body = (await geminiRes.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text =
      body.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
      "";

    const parsed = safeParseResult(text);
    // Touch auth so unused import isn't flagged if tree-shaken oddly
    void getAuth;
    return parsed;
  }
);

function safeParseResult(text: string): ParseReceiptResult {
  const empty: ParseReceiptResult = {
    amount: null,
    date: null,
    merchant: null,
    currency: null,
  };

  try {
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const obj = JSON.parse(cleaned) as Record<string, unknown>;

    let amount: number | null = null;
    if (typeof obj.amount === "number" && Number.isFinite(obj.amount)) {
      amount = Math.round(obj.amount * 100) / 100;
    } else if (typeof obj.amount === "string") {
      const n = parseFloat(obj.amount.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(n)) amount = Math.round(n * 100) / 100;
    }

    let date: string | null = null;
    if (typeof obj.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(obj.date)) {
      date = obj.date;
    }

    const merchant =
      typeof obj.merchant === "string" && obj.merchant.trim()
        ? obj.merchant.trim().slice(0, 80)
        : null;

    const currency =
      typeof obj.currency === "string" && obj.currency.trim()
        ? obj.currency.trim().slice(0, 8).toUpperCase()
        : null;

    return { amount, date, merchant, currency };
  } catch {
    return empty;
  }
}
