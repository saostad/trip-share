import { Receipt } from "lucide-react";
import { ExpenseItem } from "@/components/expense/ExpenseItem";
import type { Expense } from "@/types";

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Receipt className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No expenses yet. Add your first expense to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
      {expenses.map((expense) => (
        <ExpenseItem
          key={expense.id}
          expense={expense}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
