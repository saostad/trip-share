import type { Timestamp } from "firebase/firestore";

export interface Trip {
  id: string;
  ownerId: string;
  name: string;
  participants: string[];
  collaboratorIds: string[]; // UIDs of users who joined via share link
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
