import type { Timestamp } from "firebase/firestore";

/** How suggested Settle Up transfers are computed */
export type SettlementMethod = "greedy" | "pairwise" | "smallest";

export interface Trip {
  id: string;
  ownerId: string;
  name: string;
  participants: string[];
  collaboratorIds: string[]; // UIDs of users who joined via share link
  /**
   * Optional map: participant display name → Firebase Auth uid.
   * Used to pre-select payers and (later) notify linked accounts.
   * Names not in the map are unlinked “cash” participants.
   */
  participantLinks?: Record<string, string>;
  /**
   * How Settle Up suggestions are computed. Owner-only setting.
   * Defaults to "greedy" when missing (existing trips).
   */
  settlementMethod?: SettlementMethod;
  shareToken: string | null; // random token for share link; null = revoked/disabled
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FileAttachment {
  name: string;
  url: string;
  path: string;
  type: string;
}

export interface Expense {
  id: string;
  description: string;
  /** Optional preset category id (e.g. "food", "hotel") for icons */
  category?: string | null;
  date: string; // YYYY-MM-DD
  amount: number; // positive, in dollars
  paidBy: string; // must be in parent trip's participants
  sharedBy: string[]; // non-empty subset of participants
  attachment?: FileAttachment | null;
  createdAt: Timestamp;
}

export interface Transaction {
  from: string; // debtor
  to: string; // creditor
  amount: number; // positive, rounded to cents
}

export interface Payment {
  id: string;
  from: string; // person who paid
  to: string; // person who received
  amount: number; // positive, in dollars
  date: string; // YYYY-MM-DD
  note?: string;
  attachment?: FileAttachment | null;
  createdAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}

export type TripRole = "owner" | "collaborator";
