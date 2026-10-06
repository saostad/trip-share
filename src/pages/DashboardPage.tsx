import { useEffect } from "react";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { useTrips } from "@/hooks/useTrips";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { useTour } from "@/components/tour/useTour";
import { hasSeenTour } from "@/components/tour/tourStorage";
import { DashboardView, type CreateTripData } from "./DashboardView";

export function DashboardPage() {
  const { trips, loading, error } = useTrips();
  const { user, canCreateTrips, accessLoading } = useAuth();
  const { autoOpenTour } = useTour();

  const settled = !loading && !accessLoading && error === null;
  const inviteFirstRun = settled && !canCreateTrips && trips.length === 0;

  useEffect(() => {
    if (settled && !inviteFirstRun && !hasSeenTour()) {
      autoOpenTour();
    }
  }, [settled, inviteFirstRun, autoOpenTour]);

  async function handleCreateTrip(data: CreateTripData): Promise<boolean> {
    if (!user) return false;
    if (!canCreateTrips) {
      toast.error("Creating trips is invite-only for your account.");
      return false;
    }

    try {
      const tripRef = await addDoc(collection(db, "trips"), {
        ownerId: user.uid,
        name: data.name,
        participants: data.participants,
        participantLinks: data.participantLinks ?? {},
        settlementMethod: data.settlementMethod ?? "greedy",
        settlementGroups: data.settlementGroups ?? [],
        collaboratorIds: [],
        shareToken: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, "trips", tripRef.id, "members", user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      });

      toast.success("Trip created successfully");
      return true;
    } catch {
      toast.error("Failed to create trip. Please try again.");
      return false;
    }
  }

  return (
    <DashboardView
      displayName={user?.displayName ?? null}
      creatorUid={user?.uid ?? null}
      trips={trips}
      loading={loading}
      loadError={error !== null}
      canCreateTrips={canCreateTrips}
      accessLoading={accessLoading}
      accountOptions={
        user
          ? [
              {
                uid: user.uid,
                label: user.displayName || "Me (trip creator)",
                email: user.email,
              },
            ]
          : []
      }
      onCreateTrip={handleCreateTrip}
      header={<Header />}
    />
  );
}
