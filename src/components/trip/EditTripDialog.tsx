import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TripForm } from "@/components/trip/TripForm";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import type { Trip, Expense } from "@/types";

interface EditTripDialogProps {
  trip: Trip;
  expenses: Expense[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTripDialog({
  trip,
  expenses,
  open,
  onOpenChange,
}: EditTripDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(data: { name: string; participants: string[] }) {
    setSubmitting(true);
    try {
      const tripRef = doc(db, "trips", trip.id);
      await updateDoc(tripRef, {
        name: data.name,
        participants: data.participants,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Trip</DialogTitle>
        </DialogHeader>
        <TripForm
          trip={trip}
          expenses={expenses}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
        {submitting && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/50">
            <div className="text-sm text-muted-foreground">Saving...</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
