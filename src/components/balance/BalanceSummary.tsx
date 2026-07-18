import { calculateBalances } from "@/lib/balances";
import { formatCurrency } from "@/lib/formatters";
import type { Expense } from "@/types";

interface BalanceSummaryProps {
  expenses: Expense[];
  participants: string[];
}

export function BalanceSummary({ expenses, participants }: BalanceSummaryProps) {
  if (expenses.length === 0 || participants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No balances to show</p>
    );
  }

  const balances = calculateBalances(expenses, participants);

  return (
    <ul className="space-y-2">
      {participants.map((participant) => {
        const balance = balances[participant] ?? 0;
        const isPositive = balance > 0.01;
        const isNegative = balance < -0.01;

        let colorClass: string;
        let label: string;

        if (isPositive) {
          colorClass = "text-emerald-500";
          label = "is owed";
        } else if (isNegative) {
          colorClass = "text-destructive";
          label = "owes";
        } else {
          colorClass = "text-muted-foreground";
          label = "settled";
        }

        return (
          <li
            key={participant}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="min-w-0 truncate font-medium">{participant}</span>
            <span className={`shrink-0 ${colorClass}`}>
              {label} {formatCurrency(balance)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
