import { calculateBalances, simplifyDebts } from "@/lib/balances";
import { formatCurrency } from "@/lib/formatters";
import { ArrowRight } from "lucide-react";
import type { Expense, Payment } from "@/types";

interface SettlementListProps {
  expenses: Expense[];
  participants: string[];
  payments?: Payment[];
}

export function SettlementList({
  expenses,
  participants,
  payments = [],
}: SettlementListProps) {
  const balances = calculateBalances(expenses, participants, payments);
  const transactions = simplifyDebts(balances);

  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-400">
        All settled! No payments needed.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {transactions.map((transaction) => (
        <li
          key={`${transaction.from}-${transaction.to}`}
          className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm"
        >
          <span className="min-w-0 truncate font-medium text-destructive">
            {transaction.from}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate font-medium text-emerald-600 dark:text-emerald-400">
            {transaction.to}
          </span>
          <span className="ml-auto shrink-0 text-base font-semibold tabular-nums">
            {formatCurrency(transaction.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
