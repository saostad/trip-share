import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export interface ReceiptParseResult {
  amount: number | null;
  date: string | null;
  merchant: string | null;
  currency: string | null;
}

export async function parseReceiptFromUrl(
  imageUrl: string,
  mimeType?: string
): Promise<ReceiptParseResult> {
  const callable = httpsCallable<
    { imageUrl: string; mimeType?: string },
    ReceiptParseResult
  >(functions, "parseReceipt");

  const { data } = await callable({
    imageUrl,
    mimeType,
  });

  return data;
}
