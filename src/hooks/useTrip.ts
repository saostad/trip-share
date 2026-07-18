import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Trip } from "@/types";

/**
 * Subscribes to a single trip document by ID via onSnapshot.
 * Returns the trip data, loading state, and any error.
 * Cleans up the listener on unmount or when tripId changes.
 */
export function useTrip(tripId: string): {
  trip: Trip | null;
  loading: boolean;
  error: Error | null;
} {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tripId) {
      setTrip(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const tripRef = doc(db, "trips", tripId);
    const unsubscribe = onSnapshot(
      tripRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setTrip({ id: snapshot.id, ...snapshot.data() } as Trip);
        } else {
          setTrip(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [tripId]);

  return { trip, loading, error };
}
