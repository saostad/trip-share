import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Matches Firestore appConfig/access.mode */
export type AccessMode = "invite_only" | "public";

export interface AccessConfig {
  mode: AccessMode;
  /** Lowercased emails from appConfig/access.allowedEmails */
  allowedEmails: string[];
}

const DEFAULT_PUBLIC: AccessConfig = {
  mode: "public",
  allowedEmails: [],
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Reads appConfig/access.
 * If the document is missing, defaults to public so the app stays usable
 * until you create the config in Firebase Console.
 */
export async function fetchAccessConfig(): Promise<AccessConfig> {
  const snap = await getDoc(doc(db, "appConfig", "access"));
  if (!snap.exists()) {
    return DEFAULT_PUBLIC;
  }

  const data = snap.data();
  const mode: AccessMode =
    data.mode === "invite_only" ? "invite_only" : "public";
  const raw = data.allowedEmails;
  const allowedEmails = Array.isArray(raw)
    ? raw
        .map((e) => (typeof e === "string" ? normalizeEmail(e) : ""))
        .filter(Boolean)
    : [];

  return { mode, allowedEmails };
}

/**
 * Whether this email may create trips.
 * - public mode → everyone
 * - invite_only → only emails on allowedEmails
 *
 * Anyone can still sign in and join trips via a share link.
 */
export function canCreateTrips(
  email: string | null | undefined,
  config: AccessConfig,
): boolean {
  if (config.mode === "public") return true;
  if (!email) return false;
  return config.allowedEmails.includes(normalizeEmail(email));
}
