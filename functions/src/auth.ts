import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

/** Checks whether the lowercased admin email has a doc in `admins/`. */
export type AdminDocLookup = (normalizedEmail: string) => Promise<boolean>;

async function firestoreAdminDocExists(normalizedEmail: string): Promise<boolean> {
  const snapshot = await getFirestore().doc(`admins/${normalizedEmail}`).get();
  return snapshot.exists;
}

/**
 * Requires the caller to be an admin (plan decision D5): signed in, with a
 * verified email, and a doc at `admins/{email.trim().toLowerCase()}`.
 * The lookup is injectable so tests can run without touching Firestore.
 *
 * @returns the normalized (trimmed, lowercased) admin email.
 * @throws `unauthenticated` when there is no auth, `permission-denied`
 * otherwise. Fails closed: anything unexpected means denied.
 */
export async function requireAdmin(
  request: CallableRequest,
  adminDocExists: AdminDocLookup = firestoreAdminDocExists,
): Promise<string> {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const email = auth.token.email;
  if (auth.token.email_verified !== true || typeof email !== "string") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === "") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  if (!(await adminDocExists(normalizedEmail))) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return normalizedEmail;
}
