import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * Daily per-user extraction cap (plan decision D11). The Firestore instance
 * is injected so tests can use a fake that records the call order.
 */

export function utcDayString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Reads `aiUsage/{uid}_{day}`, throws `resource-exhausted` at or over the
 * limit without writing anything, and otherwise increments the count. Call
 * this before the provider call so failed calls count too.
 *
 * @returns the new count.
 */
export async function checkAndIncrementUsage(
  db: Firestore,
  uid: string,
  limit: number,
  day: string = utcDayString(),
): Promise<number> {
  const ref = db.doc(`aiUsage/${uid}_${day}`);
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const stored = snapshot.data()?.["count"];
    const count =
      typeof stored === "number" && Number.isFinite(stored) && stored >= 0
        ? Math.floor(stored)
        : 0;
    if (count >= limit) {
      throw new HttpsError(
        "resource-exhausted",
        `Daily auto-fill limit reached (${limit} per day)`,
      );
    }
    tx.set(
      ref,
      { uid, day, count: count + 1, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return count + 1;
  });
}
