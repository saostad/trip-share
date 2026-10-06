import { useContext } from "react";
import { TourContext } from "./TourContext";

export function useTour() {
  return useContext(TourContext);
}
