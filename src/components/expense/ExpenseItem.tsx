import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import type { Expense } from "@/types";

interface ExpenseItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseItem({ expense, onEdit, onDelete }: ExpenseItemProps) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{expense.description}</p>
          <p className="text-sm text-muted-foreground">
            {expense.paidBy} paid {formatCurrency(expense.amount)} &middot;
            split with {expense.sharedBy.length}{" "}
            {expense.sharedBy.length === 1 ? "person" : "people"}
          </p>
          <p className="text-xs text-muted-foreground">{expense.date}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(expense)}
            aria-label={`Edit ${expense.description}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(expense)}
            aria-label={`Delete ${expense.description}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
