import { useState } from "react";
import {
  calculateBalances,
  personBalanceBreakdown,
  simplifyDebtsWithDetails,
  type SettlementExplanation,
} from "@/lib/balances";
import { formatCurrency } from "@/lib/formatters";
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
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
  const transactions = simplifyDebtsWithDetails(balances);
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-400">
        All settled! No payments needed.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {transactions.map((transaction) => {
        const key = `${transaction.step}-${transaction.from}-${transaction.to}`;
        const isOpen = openKey === key;

        return (
          <li
            key={key}
            className="rounded-lg border border-border bg-card text-sm"
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 p-3 text-left"
              onClick={() => setOpenKey(isOpen ? null : key)}
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
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
            </button>

            {isOpen && (
              <SettlementRowDetail
                transaction={transaction}
                expenses={expenses}
                payments={payments}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SettlementRowDetail({
  transaction,
  expenses,
  payments,
}: {
  transaction: SettlementExplanation;
  expenses: Expense[];
  payments: Payment[];
}) {
  const from = personBalanceBreakdown(transaction.from, expenses, payments);
  const to = personBalanceBreakdown(transaction.to, expenses, payments);

  const amountReason =
    transaction.fromRemainingBefore <= transaction.toRemainingBefore
      ? `${transaction.from} still owed ${formatCurrency(transaction.fromRemainingBefore)} at this step, so the transfer is that full amount.`
      : `${transaction.to} was still owed ${formatCurrency(transaction.toRemainingBefore)} at this step, so the transfer covers that full credit.`;

  return (
    <div className="space-y-3 border-t border-border px-3 pb-3 pt-2 text-xs text-muted-foreground">
      <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/70">
        How this line was calculated
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <PersonCard
          title={`${transaction.from} (pays)`}
          variant="owes"
          breakdown={from}
          remaining={transaction.fromRemainingBefore}
        />
        <PersonCard
          title={`${transaction.to} (receives)`}
          variant="owed"
          breakdown={to}
          remaining={transaction.toRemainingBefore}
        />
      </div>

      <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2 space-y-1.5">
        <p className="font-medium text-foreground">
          Suggested transfer: {formatCurrency(transaction.amount)}
        </p>
        <p>
          Debt simplification pairs the largest remaining debt with the largest
          remaining credit (step {transaction.step}).
        </p>
        <p>
          min(
          {formatCurrency(transaction.fromRemainingBefore)} still owed by{" "}
          {transaction.from},{" "}
          {formatCurrency(transaction.toRemainingBefore)} still due to{" "}
          {transaction.to}) ={" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(transaction.amount)}
          </span>
        </p>
        <p>{amountReason}</p>
      </div>
    </div>
  );
}

function PersonCard({
  title,
  variant,
  breakdown,
  remaining,
}: {
  title: string;
  variant: "owes" | "owed";
  breakdown: ReturnType<typeof personBalanceBreakdown>;
  remaining: number;
}) {
  const tint =
    variant === "owes"
      ? "border-destructive/20 bg-destructive/5"
      : "border-emerald-500/20 bg-emerald-500/5";

  return (
    <div className={`rounded-md border px-2.5 py-2 space-y-1 ${tint}`}>
      <p className="font-medium text-foreground">{title}</p>
      <ul className="space-y-0.5 tabular-nums">
        <li className="flex justify-between gap-2">
          <span>Paid for expenses</span>
          <span>{formatCurrency(breakdown.totalPaid)}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Fair share of expenses</span>
          <span>−{formatCurrency(breakdown.totalShare)}</span>
        </li>
        {breakdown.paymentsSent > 0 && (
          <li className="flex justify-between gap-2">
            <span>Settlements already sent</span>
            <span>+{formatCurrency(breakdown.paymentsSent)}</span>
          </li>
        )}
        {breakdown.paymentsReceived > 0 && (
          <li className="flex justify-between gap-2">
            <span>Settlements already received</span>
            <span>−{formatCurrency(breakdown.paymentsReceived)}</span>
          </li>
        )}
        <li className="flex justify-between gap-2 border-t border-border/60 pt-1 font-medium text-foreground">
          <span>Net balance</span>
          <span>
            {breakdown.netBalance >= 0 ? "+" : ""}
            {formatCurrency(breakdown.netBalance)}
          </span>
        </li>
        <li className="flex justify-between gap-2">
          <span>
            {variant === "owes" ? "Still to pay (this step)" : "Still to receive (this step)"}
          </span>
          <span className="font-medium text-foreground">
            {formatCurrency(remaining)}
          </span>
        </li>
      </ul>
      <p className="pt-0.5 text-[11px] leading-snug">
        Net = paid − share + settlements sent − settlements received
      </p>
    </div>
  );
}
