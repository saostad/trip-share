import { useContext } from "react";
import {
  TripPageContext,
  type TripPageContextValue,
} from "./TripPageContext";

export function useTripPage(): TripPageContextValue {
  const value = useContext(TripPageContext);
  if (!value) throw new Error("useTripPage must be used inside TripPage");
  return value;
}
