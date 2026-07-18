import type { Expense } from "@/types";

/**
 * Returns true if the participant name appears in any expense's paidBy or sharedBy fields.
 * A protected participant cannot be removed from the trip while referenced in expenses.
 */
export function isParticipantProtected(
  name: string,
  expenses: Expense[],
): boolean {
  return expenses.some(
    (expense) =>
      expense.paidBy === name || expense.sharedBy.includes(name),
  );
}

/**
 * Categorizes participants into removable and protected lists.
 * Protected participants are those referenced in at least one expense's paidBy or sharedBy.
 * Removable participants have no expense references and can be safely removed.
 */
export function getRemovableParticipants(
  participants: string[],
  expenses: Expense[],
): { removable: string[]; protected: string[] } {
  const removable: string[] = [];
  const protected_: string[] = [];

  for (const participant of participants) {
    if (isParticipantProtected(participant, expenses)) {
      protected_.push(participant);
    } else {
      removable.push(participant);
    }
  }

  return { removable, protected: protected_ };
}
