import { useState } from "react";
import { calculateBalances } from "@/lib/balances";
import {
  collapseBalancesForGroups,
  hasUsableSettlementGroups,
  buildGroupByRepresentative,
} from "@/lib/settlementGroups";
import { formatCurrency } from "@/lib/formatters";
import type {
  Expense,
  Payment,
  SettlementGroup,
  SettlementViewMode,
} from "@/types";

interface BalanceSummaryProps {
  expenses: Expense[];
  participants: string[];
  payments?: Payment[];
  settlementGroups?: SettlementGroup[];
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
  settlementGroups = [],
}: BalanceSummaryProps) {
  const hasGroups = hasUsableSettlementGroups(settlementGroups);
  const [viewMode, setViewMode] = useState<SettlementViewMode>(
    hasGroups ? "group" : "person",
  );
  const groupMode = hasGroups && viewMode === "group";

  if (expenses.length === 0 || participants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No balances to show</p>
    );
  }

  const individual = calculateBalances(expenses, participants, payments);
  const balances = groupMode
    ? collapseBalancesForGroups(individual, settlementGroups)
    : individual;

  const groupByRep = groupMode
    ? buildGroupByRepresentative(settlementGroups)
    : {};

  // Names to display: collapsed keys in group mode, all participants otherwise
  const names = groupMode ? Object.keys(balances) : [...participants];

  // Creditors first, then settled, then debtors — larger amounts first within group
  const sorted = [...names].sort((a, b) => {
    const ba = balances[a] ?? 0;
    const bb = balances[b] ?? 0;
    if (Math.abs(ba) < 0.01 && Math.abs(bb) >= 0.01) return 1;
    if (Math.abs(bb) < 0.01 && Math.abs(ba) >= 0.01) return -1;
    return bb - ba;
  });

  return (
    <div className="space-y-2">
      {hasGroups && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {groupMode
              ? "Group nets (members collapsed onto representative)"
              : "Individual balances"}
          </p>
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
        </div>
      )}

      <ul className="space-y-2">
        {sorted.map((name) => {
          const balance = balances[name] ?? 0;
          const isPositive = balance > 0.01;
          const isNegative = balance < -0.01;
          const group = groupByRep[name];
          const title = group ? group.name : name;
          const subtitle = group
            ? `rep: ${group.representative} · ${group.members.length} member${
                group.members.length === 1 ? "" : "s"
              }`
            : undefined;

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
              key={name}
              className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${rowTint}`}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                aria-hidden
              >
                {initials(group ? group.name : name)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">
                  {subtitle ? `${statusLabel} · ${subtitle}` : statusLabel}
                </p>
              </div>

              <span
                className={`shrink-0 text-base font-semibold tabular-nums ${amountClass}`}
              >
                {formatCurrency(balance)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
