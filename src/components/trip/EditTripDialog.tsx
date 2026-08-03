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
import type { Trip, Expense, UserProfile } from "@/types";

interface EditTripDialogProps {
  trip: Trip;
  expenses: Expense[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Owner + collaborators available to link */
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
  }) {
    setSubmitting(true);
    try {
      const tripRef = doc(db, "trips", trip.id);
      await updateDoc(tripRef, {
        name: data.name,
        participants: data.participants,
        participantLinks: data.participantLinks,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trip</DialogTitle>
        </DialogHeader>
        <TripForm
          trip={trip}
          expenses={expenses}
          accountOptions={options}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
        {submitting && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/50">
            <div className="text-sm text-muted-foreground">Saving...</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
