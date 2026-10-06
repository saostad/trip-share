import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface AdminCheckInput {
  /** Whether `admins/{email}` exists. Undefined when the lookup failed. */
  exists: boolean | undefined;
}

/**
 * Decides admin status, failing closed: only a confirmed existing doc
 * means admin. A missing doc, a failed lookup or no email all mean false.
 */
export function resolveIsAdmin(input: AdminCheckInput): boolean {
  return input.exists === true;
}

/** Reads `admins/{trimmed, lowercased email}`. Throws when unreadable. */
export async function isAdminEmail(email: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "admins", email.trim().toLowerCase()));
  return resolveIsAdmin({ exists: snap.exists() });
}
