import type { Expense, Payment, Trip } from "@/types";
import type { Timestamp } from "firebase/firestore";

// Minimal Timestamp stand-in for dev fixtures only.
// TripCard checks `typeof timestamp.toDate === "function"`, so this is enough.
export function previewTimestamp(iso: string): Timestamp {
  return {
    toDate: () => new Date(iso),
  } as unknown as Timestamp;
}

const fakeTimestamp = previewTimestamp;

export const previewTrip: Trip = {
  id: "preview-trip-1",
  ownerId: "fake-uid-ava",
  name: "Lisbon Weekend",
  participants: ["Ava", "Liam", "Maya", "Noah"],
  collaboratorIds: ["fake-uid-liam"],
  participantLinks: {
    Ava: "fake-uid-ava",
  },
  settlementMethod: "greedy",
  settlementGroups: [
    {
      id: "g1",
      name: "Ava family",
      members: ["Ava", "Liam"],
      representative: "Ava",
    },
  ],
  archived: false,
  shareToken: "preview-token-123",
  createdAt: fakeTimestamp("2026-09-20T10:00:00.000Z"),
  updatedAt: fakeTimestamp("2026-10-05T18:30:00.000Z"),
};

export const previewExpenses: Expense[] = [
  {
    id: "e1",
    description: "TAP flights",
    category: "flight",
    date: "2026-09-20",
    amount: 420.0,
    paidBy: "Ava",
    sharedBy: ["Ava", "Liam", "Maya", "Noah"],
    createdAt: fakeTimestamp("2026-09-20T10:05:00.000Z"),
  },
  {
    id: "e2",
    description: "Hotel Alfama",
    category: "hotel",
    date: "2026-09-21",
    amount: 380.5,
    paidBy: "Liam",
    sharedBy: ["Ava", "Liam", "Maya", "Noah"],
    createdAt: fakeTimestamp("2026-09-21T15:00:00.000Z"),
  },
  {
    id: "e3",
    description: "Pastéis de Belém",
    category: "food",
    date: "2026-09-22",
    amount: 24.8,
    paidBy: "Maya",
    sharedBy: ["Ava", "Maya", "Noah"],
    createdAt: fakeTimestamp("2026-09-22T11:20:00.000Z"),
  },
  {
    id: "e4",
    description: "Metro day passes",
    category: "transport",
    date: "2026-09-22",
    amount: 26.0,
    paidBy: "Noah",
    sharedBy: ["Ava", "Liam", "Maya", "Noah"],
    createdAt: fakeTimestamp("2026-09-22T12:00:00.000Z"),
  },
  {
    id: "e5",
    description: "Seafood dinner",
    category: "food",
    date: "2026-09-23",
    amount: 156.4,
    paidBy: "Ava",
    sharedBy: ["Ava", "Liam", "Maya", "Noah"],
    createdAt: fakeTimestamp("2026-09-23T21:10:00.000Z"),
  },
  {
    id: "e6",
    description: "Uber to airport",
    category: "taxi",
    date: "2026-09-24",
    amount: 32.75,
    paidBy: "Liam",
    sharedBy: ["Liam", "Noah"],
    createdAt: fakeTimestamp("2026-09-24T08:00:00.000Z"),
  },
  {
    id: "e7",
    description: "Museum tickets",
    category: "tickets",
    date: "2026-09-23",
    amount: 48.0,
    paidBy: "Maya",
    sharedBy: ["Maya", "Noah"],
    createdAt: fakeTimestamp("2026-09-23T14:00:00.000Z"),
  },
  {
    id: "e8",
    description: "Groceries",
    category: "groceries",
    date: "2026-09-21",
    amount: 61.2,
    paidBy: "Noah",
    sharedBy: ["Ava", "Liam", "Maya", "Noah"],
    createdAt: fakeTimestamp("2026-09-21T18:45:00.000Z"),
  },
];

export const previewPayments: Payment[] = [
  {
    id: "p1",
    from: "Liam",
    to: "Ava",
    amount: 120.0,
    date: "2026-10-01",
    note: "Flight share",
    createdAt: fakeTimestamp("2026-10-01T09:00:00.000Z"),
  },
  {
    id: "p2",
    from: "Noah",
    to: "Maya",
    amount: 35.5,
    date: "2026-10-03",
    note: "",
    createdAt: fakeTimestamp("2026-10-03T17:20:00.000Z"),
  },
];
