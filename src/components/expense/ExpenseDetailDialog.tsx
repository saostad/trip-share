import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { resolveExpenseCategory } from "@/lib/expenseCategories";
import { Paperclip, Pencil, Receipt } from "lucide-react";
import type { Expense } from "@/types";

interface ExpenseDetailDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (expense: Expense) => void;
  readOnly?: boolean;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-sm font-medium">{children}</div>
    </div>
  );
}

export function ExpenseDetailDialog({
  expense,
  open,
  onOpenChange,
  onEdit,
  readOnly = false,
}: ExpenseDetailDialogProps) {
  if (!expense) return null;

  const category = resolveExpenseCategory(expense.category, expense.description);
  const Icon = category?.icon ?? Receipt;
  const shareCount = expense.sharedBy.length;
  const perPerson =
    shareCount > 0 ? Math.round((expense.amount / shareCount) * 100) / 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6">Expense details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
              aria-hidden
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-snug">
                {expense.description}
              </p>
              {category && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {category.label}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 px-3">
            <DetailRow label="Amount">
              <span className="text-base tabular-nums">
                {formatCurrency(expense.amount)}
              </span>
            </DetailRow>
            <DetailRow label="Date">{formatDate(expense.date)}</DetailRow>
            <DetailRow label="Paid by">{expense.paidBy}</DetailRow>
            <DetailRow label="Split">
              {shareCount > 0 ? (
                <span>
                  {formatCurrency(perPerson)} each
                  <span className="font-normal text-muted-foreground">
                    {" "}· {shareCount}{" "}
                    {shareCount === 1 ? "person" : "people"}
                  </span>
                </span>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Shared by">
              <span className="whitespace-pre-wrap break-words">
                {shareCount === 0
                  ? "—"
                  : expense.sharedBy.join(", ")}
              </span>
            </DetailRow>
          </div>

          {expense.attachment && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Attachment
              </p>
              <a
                href={expense.attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-2 text-sm text-blue-600 hover:bg-muted/40 hover:underline dark:text-blue-400"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{expense.attachment.name}</span>
              </a>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {!readOnly && onEdit && (
              <Button
                type="button"
                className="gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(expense);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
