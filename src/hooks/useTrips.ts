import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Trip } from "@/types";
import type { AnnotatedTrip } from "@/lib/tripFilters";

/**
 * Subscribes to trips where the current user is either the owner or a collaborator.
 * Merges results from two Firestore queries client-side and annotates each trip with the user's role.
 */
export function useTrips(): {
  trips: AnnotatedTrip[];
  loading: boolean;
  error: Error | null;
} {
  const { user } = useAuth();
  const [ownedTrips, setOwnedTrips] = useState<Trip[]>([]);
  const [collaboratedTrips, setCollaboratedTrips] = useState<Trip[]>([]);
  const [loadingOwned, setLoadingOwned] = useState(true);
  const [loadingCollaborated, setLoadingCollaborated] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setOwnedTrips([]);
      setCollaboratedTrips([]);
      setLoadingOwned(false);
      setLoadingCollaborated(false);
      return;
    }

    const tripsRef = collection(db, "trips");

    // Query 1: trips where ownerId == current user UID
    const ownedQuery = query(tripsRef, where("ownerId", "==", user.uid));
    const unsubOwned = onSnapshot(
      ownedQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const trips = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Trip[];
        setOwnedTrips(trips);
        setLoadingOwned(false);
      },
      (err) => {
        setError(err);
        setLoadingOwned(false);
      },
    );

    // Query 2: trips where collaboratorIds array-contains current user UID
    const collaboratedQuery = query(
      tripsRef,
      where("collaboratorIds", "array-contains", user.uid),
    );
    const unsubCollaborated = onSnapshot(
      collaboratedQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const trips = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Trip[];
        setCollaboratedTrips(trips);
        setLoadingCollaborated(false);
      },
      (err) => {
        setError(err);
        setLoadingCollaborated(false);
      },
    );

    // Clean up both listeners on unmount
    return () => {
      unsubOwned();
      unsubCollaborated();
    };
  }, [user]);

  // Merge and deduplicate by trip ID, annotate with role
  const trips: AnnotatedTrip[] = [];
  const seenIds = new Set<string>();

  for (const trip of ownedTrips) {
    if (!seenIds.has(trip.id)) {
      seenIds.add(trip.id);
      trips.push({ trip, role: "owner" });
    }
  }

  for (const trip of collaboratedTrips) {
    if (!seenIds.has(trip.id)) {
      seenIds.add(trip.id);
      trips.push({ trip, role: "collaborator" });
    }
  }

  const loading = loadingOwned || loadingCollaborated;

  return { trips, loading, error };
}
