import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Whether receipt auto-fill is on. Only `enabled === true` means on — a
 * missing doc, any other value, or an error all mean off (fail closed: the
 * client makes no extraction call). Pure.
 */
export function parseAutofillEnabled(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false;
  return (data as { enabled?: unknown }).enabled === true;
}

/** Reads `appConfig/ai` and reports whether auto-fill is enabled. Never throws. */
export async function fetchAutofillEnabled(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "appConfig", "ai"));
    if (!snap.exists()) return false;
    return parseAutofillEnabled(snap.data());
  } catch (err: unknown) {
    console.warn("[autofill] could not load appConfig/ai", err);
    return false;
  }
}
