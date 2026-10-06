import { useState } from "react";
import {
  computeSettlements,
  normalizeSettlementMethod,
  personBalanceBreakdown,
  settlementMethodDescription,
  settlementMethodLabel,
  type SettlementExplanation,
} from "@/lib/balances";
import { hasUsableSettlementGroups } from "@/lib/settlementGroups";
import { formatCurrency } from "@/lib/formatters";
import { SettlementLineReportDialog } from "@/components/balance/SettlementLineReportDialog";
import { InfoTip } from "@/components/InfoTip";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, ChevronRight, FileText } from "lucide-react";
import type {
  Expense,
  Payment,
  SettlementMethod,
  SettlementGroup,
  SettlementViewMode,
} from "@/types";

interface SettlementListProps {
  expenses: Expense[];
  participants: string[];
  payments?: Payment[];
  tripName?: string;
  settlementMethod?: SettlementMethod | string | null;
  settlementGroups?: SettlementGroup[];
  archived?: boolean;
  onMarkPaid?: (transfer: { from: string; to: string; amount: number }) => void;
}

export function SettlementList({
  expenses,
  participants,
  payments = [],
  tripName = "Trip",
  settlementMethod,
  settlementGroups = [],
  archived = false,
  onMarkPaid,
}: SettlementListProps) {
  const method = normalizeSettlementMethod(settlementMethod);
  const hasGroups = hasUsableSettlementGroups(settlementGroups);
  const [viewMode, setViewMode] = useState<SettlementViewMode>(
    hasGroups ? "group" : "person",
  );
  const groupMode = hasGroups && viewMode === "group";

  const transactions = computeSettlements(
    method,
    expenses,
    participants,
    payments,
    { groupMode, groups: settlementGroups },
  );
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [reportTx, setReportTx] = useState<SettlementExplanation | null>(null);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          How payments are suggested: {settlementMethodLabel(method)} —{" "}
          {settlementMethodDescription(method)}
          {groupMode && " · group mode"}
        </p>
        {hasGroups && (
          <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
            <button
              type="button"
              className={`rounded px-2.5 py-1 transition-colors ${
                viewMode === "group"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setViewMode("group")}
            >
              By group
            </button>
            <button
              type="button"
              className={`rounded px-2.5 py-1 transition-colors ${
                viewMode === "person"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setViewMode("person")}
            >
              By person
            </button>
          </div>
        )}
      </div>

      {transactions.length === 0 ? (
        <p className="rounded-lg border border-positive/20 bg-positive/5 px-3 py-3 text-sm text-positive">
          Everyone is all square! No payments needed.
        </p>
      ) : (
        <ul className="space-y-2">
          {transactions.map((transaction) => {
            const key = `${transaction.step}-${transaction.from}-${transaction.to}`;
            const isOpen = openKey === key;

            return (
              <li
                key={key}
                className="rounded-lg border border-border bg-card text-sm"
              >
                <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => setOpenKey(isOpen ? null : key)}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-[10ch] flex-1 truncate font-medium text-negative">
                      {transaction.from}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-[10ch] flex-1 truncate font-medium text-positive">
                      {transaction.to}
                    </span>
                    <span className="ml-auto shrink-0 text-base font-semibold tabular-nums">
                      {formatCurrency(transaction.amount)}
                    </span>
                  </button>
                  {onMarkPaid && !archived && (
                    <span className="flex w-full items-center gap-1 sm:w-auto sm:shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={() =>
                          onMarkPaid({
                            from: transaction.from,
                            to: transaction.to,
                            amount: transaction.amount,
                          })
                        }
                      >
                        Mark as paid
                      </Button>
                      <InfoTip
                        term="mark as paid"
                        title="Mark as paid"
                        body="Records this payment so balances update."
                      />
                    </span>
                  )}
                </div>

                {isOpen && (
                  <SettlementRowDetail
                    transaction={transaction}
                    expenses={expenses}
                    payments={payments}
                    onOpenReport={() => setReportTx(transaction)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <SettlementLineReportDialog
        open={!!reportTx}
        onOpenChange={(open) => !open && setReportTx(null)}
        tripName={tripName}
        transaction={reportTx}
        expenses={expenses}
        payments={payments}
        participants={participants}
      />
    </>
  );
}

function SettlementRowDetail({
  transaction,
  expenses,
  payments,
  onOpenReport,
}: {
  transaction: SettlementExplanation;
  expenses: Expense[];
  payments: Payment[];
  onOpenReport: () => void;
}) {
  const from = personBalanceBreakdown(transaction.from, expenses, payments);
  const to = personBalanceBreakdown(transaction.to, expenses, payments);
  const method = transaction.method;

  return (
    <div className="space-y-3 border-t border-border px-3 pb-3 pt-2 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/70">
          How this line was calculated
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onOpenReport();
          }}
        >
          <FileText className="h-3.5 w-3.5" />
          Detailed report
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <PersonCard
          title={`${transaction.from} (pays)`}
          variant="owes"
          breakdown={from}
          remaining={transaction.fromRemainingBefore}
          remainingLabel={
            method === "pairwise"
              ? "Pairwise net to receiver"
              : "Still to pay (this step)"
          }
        />
        <PersonCard
          title={`${transaction.to} (receives)`}
          variant="owed"
          breakdown={to}
          remaining={transaction.toRemainingBefore}
          remainingLabel={
            method === "pairwise"
              ? "Pairwise net from payer"
              : "Still to receive (this step)"
          }
        />
      </div>

      <div className="space-y-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-2">
        <p className="font-medium text-foreground">
          Suggested transfer: {formatCurrency(transaction.amount)}
        </p>
        {method === "pairwise" ? (
          <>
            <p>
              Pairwise netting accumulates each person's share of expenses
              owed to the payer, then nets recorded payments between the same
              pair.
            </p>
            <p className="font-medium text-foreground">{transaction.note}</p>
          </>
        ) : method === "smallest" ? (
          <>
            <p>
              Smallest-first always settles the person with the smallest absolute
              remaining balance against the largest opposite side (step{" "}
              {transaction.step}).
            </p>
            <p className="font-medium text-foreground">{transaction.note}</p>
            <p>
              min(
              {formatCurrency(transaction.fromRemainingBefore)},{" "}
              {formatCurrency(transaction.toRemainingBefore)}) ={" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(transaction.amount)}
              </span>
            </p>
          </>
        ) : method === "treasurer" ? (
          <>
            <p>
              Central pot auto-picks a treasurer (person owed the most, or who
              paid the most if tied). Everyone pays or is paid only by that
              person (step {transaction.step}).
            </p>
            <p className="font-medium text-foreground">{transaction.note}</p>
            <p>
              Transfer amount ={" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(transaction.amount)}
              </span>
            </p>
          </>
        ) : (
          <>
            <p>
              Debt simplification pairs the largest remaining debt with the
              largest remaining credit (step {transaction.step}).
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
          </>
        )}
      </div>
    </div>
  );
}

function PersonCard({
  title,
  variant,
  breakdown,
  remaining,
  remainingLabel,
}: {
  title: string;
  variant: "owes" | "owed";
  breakdown: ReturnType<typeof personBalanceBreakdown>;
  remaining: number;
  remainingLabel: string;
}) {
  const tint =
    variant === "owes"
      ? "border-negative/20 bg-negative/5"
      : "border-positive/20 bg-positive/5";

  return (
    <div className={`space-y-1 rounded-md border px-2.5 py-2 ${tint}`}>
      <p className="font-medium text-foreground">{title}</p>
      <ul className="space-y-0.5 tabular-nums">
        <li className="flex justify-between gap-2">
          <span>Paid for expenses</span>
          <span>{formatCurrency(breakdown.totalPaid)}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Fair share of expenses</span>
          <span>-{formatCurrency(breakdown.totalShare)}</span>
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
            <span>-{formatCurrency(breakdown.paymentsReceived)}</span>
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
          <span>{remainingLabel}</span>
          <span className="font-medium text-foreground">
            {formatCurrency(remaining)}
          </span>
        </li>
      </ul>
      <p className="pt-0.5 text-[11px] leading-snug">
        Net = paid - share + settlements sent - settlements received
      </p>
    </div>
  );
}
