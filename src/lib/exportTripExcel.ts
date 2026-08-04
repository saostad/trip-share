import * as XLSX from "xlsx";
import {
  calculateBalances,
  computeSettlements,
  normalizeSettlementMethod,
  personBalanceBreakdown,
  settlementMethodLabel,
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

export function downloadTripExcel(
  trip: Pick<
    Trip,
    "id" | "name" | "participants" | "participantLinks" | "settlementMethod"
  >,
  expenses: Expense[],
  payments: Payment[] = [],
): void {
  const participants = trip.participants;
  const method = normalizeSettlementMethod(trip.settlementMethod);
  const balances = calculateBalances(expenses, participants, payments);
  const settlements = computeSettlements(
    method,
    expenses,
    participants,
    payments,
  );
  const report = buildSettlementReport(
    trip.name,
    participants,
    expenses,
    payments,
    method,
  );

  const generatedAt = new Date().toISOString();
  const totalSpent = round2(expenses.reduce((s, e) => s + e.amount, 0));
  const checksum = round2(
    participants.reduce((s, p) => s + (balances[p] ?? 0), 0),
  );

  const wb = XLSX.utils.book_new();

  const summaryRows: (string | number)[][] = [
    ["Trip Share — Trip export for review"],
    [],
    ["Trip name", trip.name],
    ["Trip ID", trip.id],
    ["Generated at (UTC)", generatedAt],
    ["Settlement method", settlementMethodLabel(method)],
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
      method === "pairwise"
        ? "Suggested settlements: pairwise netting from expense shares between each pair, then net recorded payments."
        : method === "treasurer"
          ? "Suggested settlements: central pot — auto-picked treasurer; everyone pays or is paid by that person only."
          : method === "minimize"
            ? "Suggested settlements: minimize transactions — fewest transfers that zero every balance."
            : method === "smallest"
              ? "Suggested settlements: smallest-first — clear the person with the smallest remaining balance first."
              : "Suggested settlements: greedy — pair largest remaining debt with largest remaining credit.",
    ],
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoA(summaryRows), "Summary");

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

  const settleRows: (string | number)[][] = [
    [
      "Step",
      "From (pays)",
      "To (receives)",
      "Amount",
      "Method",
      "Note",
    ],
    ...settlements.map((t) => [
      t.step,
      t.from,
      t.to,
      t.amount,
      t.method,
      t.note,
    ]),
  ];
  if (settlements.length === 0) {
    settleRows.push(["—", "(none)", "All settled", 0, method, ""]);
  }
  XLSX.utils.book_append_sheet(wb, sheetFromAoA(settleRows), "Settle Up");

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
