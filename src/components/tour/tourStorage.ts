export const TOUR_SEEN_KEY = "tripshare.tour.v1";

/**
 * True when the welcome tour was already seen. Fail-closed: any storage
 * failure reads as seen, so the tour never shows when it can't record that.
 */
export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) !== null;
  } catch {
    return true;
  }
}

/** Records that the tour was seen, skipped or closed. Never throws. */
export function markTourSeen(): void {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, "1");
  } catch {
    // Private mode or blocked storage: the tour simply may show again.
  }
}
