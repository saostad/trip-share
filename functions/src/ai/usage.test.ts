import type { Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { describe, expect, it } from "vitest";
import { checkAndIncrementUsage } from "./usage";

interface FakeRef {
  path: string;
}

interface RecordedSet {
  path: string;
  data: Record<string, unknown>;
}

/** A Firestore fake whose transaction records the order of calls. */
function fakeFirestore(existing: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const sets: RecordedSet[] = [];
  const docs = new Map<string, unknown>(Object.entries(existing));
  const tx = {
    get: async (ref: FakeRef) => {
      calls.push(`get ${ref.path}`);
      const data = docs.get(ref.path);
      return { exists: data !== undefined, data: () => data as Record<string, unknown> | undefined };
    },
    set: (ref: FakeRef, data: Record<string, unknown>, opts: unknown) => {
      calls.push(`set ${ref.path}`);
      sets.push({ path: ref.path, data });
      docs.set(ref.path, { ...(docs.get(ref.path) as object | undefined), ...data, opts });
    },
  };
  const db = {
    doc: (path: string): FakeRef => ({ path }),
    runTransaction: (fn: (t: typeof tx) => Promise<number>) => fn(tx),
  };
  return { db: db as unknown as Firestore, calls, sets };
}

describe("checkAndIncrementUsage", () => {
  it("starts a missing doc at 1 with a get before the set", async () => {
    const { db, calls, sets } = fakeFirestore();
    await expect(checkAndIncrementUsage(db, "uid-1", 30, "2026-10-06")).resolves.toBe(1);
    expect(calls).toEqual(["get aiUsage/uid-1_2026-10-06", "set aiUsage/uid-1_2026-10-06"]);
    expect(sets[0]?.path).toBe("aiUsage/uid-1_2026-10-06");
    expect(sets[0]?.data).toMatchObject({ uid: "uid-1", day: "2026-10-06", count: 1 });
  });

  it("increments under the limit", async () => {
    const { db, calls, sets } = fakeFirestore({ "aiUsage/uid-1_2026-10-06": { count: 2 } });
    await expect(checkAndIncrementUsage(db, "uid-1", 3, "2026-10-06")).resolves.toBe(3);
    expect(calls).toEqual(["get aiUsage/uid-1_2026-10-06", "set aiUsage/uid-1_2026-10-06"]);
    expect(sets[0]?.data).toMatchObject({ count: 3 });
  });

  it("throws at the limit without writing", async () => {
    const { db, calls, sets } = fakeFirestore({ "aiUsage/uid-1_2026-10-06": { count: 3 } });
    try {
      await checkAndIncrementUsage(db, "uid-1", 3, "2026-10-06");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpsError);
      expect((error as HttpsError).code).toBe("resource-exhausted");
      expect((error as HttpsError).message).toBe("Daily auto-fill limit reached (3 per day)");
      expect(calls).toEqual(["get aiUsage/uid-1_2026-10-06"]);
      expect(sets).toHaveLength(0);
      return;
    }
    expect.unreachable("expected a resource-exhausted HttpsError");
  });

  it("treats a corrupt count as zero", async () => {
    const { db, sets } = fakeFirestore({ "aiUsage/uid-1_2026-10-06": { count: "lots" } });
    await expect(checkAndIncrementUsage(db, "uid-1", 30, "2026-10-06")).resolves.toBe(1);
    expect(sets[0]?.data).toMatchObject({ count: 1 });
  });
});
