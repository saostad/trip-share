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
import { Plus, MapPin, Link2, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { SettlementMethod, SettlementGroup } from "@/types";

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

function InviteOnlyPanel() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-12 text-center shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Lock className="h-6 w-6" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-foreground">
        Invite-only for new trips
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        Creating trips is limited to invited accounts. You can still join a trip
        if someone shares an invite link with you—open that link after signing
        in.
      </p>
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-left text-xs text-muted-foreground">
        <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Ask the trip organizer for a share link (it looks like{" "}
          <span className="font-medium text-foreground">/join/…</span>).
        </span>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { trips, loading, error } = useTrips();
  const { user, canCreateTrips, accessLoading } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const showCreateControls = canCreateTrips && !accessLoading;

  async function handleCreateTrip(data: {
    name: string;
    participants: string[];
    participantLinks: Record<string, string>;
    settlementMethod: SettlementMethod;
    settlementGroups: SettlementGroup[];
  }) {
    if (!user) return;
    if (!canCreateTrips) {
      toast.error("Creating trips is invite-only for your account.");
      return;
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
      setShowCreateDialog(false);
    } catch {
      toast.error("Failed to create trip. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">My Trips</h1>
          {showCreateControls && (
            <Button
              className="bg-emerald-500 text-white hover:bg-emerald-600"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="size-4" data-icon="inline-start" />
              New Trip
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load trips. Please try again.
          </div>
        )}

        {(loading || accessLoading) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TripCardSkeleton />
            <TripCardSkeleton />
            <TripCardSkeleton />
          </div>
        )}

        {!loading && !accessLoading && !error && !canCreateTrips && trips.length === 0 && (
          <InviteOnlyPanel />
        )}

        {!loading && !accessLoading && !error && canCreateTrips && trips.length === 0 && (
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

        {!loading && !accessLoading && !error && trips.length > 0 && (
          <div className="space-y-4">
            {!canCreateTrips && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-100">
                Creating new trips is invite-only. You can still open trips you
                joined via a share link.
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map(({ trip, role }) => (
                <TripCard key={trip.id} trip={trip} role={role} />
              ))}
            </div>
          </div>
        )}
      </main>

      {showCreateControls && (
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
      )}
    </div>
  );
}
