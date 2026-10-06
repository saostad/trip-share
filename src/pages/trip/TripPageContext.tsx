import { createContext } from "react";
import type { Expense, Payment, Trip, UserProfile } from "@/types";

export interface PaymentPrefill {
  from: string;
  to: string;
  amount: number;
}

export interface TripPageContextValue {
  tripId: string;
  trip: Trip;
  expenses: Expense[];
  payments: Payment[];
  members: Record<string, UserProfile>;
  isOwner: boolean;
  isArchived: boolean;
  /** My linked participant name, or null when unlinked. */
  myName: string | null;
  archiving: boolean;
  openAddExpense: () => void;
  openEditExpense: (expense: Expense) => void;
  openDeleteExpense: (expense: Expense) => void;
  openAddPayment: (prefill?: PaymentPrefill) => void;
  openEditPayment: (payment: Payment) => void;
  openDeletePayment: (payment: Payment) => void;
  openEditTrip: () => void;
  toggleArchive: () => void;
  openDeleteTrip: () => void;
  openReport: () => void;
  openHelp: () => void;
  downloadExcel: () => void;
}

const TripPageContext = createContext<TripPageContextValue | null>(null);

export { TripPageContext };
