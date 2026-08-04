import { useState } from "react";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { TripCard } from "@/components/trip/TripCard";
import { TripForm } from "@/components/trip/TripForm";
import { useTrips } from "@/hooks/useTrips";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { SettlementMethod } from "@/types";

function TripCardSkeleton() {
  return (
    <Card className="rounded-xl p-6 shadow-sm">
      <div className="flex animate-pulse flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="h-5 w-20 rounded-full bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-muted" />
          <div className="h-7 w-7 rounded-full bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="h-3 w-20 rounded bg-muted" />
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { trips, loading, error } = useTrips();
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  async function handleCreateTrip(data: {
    name: string;
    participants: string[];
    participantLinks: Record<string, string>;
    settlementMethod: SettlementMethod;
  }) {
    if (!user) return;

    try {
      const tripRef = await addDoc(collection(db, "trips"), {
        ownerId: user.uid,
        name: data.name,
        participants: data.participants,
        participantLinks: data.participantLinks ?? {},
        settlementMethod: data.settlementMethod ?? "greedy",
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
      setShowCreateDialog(false);
    } catch {
      toast.error("Failed to create trip. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">My Trips</h1>
          <Button
            className="bg-emerald-500 text-white hover:bg-emerald-600"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="size-4" data-icon="inline-start" />
            New Trip
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load trips. Please try again.
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TripCardSkeleton />
            <TripCardSkeleton />
            <TripCardSkeleton />
          </div>
        )}

        {!loading && !error && trips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MapPin className="mb-4 size-12 text-muted-foreground/50" />
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              No trips yet
            </h2>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Create your first trip to start splitting expenses with friends.
            </p>
            <Button
              className="bg-emerald-500 text-white hover:bg-emerald-600"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="size-4" data-icon="inline-start" />
              Create your first trip
            </Button>
          </div>
        )}

        {!loading && !error && trips.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map(({ trip, role }) => (
              <TripCard key={trip.id} trip={trip} role={role} />
            ))}
          </div>
        )}
      </main>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Trip</DialogTitle>
          </DialogHeader>
          <TripForm
            accountOptions={
              user
                ? [
                    {
                      uid: user.uid,
                      label: user.displayName || "Me (owner)",
                      email: user.email,
                    },
                  ]
                : []
            }
            showSettlementMethod
            onSubmit={handleCreateTrip}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
