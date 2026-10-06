import { createContext } from "react";

export interface TourContextValue {
  openTour: () => void;
}

export const TourContext = createContext<TourContextValue>({
  openTour: () => {},
});
