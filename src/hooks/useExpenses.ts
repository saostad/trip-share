import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Expense } from "@/types";

/**
 * Subscribes to the expenses subcollection for a given trip,
 * ordered by createdAt descending via onSnapshot.
 * Returns expenses array, loading state, and any error.
 * Cleans up the listener on unmount or when tripId changes.
 */
export function useExpenses(tripId: string): {
  expenses: Expense[];
  loading: boolean;
  error: Error | null;
} {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tripId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const expensesRef = collection(db, "trips", tripId, "expenses");
    const expensesQuery = query(expensesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Expense[];
        setExpenses(docs);
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

  return { expenses, loading, error };
}
