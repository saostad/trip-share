import * as XLSX from "xlsx";
import {
  calculateBalances,
  personBalanceBreakdown,
  simplifyDebtsWithDetails,
} from "@/lib/balances";
import { buildSettlementReport } from "@/lib/settlementReport";
import type { Expense, Payment, Trip } from "@/types";

function safeFileName(name: string): string {
  return (
    name
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "trip"
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sheetFromAoA(rows: (string | number | null | undefined)[][]) {
  return XLSX.utils.aoa_to_sheet(
    rows.map((row) => row.map((c) => (c === null || c === undefined ? "" : c))),
  );
}

/**
 * Build and download a multi-sheet Excel workbook for one trip.
 * Intended for accountant / third-party review of data and calculations.
 */
export function downloadTripExcel(
  trip: Pick<Trip, "id" | "name" | "participants" | "participantLinks">,
  expenses: Expense[],
  payments: Payment[] = [],
): void {
  const participants = trip.participants;
  const balances = calculateBalances(expenses, participants, payments);
  const settlements = simplifyDebtsWithDetails(balances);
  const report = buildSettlementReport(
    trip.name,
    participants,
    expenses,
    payments,
  );

  const generatedAt = new Date().toISOString();
  const totalSpent = round2(expenses.reduce((s, e) => s + e.amount, 0));
  const checksum = round2(
    participants.reduce((s, p) => s + (balances[p] ?? 0), 0),
  );

  const wb = XLSX.utils.book_new();

  // —— Summary ————————————————————————————————————————————————
  const summaryRows: (string | number)[][] = [
    ["Trip Share — Trip export for review"],
    [],
    ["Trip name", trip.name],
    ["Trip ID", trip.id],
    ["Generated at (UTC)", generatedAt],
    ["Participants", participants.join(", ")],
    ["Expense count", expenses.length],
    ["Payment count", payments.length],
    ["Total spent", totalSpent],
    [
      "Date range",
      report.dateRange.from && report.dateRange.to
        ? `${report.dateRange.from} → ${report.dateRange.to}`
        : "—",
    ],
    ["Balance checksum (sum of nets)", checksum],
    [
      "Checksum OK",
      Math.abs(checksum) < 0.02 ? "YES (≈ 0)" : "NO — investigate",
    ],
    [],
    ["How balances are calculated"],
    [
      "For each expense: payer is credited the full amount; each person in sharedBy is debited amount ÷ number of sharers.",
    ],
    [
      "For each recorded payment: sender balance increases by amount; receiver balance decreases by amount.",
    ],
    [
      "Net balance = paid − fair share + payments sent − payments received. Positive = is owed; negative = owes.",
    ],
    [
      "Suggested settlements pair largest remaining debt with largest remaining credit (greedy simplification).",
    ],
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoA(summaryRows), "Summary");

  // —— Participants ———————————————————————————————————————————
  const participantRows: (string | number)[][] = [
    ["Name", "Linked account UID (if any)"],
    ...participants.map((name) => [
      name,
      trip.participantLinks?.[name] ?? "",
    ]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromAoA(participantRows),
    "Participants",
  );

  // —— Expenses ———————————————————————————————————————————————
  const expenseRows: (string | number)[][] = [
    [
      "ID",
      "Date",
      "Description",
      "Category",
      "Amount",
      "Paid by",
      "Shared by",
      "Share each",
      "Sharer count",
      "Receipt file",
      "Receipt URL",
    ],
    ...[...expenses]
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
      .map((e) => {
        const sharers = e.sharedBy?.length ? e.sharedBy : [];
        const shareEach =
          sharers.length > 0 ? round2(e.amount / sharers.length) : 0;
        return [
          e.id,
          e.date,
          e.description,
          e.category ?? "",
          round2(e.amount),
          e.paidBy,
          sharers.join("; "),
          shareEach,
          sharers.length,
          e.attachment?.name ?? "",
          e.attachment?.url ?? "",
        ];
      }),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoA(expenseRows), "Expenses");

  // —— Payments ———————————————————————————————————————————————
  const paymentRows: (string | number)[][] = [
    ["ID", "Date", "From", "To", "Amount", "Note", "Attachment file", "Attachment URL"],
    ...[...payments]
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
      .map((p) => [
        p.id,
        p.date,
        p.from,
        p.to,
        round2(p.amount),
        p.note?.trim() || "",
        p.attachment?.name ?? "",
        p.attachment?.url ?? "",
      ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoA(paymentRows), "Payments");

  // —— Balances ———————————————————————————————————————————————
  const balanceRows: (string | number)[][] = [
    [
      "Person",
      "Paid for expenses",
      "Fair share",
      "Payments sent",
      "Payments received",
      "Net balance",
      "Status",
    ],
    ...participants.map((name) => {
      const b = personBalanceBreakdown(name, expenses, payments);
      const status =
        b.netBalance > 0.01
          ? "is owed"
          : b.netBalance < -0.01
            ? "owes"
            : "settled";
      return [
        name,
        b.totalPaid,
        b.totalShare,
        b.paymentsSent,
        b.paymentsReceived,
        b.netBalance,
        status,
      ];
    }),
    [],
    ["Checksum (sum of net)", checksum],
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoA(balanceRows), "Balances");

  // —— Settle Up (suggested) ———————————————————————————————————
  const settleRows: (string | number)[][] = [
    [
      "Step",
      "From (pays)",
      "To (receives)",
      "Amount",
      "From still owed before",
      "To still due before",
      "Calculation note",
    ],
    ...settlements.map((t) => [
      t.step,
      t.from,
      t.to,
      t.amount,
      t.fromRemainingBefore,
      t.toRemainingBefore,
      `min(${t.fromRemainingBefore}, ${t.toRemainingBefore}) = ${t.amount}`,
    ]),
  ];
  if (settlements.length === 0) {
    settleRows.push(["—", "(none)", "All settled", 0, "", "", ""]);
  }
  XLSX.utils.book_append_sheet(wb, sheetFromAoA(settleRows), "Settle Up");

  // —— Ledger (chronological) ————————————————————————————————
  const ledgerRows: (string | number)[][] = [
    [
      "Step",
      "Kind",
      "Date",
      "Title",
      "Amount",
      "Summary",
      "Person",
      "What happened",
      "Change",
      "Balance after",
    ],
  ];
  for (const step of report.ledger) {
    if (step.effects.length === 0) {
      ledgerRows.push([
        step.index,
        step.kind,
        step.date,
        step.title,
        step.amount,
        step.summary,
        "",
        "",
        "",
        "",
      ]);
    } else {
      step.effects.forEach((fx, i) => {
        ledgerRows.push([
          i === 0 ? step.index : "",
          i === 0 ? step.kind : "",
          i === 0 ? step.date : "",
          i === 0 ? step.title : "",
          i === 0 ? step.amount : "",
          i === 0 ? step.summary : "",
          fx.name,
          fx.note,
          fx.delta,
          fx.balanceAfter,
        ]);
      });
    }
  }
  XLSX.utils.book_append_sheet(wb, sheetFromAoA(ledgerRows), "Ledger");

  const filename = `${safeFileName(trip.name)}-trip-export.xlsx`;
  XLSX.writeFile(wb, filename);
}
