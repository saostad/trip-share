import type { LucideIcon } from "lucide-react";
import {
  UtensilsCrossed,
  Coffee,
  ShoppingCart,
  Car,
  Fuel,
  Hotel,
  Plane,
  Taxi,
  Ticket,
  ShoppingBag,
  HandCoins,
  ParkingCircle,
  MapPin,
  MoreHorizontal,
} from "lucide-react";

export interface ExpenseCategory {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "drinks", label: "Drinks", icon: Coffee },
  { id: "groceries", label: "Groceries", icon: ShoppingCart },
  { id: "transport", label: "Transport", icon: Car },
  { id: "gas", label: "Gas", icon: Fuel },
  { id: "hotel", label: "Hotel", icon: Hotel },
  { id: "flight", label: "Flight", icon: Plane },
  { id: "taxi", label: "Taxi / Uber", icon: Taxi },
  { id: "activities", label: "Activities", icon: MapPin },
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "shopping", label: "Shopping", icon: ShoppingBag },
  { id: "tips", label: "Tips", icon: HandCoins },
  { id: "parking", label: "Parking", icon: ParkingCircle },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

export function getCategoryById(id: string | null | undefined): ExpenseCategory | undefined {
  if (!id) return undefined;
  return EXPENSE_CATEGORIES.find((c) => c.id === id);
}

/** Match category from stored id, or fall back to description label match for older expenses. */
export function resolveExpenseCategory(
  categoryId: string | null | undefined,
  description: string
): ExpenseCategory | undefined {
  const byId = getCategoryById(categoryId);
  if (byId) return byId;

  const normalized = description.trim().toLowerCase();
  return EXPENSE_CATEGORIES.find((c) => c.label.toLowerCase() === normalized);
}
