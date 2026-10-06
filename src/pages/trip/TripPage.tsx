import { useState } from "react";
import { useParams, Link, Outlet } from "react-router";
import { useTrip } from "@/hooks/useTrip";
import { useExpenses } from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";
import { useMembers } from "@/hooks/useMembers";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { ExpenseForm } from "@/components/expense/ExpenseForm";
import { EditTripDialog } from "@/components/trip/EditTripDialog";
import { DeleteTripDialog } from "@/components/trip/DeleteTripDialog";
import { SettlementReportDialog } from "@/components/balance/SettlementReportDialog";
import { SettlementHelpDialog } from "@/components/balance/SettlementHelpDialog";
import { PaymentForm } from "@/components/balance/PaymentForm";
import { EditPaymentForm } from "@/components/balance/EditPaymentForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ArrowLeft } from "lucide-react";
import { downloadTripExcel } from "@/lib/exportTripExcel";
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
import type { Expense, Payment, FileAttachment } from "@/types";
import {
  buildAccountOptions,
  linkedParticipantName,
} from "@/lib/useLinkedParticipant";
import { TripPageContext, type PaymentPrefill } from "./TripPageContext";
import { TripShellView } from "./TripShellView";
import { TripTabs } from "./TripTabs";
import { TripFab } from "./Fab";

type ExpenseFormData = {
  description: string;
  category?: string | null;
  date: string;
  amount: number;
  paidBy: string;
  sharedBy: string[];
  attachment?: FileAttachment | null;
};

