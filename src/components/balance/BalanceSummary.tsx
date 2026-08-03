import { calculateBalances } from "@/lib/balances";
import { formatCurrency } from "@/lib/formatters";
import type { Expense, Payment } from "@/types";

interface BalanceSummaryProps {
  expenses: Expense[];
  participants: string[];
  payments?: Payment[];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function BalanceSummary({
  expenses,
  participants,
  payments = [],
}: BalanceSummaryProps) {
  if (expenses.length === 0 || participants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No balances to show</p>
    );
  }

  const balances = calculateBalances(expenses, participants, payments);

  // Creditors first, then settled, then debtors — larger amounts first within group
  const sorted = [...participants].sort((a, b) => {
    const ba = balances[a] ?? 0;
    const bb = balances[b] ?? 0;
    if (Math.abs(ba) < 0.01 && Math.abs(bb) >= 0.01) return 1;
    if (Math.abs(bb) < 0.01 && Math.abs(ba) >= 0.01) return -1;
    return bb - ba;
  });

  return (
    <ul className="space-y-2">
      {sorted.map((participant) => {
        const balance = balances[participant] ?? 0;
        const isPositive = balance > 0.01;
        const isNegative = balance < -0.01;

        let amountClass: string;
        let rowTint: string;
        let statusLabel: string;

        if (isPositive) {
          amountClass = "text-emerald-600 dark:text-emerald-400";
          rowTint = "border-emerald-500/20 bg-emerald-500/5";
          statusLabel = "is owed";
        } else if (isNegative) {
          amountClass = "text-destructive";
          rowTint = "border-destructive/20 bg-destructive/5";
          statusLabel = "owes";
        } else {
          amountClass = "text-muted-foreground";
          rowTint = "border-border bg-muted/20";
          statusLabel = "settled";
        }

        return (
          <li
            key={participant}
            className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${rowTint}`}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
              aria-hidden
            >
              {initials(participant)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{participant}</p>
              <p className="text-xs text-muted-foreground">{statusLabel}</p>
            </div>

            <span className={`shrink-0 text-base font-semibold tabular-nums ${amountClass}`}>
              {formatCurrency(balance)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
