import { ArrowRight, Trash2, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import type { Payment } from "@/types";

interface PaymentListProps {
  payments: Payment[];
  onDelete: (payment: Payment) => void;
}

export function PaymentList({ payments, onDelete }: PaymentListProps) {
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
    <ul className="space-y-2">
      {payments.map((payment) => (
        <li
          key={payment.id}
          className="flex items-center gap-2 rounded-lg border p-3 text-sm"
        >
          <span className="min-w-0 truncate font-medium">{payment.from}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate font-medium">{payment.to}</span>
          <span className="ml-auto shrink-0 font-semibold text-emerald-600">
            {formatCurrency(payment.amount)}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{payment.date}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(payment)}
            aria-label="Delete payment"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
