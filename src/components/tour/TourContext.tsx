import { createContext } from "react";

export interface TourContextValue {
  openTour: () => void;
  /**
   * Opens the tour at most once per page load. Used by the automatic
   * open so a failing `localStorage` write can't re-open it on every visit.
   */
  autoOpenTour: () => void;
}

export const TourContext = createContext<TourContextValue>({
  openTour: () => {},
  autoOpenTour: () => {},
});
