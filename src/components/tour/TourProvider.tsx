import { useCallback, useMemo, useState, type ReactNode } from "react";
import { TourContext } from "./TourContext";
import { WelcomeTour } from "./WelcomeTour";
import { markTourSeen } from "./tourStorage";

export function TourProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openTour = useCallback(() => setOpen(true), []);
  const closeTour = useCallback(() => {
    markTourSeen();
    setOpen(false);
  }, []);

  const value = useMemo(() => ({ openTour }), [openTour]);

  return (
    <TourContext.Provider value={value}>
      {children}
      <WelcomeTour open={open} onClose={closeTour} />
    </TourContext.Provider>
  );
}
