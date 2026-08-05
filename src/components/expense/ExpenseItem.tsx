import { Pencil, Trash2, Paperclip, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { resolveExpenseCategory } from "@/lib/expenseCategories";
import type { Expense } from "@/types";

interface ExpenseItemProps {
  expense: Expense;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  readOnly?: boolean;
}

export function ExpenseItem({
  expense,
  onEdit,
  onDelete,
  readOnly = false,
}: ExpenseItemProps) {
  const category = resolveExpenseCategory(expense.category, expense.description);
  const Icon = category?.icon ?? Receipt;
  const shareCount = expense.sharedBy.length;
  const perPerson =
    shareCount > 0 ? Math.round((expense.amount / shareCount) * 100) / 100 : 0;

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{expense.description}</p>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {expense.paidBy} paid {formatCurrency(expense.amount)}
            {shareCount > 0 && (
              <>
                <span className="text-muted-foreground/80"> · </span>
                {formatCurrency(perPerson)} each
                <span className="text-muted-foreground/80"> · </span>
                {shareCount} {shareCount === 1 ? "person" : "people"}
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{formatDate(expense.date)}</p>
          {expense.attachment && (
            <a
              href={expense.attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex max-w-full items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              <Paperclip className="h-3 w-3 shrink-0" />
              <span className="truncate">{expense.attachment.name}</span>
            </a>
          )}
        </div>
      </div>
      {!readOnly && onEdit && onDelete && (
        <div className="flex shrink-0 gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(expense)}
            aria-label={`Edit ${expense.description}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(expense)}
            aria-label={`Delete ${expense.description}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </li>
  );
}
