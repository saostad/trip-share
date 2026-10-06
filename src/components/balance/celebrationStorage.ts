const KEY_PREFIX = "tripshare.celebrated.v1.";

/**
 * In-memory fallback when localStorage throws (private mode, blocked
 * storage): entries are `${tripId}\n${signature}`, so a burst fires at
 * most once per page load. Never persisted.
 */
const memory = new Set<string>();

function keyFor(tripId: string): string {
  return `${KEY_PREFIX}${tripId}`;
}

function memoryKey(tripId: string, signature: string): string {
  return `${tripId}\n${signature}`;
}

/** Last celebrated trip-state signature, or null when unknown. Never throws. */
export function readCelebratedSignature(tripId: string): string | null {
  try {
    return localStorage.getItem(keyFor(tripId));
  } catch {
    return null;
  }
}

/** Whether this exact trip state already celebrated, in either store. */
export function hasCelebratedSignature(
  tripId: string,
  signature: string,
): boolean {
  try {
    if (localStorage.getItem(keyFor(tripId)) === signature) return true;
  } catch {
    // Fall through to the in-memory set.
  }
  return memory.has(memoryKey(tripId, signature));
}

/** Records a celebrated trip-state signature. Never throws. */
export function writeCelebratedSignature(
  tripId: string,
  signature: string,
): void {
  try {
    localStorage.setItem(keyFor(tripId), signature);
  } catch {
    memory.add(memoryKey(tripId, signature));
  }
}

/** Clears a trip's celebrated state from both stores. Never throws. */
export function clearCelebratedSignature(tripId: string): void {
  try {
    localStorage.removeItem(keyFor(tripId));
  } catch {
    // Nothing to clear.
  }
  const prefix = `${tripId}\n`;
  for (const key of memory) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}
