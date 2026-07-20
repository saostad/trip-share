import { useState } from "react";
import { useParams, Link } from "react-router";
import { useTrip } from "@/hooks/useTrip";
import { useExpenses } from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";
import { useMembers } from "@/hooks/useMembers";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { ExpenseList } from "@/components/expense/ExpenseList";
import { ExpenseForm } from "@/components/expense/ExpenseForm";
import { EditTripDialog } from "@/components/trip/EditTripDialog";
import { DeleteTripDialog } from "@/components/trip/DeleteTripDialog";
import { BalanceSummary } from "@/components/balance/BalanceSummary";
import { SettlementList } from "@/components/balance/SettlementList";
import { PaymentForm } from "@/components/balance/PaymentForm";
import { PaymentList } from "@/components/balance/PaymentList";
import { EditPaymentForm } from "@/components/balance/EditPaymentForm";
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
import type { Expense, Payment } from "@/types";

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { trip, loading: tripLoading } = useTrip(tripId ?? "");
  const { expenses, loading: expensesLoading } = useExpenses(tripId ?? "");
  const { payments, loading: paymentsLoading } = usePayments(tripId ?? "");
  const { members } = useMembers(tripId ?? "");
  const { user } = useAuth();

  const [editTripOpen, setEditTripOpen] = useState(false);
  const [deleteTripOpen, setDeleteTripOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isOwner = user?.uid === trip?.ownerId;
  const loading = tripLoading || expensesLoading || paymentsLoading;

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto max-w-6xl px-4 py-6">
          {/* Header skeleton */}
          <div className="mb-6 animate-pulse">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-muted" />
              <div className="h-7 w-48 rounded bg-muted" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 w-8 rounded-full bg-muted ring-2 ring-background" />
                ))}
              </div>
              <div className="h-5 w-24 rounded bg-muted" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left column: Expense list + balances */}
            <div className="space-y-4">
              {/* Expenses card skeleton */}
              <div className="rounded-xl bg-card p-6 shadow-sm">
                <div className="mb-4 h-5 w-24 rounded bg-muted" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse rounded-lg border border-muted p-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="h-4 w-32 rounded bg-muted" />
                          <div className="h-3 w-24 rounded bg-muted/50" />
                        </div>
                        <div className="h-5 w-16 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balances card skeleton */}
              <div className="rounded-xl bg-card p-6 shadow-sm">
                <div className="mb-4 h-5 w-20 rounded bg-muted" />
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 w-20 rounded bg-muted" />
                      <div className="h-4 w-14 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Settle Up card skeleton */}
              <div className="rounded-xl bg-card p-6 shadow-sm">
                <div className="mb-4 h-5 w-24 rounded bg-muted" />
                <div className="animate-pulse space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-4 w-48 rounded bg-muted" />
                  ))}
                </div>
              </div>
            </div>

            {/* Right column: Form skeleton */}
            <div className="space-y-4">
              <div className="rounded-xl bg-card p-6 shadow-sm">
                <div className="mb-4 h-5 w-28 rounded bg-muted" />
                <div className="animate-pulse space-y-4">
                  <div className="h-9 w-full rounded-md bg-muted" />
                  <div className="h-9 w-full rounded-md bg-muted" />
                  <div className="h-9 w-full rounded-md bg-muted" />
                  <div className="h-9 w-full rounded-md bg-muted" />
                  <div className="flex gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-6 w-16 rounded bg-muted/50" />
                    ))}
                  </div>
                  <div className="h-9 w-full rounded-md bg-muted" />
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
      <div className="min-h-screen bg-background">
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
    attachment?: import("@/types").FileAttachment | null;
  }) {
    if (!tripId) return;
    setSubmitting(true);
    try {
      const expensesRef = collection(db, "trips", tripId, "expenses");
      await addDoc(expensesRef, {
        description: data.description,
        date: data.date,
        amount: data.amount,
        paidBy: data.paidBy,
        sharedBy: data.sharedBy,
        attachment: data.attachment ?? null,
        createdAt: serverTimestamp(),
      });
      toast.success("Expense added successfully");
      setAddExpenseOpen(false);
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
    attachment?: import("@/types").FileAttachment | null;
  }) {
    if (!tripId || !editingExpense) return;
    setSubmitting(true);
    try {
      const expenseRef = doc(db, "trips", tripId, "expenses", editingExpense.id);
      await updateDoc(expenseRef, {
        description: data.description,
        date: data.date,
        amount: data.amount,
        paidBy: data.paidBy,
        sharedBy: data.sharedBy,
        attachment: data.attachment ?? null,
      });
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

  async function handleAddPayment(data: {
    from: string;
    to: string;
    amount: number;
    date: string;
    note: string;
    attachment?: import("@/types").FileAttachment | null;
  }[]) {
    if (!tripId) return;
    setSubmitting(true);
    try {
      const paymentsRef = collection(db, "trips", tripId, "payments");
      for (const payment of data) {
        await addDoc(paymentsRef, {
          from: payment.from,
          to: payment.to,
          amount: payment.amount,
          date: payment.date,
          note: payment.note,
          attachment: payment.attachment ?? null,
          createdAt: serverTimestamp(),
        });
      }
      toast.success(data.length > 1 ? "Payments recorded successfully" : "Payment recorded successfully");
      setAddPaymentOpen(false);
    } catch {
      toast.error("Failed to record payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePayment() {
    if (!tripId || !deletingPayment) return;
    setSubmitting(true);
    try {
      const paymentRef = doc(db, "trips", tripId, "payments", deletingPayment.id);
      await deleteDoc(paymentRef);
      toast.success("Payment deleted successfully");
      setDeletingPayment(null);
    } catch {
      toast.error("Failed to delete payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditPayment(data: {
    from: string;
    to: string;
    amount: number;
    date: string;
    note: string;
    attachment?: import("@/types").FileAttachment | null;
  }) {
    if (!tripId || !editingPayment) return;
    setSubmitting(true);
    try {
      const paymentRef = doc(db, "trips", tripId, "payments", editingPayment.id);
      await updateDoc(paymentRef, {
        from: data.from,
        to: data.to,
        amount: data.amount,
        date: data.date,
        note: data.note,
        attachment: data.attachment ?? null,
      });
      toast.success("Payment updated successfully");
      setEditingPayment(null);
    } catch {
      toast.error("Failed to update payment. Please try again.");
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
    <div className="min-h-screen bg-background">
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
            <CollaboratorList tripId={trip.id} collaboratorIds={trip.collaboratorIds} members={members} isOwner={isOwner} />

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

        {/* Single column layout */}
        <div className="space-y-4">
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Expenses</CardTitle>
              <Button
                size="sm"
                onClick={() => setAddExpenseOpen(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Expense
              </Button>
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
              <BalanceSummary expenses={expenses} participants={trip.participants} payments={payments} />
            </CardContent>
          </Card>

          {/* Settlement List */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle>Settle Up</CardTitle>
            </CardHeader>
            <CardContent>
              <SettlementList expenses={expenses} participants={trip.participants} payments={payments} />
            </CardContent>
          </Card>

          {/* Payments */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payments</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddPaymentOpen(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Record Payment
              </Button>
            </CardHeader>
            <CardContent>
              <PaymentList
                payments={payments}
                participants={trip.participants}
                onEdit={(payment) => setEditingPayment(payment)}
                onDelete={(payment) => setDeletingPayment(payment)}
              />
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

      {/* Add Expense Dialog */}
      <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            participants={trip.participants}
            tripId={tripId}
            onSubmit={handleAddExpense}
            onCancel={() => setAddExpenseOpen(false)}
          />
        </DialogContent>
      </Dialog>

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
              tripId={tripId}
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

      {/* Add Payment Dialog */}
      <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <PaymentForm
            participants={trip.participants}
            tripId={tripId}
            onSubmit={handleAddPayment}
            onCancel={() => setAddPaymentOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={!!editingPayment} onOpenChange={(open) => !open && setEditingPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          {editingPayment && (
            <EditPaymentForm
              payment={editingPayment}
              participants={trip.participants}
              tripId={tripId}
              onSubmit={handleEditPayment}
              onCancel={() => setEditingPayment(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Payment Confirmation */}
      <AlertDialog
        open={!!deletingPayment}
        onOpenChange={(open) => !open && setDeletingPayment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment of {deletingPayment ? `$${deletingPayment.amount.toFixed(2)}` : ""} from {deletingPayment?.from} to {deletingPayment?.to}?
              This will readjust the settlement amounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeletePayment}
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
