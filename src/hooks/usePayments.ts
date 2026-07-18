import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Payment } from "@/types";

/**
 * Subscribes to the payments subcollection for a given trip,
 * ordered by createdAt descending via onSnapshot.
 */
export function usePayments(tripId: string): {
  payments: Payment[];
  loading: boolean;
  error: Error | null;
} {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tripId) {
      setPayments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const paymentsRef = collection(db, "trips", tripId, "payments");
    const paymentsQuery = query(paymentsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Payment[];
        setPayments(docs);
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

  return { payments, loading, error };
}
