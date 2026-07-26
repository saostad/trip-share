import { Pencil, Trash2, Paperclip, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { resolveExpenseCategory } from "@/lib/expenseCategories";
import type { Expense } from "@/types";

interface ExpenseItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseItem({ expense, onEdit, onDelete }: ExpenseItemProps) {
  const category = resolveExpenseCategory(expense.category, expense.description);
  const Icon = category?.icon ?? Receipt;

  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            aria-hidden
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{expense.description}</p>
            <p className="text-sm text-muted-foreground">
              {expense.paidBy} paid {formatCurrency(expense.amount)} &middot;
              split with {expense.sharedBy.length}{" "}
              {expense.sharedBy.length === 1 ? "person" : "people"}
            </p>
            <p className="text-xs text-muted-foreground">{expense.date}</p>
            {expense.attachment && (
              <a
                href={expense.attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <Paperclip className="h-3 w-3" />
                {expense.attachment.name}
              </a>
            )}
          </div>
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
