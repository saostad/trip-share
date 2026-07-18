import { useState } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteTripDialogProps {
  tripId: string;
  tripName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteTripDialog({
  tripId,
  tripName,
  open,
  onOpenChange,
}: DeleteTripDialogProps) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      // Delete all expenses in the subcollection
      const expensesRef = collection(db, "trips", tripId, "expenses");
      const expensesSnapshot = await getDocs(expensesRef);
      const deletePromises = expensesSnapshot.docs.map((expenseDoc) =>
        deleteDoc(doc(db, "trips", tripId, "expenses", expenseDoc.id))
      );
      await Promise.all(deletePromises);

      // Delete the trip document
      await deleteDoc(doc(db, "trips", tripId));

      toast.success("Trip deleted successfully");
      onOpenChange(false);
      navigate("/");
    } catch {
      toast.error("Failed to delete trip. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Trip</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &apos;{tripName}&apos;? This action
            cannot be undone. All expenses will be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
