const KEY_PREFIX = "tripshare.celebrated.v1.";

function keyFor(tripId: string): string {
  return `${KEY_PREFIX}${tripId}`;
}

/** Last celebrated trip-state signature, or null when unknown. Never throws. */
export function readCelebratedSignature(tripId: string): string | null {
  try {
    return localStorage.getItem(keyFor(tripId));
  } catch {
    return null;
  }
}

/** Records a celebrated trip-state signature. Never throws. */
export function writeCelebratedSignature(tripId: string, signature: string): void {
  try {
    localStorage.setItem(keyFor(tripId), signature);
  } catch {
    // Private mode or blocked storage: the card may show again.
  }
}

/** Clears a trip's celebrated signature so it can celebrate again. Never throws. */
export function clearCelebratedSignature(tripId: string): void {
  try {
    localStorage.removeItem(keyFor(tripId));
  } catch {
    // Nothing to clear.
  }
}
