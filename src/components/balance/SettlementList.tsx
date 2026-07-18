import { calculateBalances, simplifyDebts } from "@/lib/balances";
import { formatCurrency } from "@/lib/formatters";
import { ArrowRight } from "lucide-react";
import type { Expense, Payment } from "@/types";

interface SettlementListProps {
  expenses: Expense[];
  participants: string[];
  payments?: Payment[];
}

export function SettlementList({ expenses, participants, payments = [] }: SettlementListProps) {
  const balances = calculateBalances(expenses, participants, payments);
  const transactions = simplifyDebts(balances);

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        All settled! No payments needed.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {transactions.map((transaction) => (
        <li
          key={`${transaction.from}-${transaction.to}`}
          className="flex items-center gap-2 rounded-lg border p-3 text-sm"
        >
          <span className="min-w-0 truncate font-medium text-red-600">{transaction.from}</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate font-medium text-emerald-600">{transaction.to}</span>
          <span className="ml-auto shrink-0 font-semibold">
            {formatCurrency(transaction.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
