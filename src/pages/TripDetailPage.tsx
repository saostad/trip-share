import { useState } from "react";
import { useParams, Link } from "react-router";
import { useTrip } from "@/hooks/useTrip";
import { useExpenses } from "@/hooks/useExpenses";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { ExpenseList } from "@/components/expense/ExpenseList";
import { ExpenseForm } from "@/components/expense/ExpenseForm";
import { EditTripDialog } from "@/components/trip/EditTripDialog";
import { DeleteTripDialog } from "@/components/trip/DeleteTripDialog";
import { BalanceSummary } from "@/components/balance/BalanceSummary";
import { SettlementList } from "@/components/balance/SettlementList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AvatarGroup } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareLinkSection } from "@/components/trip/ShareLinkSection";
import { CollaboratorList } from "@/components/trip/CollaboratorList";
import { ArrowLeft, Pencil, Trash2, Plus } from "lucide-react";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import type { Expense } from "@/types";

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { trip, loading: tripLoading } = useTrip(tripId ?? "");
  const { expenses, loading: expensesLoading } = useExpenses(tripId ?? "");
  const { user } = useAuth();

  const [editTripOpen, setEditTripOpen] = useState(false);
  const [deleteTripOpen, setDeleteTripOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isOwner = user?.uid === trip?.ownerId;
  const loading = tripLoading || expensesLoading;

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto max-w-6xl px-4 py-6">
          {/* Header skeleton */}
          <div className="mb-6 animate-pulse">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gray-200" />
              <div className="h-7 w-48 rounded bg-gray-200" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 w-8 rounded-full bg-gray-200 ring-2 ring-white" />
                ))}
              </div>
              <div className="h-5 w-24 rounded bg-gray-200" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left column: Expense list + balances */}
            <div className="space-y-4">
              {/* Expenses card skeleton */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 h-5 w-24 rounded bg-gray-200" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse rounded-lg border border-gray-100 p-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="h-4 w-32 rounded bg-gray-200" />
                          <div className="h-3 w-24 rounded bg-gray-100" />
                        </div>
                        <div className="h-5 w-16 rounded bg-gray-200" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balances card skeleton */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 h-5 w-20 rounded bg-gray-200" />
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 w-20 rounded bg-gray-200" />
                      <div className="h-4 w-14 rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Settle Up card skeleton */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 h-5 w-24 rounded bg-gray-200" />
                <div className="animate-pulse space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-4 w-48 rounded bg-gray-200" />
                  ))}
                </div>
              </div>
            </div>

            {/* Right column: Form skeleton */}
            <div className="space-y-4">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 h-5 w-28 rounded bg-gray-200" />
                <div className="animate-pulse space-y-4">
                  <div className="h-9 w-full rounded-md bg-gray-200" />
                  <div className="h-9 w-full rounded-md bg-gray-200" />
                  <div className="h-9 w-full rounded-md bg-gray-200" />
                  <div className="h-9 w-full rounded-md bg-gray-200" />
                  <div className="flex gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-6 w-16 rounded bg-gray-100" />
                    ))}
                  </div>
                  <div className="h-9 w-full rounded-md bg-gray-200" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trip not found
  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-center px-4 py-16">
          <h2 className="mb-2 text-xl font-semibold">Trip not found</h2>
          <p className="mb-6 text-muted-foreground">
            This trip doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  async function handleAddExpense(data: {
    description: string;
    date: string;
    amount: number;
    paidBy: string;
    sharedBy: string[];
  }) {
    if (!tripId) return;
    setSubmitting(true);
    try {
      const expensesRef = collection(db, "trips", tripId, "expenses");
      await addDoc(expensesRef, {
        ...data,
        createdAt: serverTimestamp(),
      });
      toast.success("Expense added successfully");
    } catch {
      toast.error("Failed to add expense. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditExpense(data: {
    description: string;
    date: string;
    amount: number;
    paidBy: string;
    sharedBy: string[];
  }) {
    if (!tripId || !editingExpense) return;
    setSubmitting(true);
    try {
      const expenseRef = doc(db, "trips", tripId, "expenses", editingExpense.id);
      await updateDoc(expenseRef, data);
      toast.success("Expense updated successfully");
      setEditingExpense(null);
    } catch {
      toast.error("Failed to update expense. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteExpense() {
    if (!tripId || !deletingExpense) return;
    setSubmitting(true);
    try {
      const expenseRef = doc(db, "trips", tripId, "expenses", deletingExpense.id);
      await deleteDoc(expenseRef);
      toast.success("Expense deleted successfully");
      setDeletingExpense(null);
    } catch {
      toast.error("Failed to delete expense. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto max-w-6xl px-4 py-6">
        {/* Trip Header */}
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">{trip.name}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Participant Avatars */}
            <div className="flex items-center gap-2">
              <AvatarGroup>
                {trip.participants.slice(0, 5).map((participant) => (
                  <Avatar key={participant} size="sm">
                    <AvatarFallback>{getInitials(participant)}</AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
              {trip.participants.length > 5 && (
                <span className="text-sm text-muted-foreground">
                  +{trip.participants.length - 5} more
                </span>
              )}
            </div>

            {/* Collaborator list */}
            <CollaboratorList collaboratorIds={trip.collaboratorIds} />

            {/* Owner controls */}
            {isOwner && (
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditTripOpen(true)}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit Trip
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTripOpen(true)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Two-column layout: expenses left, form + balances right */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left column: Expense List */}
          <div className="space-y-4">
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle>Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <ExpenseList
                  expenses={expenses}
                  participants={trip.participants}
                  onEdit={(expense) => setEditingExpense(expense)}
                  onDelete={(expense) => setDeletingExpense(expense)}
                />
              </CardContent>
            </Card>

            {/* Balance Summary */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle>Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <BalanceSummary expenses={expenses} participants={trip.participants} />
              </CardContent>
            </Card>

            {/* Settlement List */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle>Settle Up</CardTitle>
              </CardHeader>
              <CardContent>
                <SettlementList expenses={expenses} participants={trip.participants} />
              </CardContent>
            </Card>
          </div>

          {/* Right column: Add Expense Form */}
          <div className="space-y-4">
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Expense
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ExpenseForm
                  participants={trip.participants}
                  onSubmit={handleAddExpense}
                />
                {submitting && (
                  <div className="mt-2 text-center text-sm text-muted-foreground">
                    Saving...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Share Link - Owner only */}
            {isOwner && (
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle>Share Link</CardTitle>
                </CardHeader>
                <CardContent>
                  <ShareLinkSection trip={trip} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Edit Trip Dialog (Owner Only) */}
      {isOwner && (
        <EditTripDialog
          trip={trip}
          expenses={expenses}
          open={editTripOpen}
          onOpenChange={setEditTripOpen}
        />
      )}

      {/* Delete Trip Dialog (Owner Only) */}
      {isOwner && (
        <DeleteTripDialog
          tripId={trip.id}
          tripName={trip.name}
          open={deleteTripOpen}
          onOpenChange={setDeleteTripOpen}
        />
      )}

      {/* Edit Expense Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <ExpenseForm
              expense={editingExpense}
              participants={trip.participants}
              onSubmit={handleEditExpense}
              onCancel={() => setEditingExpense(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Expense Confirmation */}
      <AlertDialog
        open={!!deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingExpense?.description}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteExpense}
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
