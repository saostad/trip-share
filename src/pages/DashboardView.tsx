import { useState, type ReactNode } from "react";
import { TripCard } from "@/components/trip/TripCard";
import { TripForm } from "@/components/trip/TripForm";
import type { AccountOption } from "@/components/trip/ParticipantInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, MapPin, Link2, Lock, Receipt, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AnnotatedTrip } from "@/lib/tripFilters";
import type { SettlementMethod, SettlementGroup } from "@/types";

export interface CreateTripData {
  name: string;
  participants: string[];
  participantLinks: Record<string, string>;
  settlementMethod: SettlementMethod;
  settlementGroups: SettlementGroup[];
}

export interface DashboardViewProps {
  displayName: string | null;
  trips: AnnotatedTrip[];
  loading: boolean;
  loadError: boolean;
  canCreateTrips: boolean;
  accessLoading: boolean;
  accountOptions: AccountOption[];
  /** Returns true when the trip was created; the dialog stays open on false. */
  onCreateTrip: (data: CreateTripData) => boolean | Promise<boolean>;
  header: ReactNode;
}

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
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning-foreground">
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

export function DashboardView({
  displayName,
  trips,
  loading,
  loadError,
  canCreateTrips,
  accessLoading,
  accountOptions,
  onCreateTrip,
  header,
}: DashboardViewProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const showCreateControls = canCreateTrips && !accessLoading;
  const firstName = displayName?.trim().split(/\s+/)[0] ?? null;

  return (
    <div className="min-h-screen bg-background">
      {header}

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {firstName ? `Hi, ${firstName}` : "Hi there"}
            </h1>
            <p className="text-sm text-muted-foreground">Your trips</p>
          </div>
          {showCreateControls && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="size-4" data-icon="inline-start" />
              New Trip
            </Button>
          )}
        </div>

        {loadError && (
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

        {!loading && !accessLoading && !loadError && !canCreateTrips && trips.length === 0 && (
          <InviteOnlyPanel />
        )}

        {!loading && !accessLoading && !loadError && canCreateTrips && trips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex items-center justify-center gap-3" aria-hidden>
              <span className="flex size-12 items-center justify-center rounded-full bg-positive/10 text-positive">
                <Receipt className="size-5" />
              </span>
              <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MapPin className="size-7" />
              </span>
              <span className="flex size-12 items-center justify-center rounded-full bg-warning/15 text-warning-foreground">
                <Users className="size-5" />
              </span>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              No trips yet
            </h2>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Create your first trip to start splitting expenses with friends.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="size-4" data-icon="inline-start" />
              Create your first trip
            </Button>
          </div>
        )}

        {!loading && !accessLoading && !loadError && trips.length > 0 && (
          <div className="space-y-4">
            {!canCreateTrips && (
              <div className="rounded-lg border border-warning/30 bg-warning/15 px-3 py-2.5 text-sm text-warning-foreground">
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
              accountOptions={accountOptions}
              showSettlementMethod
              onSubmit={async (data) => {
                const created = await onCreateTrip(data);
                if (created) setShowCreateDialog(false);
              }}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
