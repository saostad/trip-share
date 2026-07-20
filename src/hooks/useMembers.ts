import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types";

/**
 * Subscribes to the members subcollection for a given trip.
 * Returns a map of uid -> UserProfile for display purposes.
 */
export function useMembers(tripId: string): {
  members: Record<string, UserProfile>;
  loading: boolean;
} {
  const [members, setMembers] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) {
      setMembers({});
      setLoading(false);
      return;
    }

    const membersRef = collection(db, "trips", tripId, "members");

    const unsubscribe = onSnapshot(
      membersRef,
      (snapshot) => {
        const map: Record<string, UserProfile> = {};
        for (const doc of snapshot.docs) {
          const data = doc.data() as UserProfile;
          map[doc.id] = data;
        }
        setMembers(map);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [tripId]);

  return { members, loading };
}
