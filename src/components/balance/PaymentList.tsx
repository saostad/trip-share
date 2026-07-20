import { ArrowRight, Trash2, Pencil, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import type { Payment } from "@/types";

interface PaymentListProps {
  payments: Payment[];
  onEdit: (payment: Payment) => void;
  onDelete: (payment: Payment) => void;
}

export function PaymentList({ payments, onEdit, onDelete }: PaymentListProps) {
  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <Banknote className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No payments recorded yet.
        </p>
      </div>
    );
  }

  return (
    <ul className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
      {payments.map((payment) => (
        <li
          key={payment.id}
          className="flex flex-col gap-1 rounded-lg border p-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="min-w-0 truncate font-medium">{payment.from}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate font-medium">{payment.to}</span>
            <span className="ml-auto shrink-0 font-semibold text-emerald-600">
              {formatCurrency(payment.amount)}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(payment)}
              aria-label="Edit payment"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(payment)}
              aria-label="Delete payment"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{payment.date}</span>
            {payment.note && (
              <>
                <span>&middot;</span>
                <span className="min-w-0 truncate">{payment.note}</span>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