/** Loading placeholder matching the trip layout: header, tabs, hero, cards. */
export function TripPageSkeleton() {
  return (
    <div
      className="container mx-auto max-w-6xl px-4 py-6"
      role="status"
      aria-label="Loading…"
    >
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="mb-6 hidden gap-1 border-b md:flex">
        <Skeleton className="h-9 w-24 rounded-t-md" />
        <Skeleton className="h-9 w-24 rounded-t-md" />
        <Skeleton className="h-9 w-24 rounded-t-md" />
        <Skeleton className="h-9 w-24 rounded-t-md" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function TripPage() {
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
  const [settlementReportOpen, setSettlementReportOpen] = useState(false);
  const [settlementHelpOpen, setSettlementHelpOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [paymentPrefill, setPaymentPrefill] = useState<PaymentPrefill | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const isOwner = user?.uid === trip?.ownerId;
  const isArchived = Boolean(trip?.archived);
  const loading = tripLoading || expensesLoading || paymentsLoading;

  const accountOptions = buildAccountOptions(trip, user, members);
  const myParticipantName = linkedParticipantName(trip, user?.uid);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <TripPageSkeleton />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-center px-4 py-16">
          <h2 className="mb-2 text-xl font-semibold">Trip not found</h2>
          <p className="mb-6 text-muted-foreground">
            This trip doesn't exist or you don't have access to it.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  function guardArchived(): boolean {
    if (isArchived) {
      toast.error("This trip is archived and cannot be modified");
      return true;
    }
    return false;
  }

  async function handleToggleArchive() {
    if (!tripId || !isOwner) return;
    setArchiving(true);
    try {
      await updateDoc(doc(db, "trips", tripId), {
        archived: !isArchived,
        updatedAt: serverTimestamp(),
      });
      toast.success(
        isArchived ? "Trip unarchived — editing is enabled again" : "Trip archived — all edits locked",
      );
    } catch {
      toast.error("Failed to update archive status. Please try again.");
    } finally {
      setArchiving(false);
    }
  }

  async function handleAddExpense(data: ExpenseFormData) {
    if (!tripId || guardArchived()) return;
    setSubmitting(true);
    try {
      const expensesRef = collection(db, "trips", tripId, "expenses");
      await addDoc(expensesRef, {
        description: data.description,
        category: data.category ?? null,
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

  async function handleEditExpense(data: ExpenseFormData) {
    if (!tripId || !editingExpense || guardArchived()) return;
    setSubmitting(true);
    try {
      const expenseRef = doc(db, "trips", tripId, "expenses", editingExpense.id);
      await updateDoc(expenseRef, {
        description: data.description,
        category: data.category ?? null,
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
    if (!tripId || !deletingExpense || guardArchived()) return;
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
    attachment?: FileAttachment | null;
  }[]) {
    if (!tripId || guardArchived()) return;
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
      toast.success(
        data.length > 1
          ? "Payments recorded successfully"
          : "Payment recorded successfully",
      );
      setAddPaymentOpen(false);
    } catch {
      toast.error("Failed to record payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePayment() {
    if (!tripId || !deletingPayment || guardArchived()) return;
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
    attachment?: FileAttachment | null;
  }) {
    if (!tripId || !editingPayment || guardArchived()) return;
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

  async function handleDownloadExcel() {
    if (!trip) return;
    try {
      await downloadTripExcel(trip, expenses, payments);
      toast.success("Excel file downloaded");
    } catch {
      toast.error("Failed to export Excel. Please try again.");
    }
  }

  return (
    <TripPageContext.Provider
      value={{
        tripId: tripId ?? "",
        trip,
        expenses,
        payments,
        members,
        isOwner,
        isArchived,
        myName: myParticipantName,
        archiving,
        openAddExpense: () => setAddExpenseOpen(true),
        openEditExpense: (expense: Expense) => setEditingExpense(expense),
        openDeleteExpense: (expense: Expense) => setDeletingExpense(expense),
        openAddPayment: (prefill?: PaymentPrefill) => {
          setPaymentPrefill(prefill ?? null);
          setAddPaymentOpen(true);
        },
        openEditPayment: (payment: Payment) => setEditingPayment(payment),
        openDeletePayment: (payment: Payment) => setDeletingPayment(payment),
        openEditTrip: () => setEditTripOpen(true),
        toggleArchive: () => void handleToggleArchive(),
        openDeleteTrip: () => setDeleteTripOpen(true),
        openReport: () => setSettlementReportOpen(true),
        openHelp: () => setSettlementHelpOpen(true),
        downloadExcel: () => void handleDownloadExcel(),
      }}
    >
      <TripShellView
        trip={trip}
        isOwner={isOwner}
        isArchived={isArchived}
        header={<Header />}
        tabs={<TripTabs />}
        fab={<TripFab />}
      >
        <Outlet />
      </TripShellView>

      <SettlementHelpDialog
        open={settlementHelpOpen}
        onOpenChange={setSettlementHelpOpen}
      />

      <SettlementReportDialog
        open={settlementReportOpen}
        onOpenChange={setSettlementReportOpen}
        tripName={trip.name}
        participants={trip.participants}
        expenses={expenses}
        payments={payments}
        settlementMethod={trip.settlementMethod}
      />

      {isOwner && !isArchived && (
        <EditTripDialog
          trip={trip}
          expenses={expenses}
          open={editTripOpen}
          onOpenChange={setEditTripOpen}
          accountOptions={accountOptions}
          members={members}
        />
      )}

      {isOwner && (
        <DeleteTripDialog
          tripId={trip.id}
          tripName={trip.name}
          open={deleteTripOpen}
          onOpenChange={setDeleteTripOpen}
        />
      )}

      <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            participants={trip.participants}
            tripId={tripId}
            defaultPaidBy={myParticipantName ?? undefined}
            onSubmit={handleAddExpense}
            onCancel={() => setAddExpenseOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingExpense}
        onOpenChange={(open) => !open && setEditingExpense(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
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

      <AlertDialog
        open={!!deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingExpense?.description}"?
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

      <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a payment</DialogTitle>
            <DialogDescription>
              When someone pays someone back
            </DialogDescription>
          </DialogHeader>
          <PaymentForm
            key={
              paymentPrefill
                ? `${paymentPrefill.from}-${paymentPrefill.to}-${paymentPrefill.amount}`
                : "manual"
            }
            participants={trip.participants}
            tripId={tripId}
            defaultFrom={myParticipantName ?? undefined}
            prefill={paymentPrefill ?? undefined}
            onSubmit={handleAddPayment}
            onCancel={() => setAddPaymentOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingPayment}
        onOpenChange={(open) => !open && setEditingPayment(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit payment</DialogTitle>
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

      <AlertDialog
        open={!!deletingPayment}
        onOpenChange={(open) => !open && setDeletingPayment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment of{" "}
              {deletingPayment ? `$${deletingPayment.amount.toFixed(2)}` : ""} from{" "}
              {deletingPayment?.from} to {deletingPayment?.to}?
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
    </TripPageContext.Provider>
  );
}
