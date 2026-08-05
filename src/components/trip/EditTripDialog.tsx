import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TripForm } from "@/components/trip/TripForm";
import type { AccountOption } from "@/components/trip/ParticipantInput";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import type {
  Trip,
  Expense,
  UserProfile,
  SettlementMethod,
  SettlementGroup,
} from "@/types";

interface EditTripDialogProps {
  trip: Trip;
  expenses: Expense[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountOptions?: AccountOption[];
  members?: Record<string, UserProfile>;
}

export function EditTripDialog({
  trip,
  expenses,
  open,
  onOpenChange,
  accountOptions = [],
}: EditTripDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const options = useMemo(() => accountOptions, [accountOptions]);

  async function handleSubmit(data: {
    name: string;
    participants: string[];
    participantLinks: Record<string, string>;
    settlementMethod: SettlementMethod;
    settlementGroups: SettlementGroup[];
  }) {
    if (trip.archived) {
      toast.error("This trip is archived and cannot be edited");
      return;
    }
    setSubmitting(true);
    try {
      const tripRef = doc(db, "trips", trip.id);
      await updateDoc(tripRef, {
        name: data.name,
        participants: data.participants,
        participantLinks: data.participantLinks,
        settlementMethod: data.settlementMethod,
        settlementGroups: data.settlementGroups,
        updatedAt: serverTimestamp(),
      });
      toast.success("Trip updated successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update trip. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col gap-4 overflow-hidden sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit Trip</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <TripForm
            trip={trip}
            expenses={expenses}
            accountOptions={options}
            showSettlementMethod
            defaultParticipantsOpen={false}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        </div>
        {submitting && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/50">
            <div className="text-sm text-muted-foreground">Saving...</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
