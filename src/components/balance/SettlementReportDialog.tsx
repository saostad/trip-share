import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildSettlementReport } from "@/lib/settlementReport";
import type { SettlementReportData } from "@/lib/settlementReport";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Download, FileText, Printer } from "lucide-react";
import type { Expense, Payment } from "@/types";

interface SettlementReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripName: string;
  participants: string[];
  expenses: Expense[];
  payments: Payment[];
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    font-size: 12px;
    line-height: 1.45;
    color: #111;
    margin: 16px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h2 { font-size: 18px; margin: 0 0 4px; }
  h3 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #555;
    margin: 18px 0 8px;
  }
  section { margin-bottom: 16px; }
  .muted { color: #666; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #eee; vertical-align: top; }
  th { background: #f5f5f5; font-weight: 600; }
  td.right, th.right { text-align: right; }
  .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .stat { border: 1px solid #ddd; border-radius: 8px; padding: 8px 10px; }
  .stat-label { font-size: 10px; text-transform: uppercase; color: #666; }
  .stat-value { font-weight: 600; margin-top: 2px; }
  .step {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }
  .badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    background: #eee;
    margin-right: 4px;
  }
  .badge-expense { background: #e8f0fe; color: #1a56db; }
  .badge-payment { background: #fef3c7; color: #b45309; }
  .pos { color: #059669; }
  .neg { color: #dc2626; }
  .settle { color: #6b7280; }
  ul { padding-left: 0; list-style: none; margin: 0; }
  li.settle-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 6px;
  }
  .ok { color: #059669; }
  .warn { color: #dc2626; }
  .footer-box {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 12px;
    background: #fafafa;
  }
  @media print {
    body { margin: 0; }
    .step { break-inside: auto; }
  }
`;

export function SettlementReportDialog({
  open,
  onOpenChange,
  tripName,
  participants,
  expenses,
  payments,
}: SettlementReportDialogProps) {
  /** On-screen only — Print/Download always include full step detail */
  const [showLedger, setShowLedger] = useState(true);

  const report = useMemo(
    () => buildSettlementReport(tripName, participants, expenses, payments),
    [tripName, participants, expenses, payments],
  );

  const generatedLabel = useMemo(() => {
    try {
      return new Date(report.generatedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return report.generatedAt;
    }
  }, [report.generatedAt]);

  function balanceLabel(n: number): string {
    if (n > 0.01) return `owed ${formatCurrency(n)}`;
    if (n < -0.01) return `owes ${formatCurrency(n)}`;
    return "settled";
  }

  function balanceClass(n: number): string {
    if (n > 0.01) return "text-emerald-600";
    if (n < -0.01) return "text-destructive";
    return "text-muted-foreground";
  }

  function deltaClass(n: number): string {
    if (n > 0.01) return "text-emerald-600";
    if (n < -0.01) return "text-destructive";
    return "text-muted-foreground";
  }

  function formatDelta(n: number): string {
    if (Math.abs(n) < 0.005) return "0.00";
    const sign = n > 0 ? "+" : "−";
    return `${sign}${formatCurrency(n)}`;
  }

  function handlePrint() {
    // Always export FULL detail so PDF is a complete proof document
    const html = buildReportHtml(report, participants, generatedLabel, true);
    printHtml(html);
  }

  function handleDownload() {
    const html = buildReportHtml(report, participants, generatedLabel, true);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = tripName.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "trip";
    a.href = url;
    a.download = `${safeName}-settlement-report.html`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Settlement report
            </DialogTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={showLedger ? "default" : "outline"}
                onClick={() => setShowLedger((v) => !v)}
              >
                {showLedger ? "Hide step detail" : "Show step detail"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handlePrint}
                className="gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                Print / PDF
              </Button>
            </div>
          </div>
          <p className="pr-8 text-[11px] text-muted-foreground">
            Print / Download always include the full step-by-step detail.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm">
          <div className="mb-4 border-b pb-3">
            <h2 className="text-lg font-bold">{report.tripName}</h2>
            <p className="text-xs text-muted-foreground">
              Final settlement report · Generated {generatedLabel}
              {showLedger ? " · step detail on" : " · summary on screen"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Participants: {report.participants.join(", ")}
            </p>
          </div>

          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Trip summary
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Total spent" value={formatCurrency(report.totalSpent)} />
              <Stat label="Expenses" value={String(report.expenseCount)} />
              <Stat label="Payments recorded" value={String(report.paymentCount)} />
              <Stat
                label="Date range"
                value={
                  report.dateRange.from && report.dateRange.to
                    ? report.dateRange.from === report.dateRange.to
                      ? formatDate(report.dateRange.from)
                      : `${formatDate(report.dateRange.from)} – ${formatDate(report.dateRange.to)}`
                    : "—"
                }
              />
            </div>
          </section>

          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Per-person summary
            </h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[32rem] text-left text-xs">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-2 py-2 font-medium">Person</th>
                    <th className="px-2 py-2 font-medium text-right">Paid</th>
                    <th className="px-2 py-2 font-medium text-right">Fair share</th>
                    <th className="px-2 py-2 font-medium text-right">Sent</th>
                    <th className="px-2 py-2 font-medium text-right">Received</th>
                    <th className="px-2 py-2 font-medium text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {report.people.map((p) => (
                    <tr key={p.name} className="border-b last:border-0">
                      <td className="px-2 py-1.5 font-medium">{p.name}</td>
                      <td className="px-2 py-1.5 text-right">{formatCurrency(p.totalPaid)}</td>
                      <td className="px-2 py-1.5 text-right">{formatCurrency(p.totalShare)}</td>
                      <td className="px-2 py-1.5 text-right">{formatCurrency(p.paymentsSent)}</td>
                      <td className="px-2 py-1.5 text-right">
                        {formatCurrency(p.paymentsReceived)}
                      </td>
                      <td className={`px-2 py-1.5 text-right font-semibold ${balanceClass(p.netBalance)}`}>
                        {balanceLabel(p.netBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Net = paid − fair share + payments sent − payments received.
              Positive means still owed; negative means still owes.
            </p>
          </section>

          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Remaining settlements
            </h3>
            {report.remainingSettlements.length === 0 ? (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                All settled — no further payments needed.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {report.remainingSettlements.map((t) => (
                  <li
                    key={`${t.from}-${t.to}-${t.amount}`}
                    className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-destructive">{t.from}</span>
                    <span className="text-muted-foreground">pays</span>
                    <span className="font-medium text-emerald-600">{t.to}</span>
                    <span className="ml-auto font-semibold">{formatCurrency(t.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {showLedger && (
            <section className="mb-5">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Transaction detail (step by step)
              </h3>
              <p className="mb-3 text-[11px] text-muted-foreground">
                Starting balances are $0. Each expense or payment updates every member.
                Final nets match the summary above.
              </p>

              {report.ledger.length === 0 ? (
                <p className="text-xs text-muted-foreground">No transactions yet.</p>
              ) : (
                <ol className="space-y-3">
                  {report.ledger.map((step) => (
                    <li
                      key={`${step.kind}-${step.id}`}
                      className="rounded-lg border p-3 text-xs"
                    >
                      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                          #{step.index}
                        </span>
                        <span
                          className={
                            "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase " +
                            (step.kind === "expense"
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400")
                          }
                        >
                          {step.kind}
                        </span>
                        <span className="text-muted-foreground">{formatDate(step.date)}</span>
                        <span className="font-semibold">{step.title}</span>
                        <span className="ml-auto font-semibold">{formatCurrency(step.amount)}</span>
                      </div>

                      <p className="mb-2 text-muted-foreground">{step.summary}</p>

                      <div className="overflow-x-auto rounded border">
                        <table className="w-full min-w-[20rem] text-left">
                          <thead className="border-b bg-muted/40">
                            <tr>
                              <th className="px-2 py-1.5 font-medium">Person</th>
                              <th className="px-2 py-1.5 font-medium">What happened</th>
                              <th className="px-2 py-1.5 font-medium text-right">Change</th>
                              <th className="px-2 py-1.5 font-medium text-right">Balance after</th>
                            </tr>
                          </thead>
                          <tbody>
                            {step.effects.map((fx) => (
                              <tr key={fx.name} className="border-b last:border-0">
                                <td className="px-2 py-1 font-medium">{fx.name}</td>
                                <td className="px-2 py-1 text-muted-foreground">{fx.note}</td>
                                <td className={`px-2 py-1 text-right font-mono ${deltaClass(fx.delta)}`}>
                                  {formatDelta(fx.delta)}
                                </td>
                                <td className={`px-2 py-1 text-right font-medium ${balanceClass(fx.balanceAfter)}`}>
                                  {balanceLabel(fx.balanceAfter)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t pt-2 text-[10px] text-muted-foreground">
                        <span className="font-medium text-foreground">Running balances:</span>
                        {participants.map((name) => {
                          const b = step.balancesAfter[name] ?? 0;
                          return (
                            <span key={name}>
                              {name}:{" "}
                              <span className={balanceClass(b)}>{balanceLabel(b)}</span>
                            </span>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              All expenses ({report.expenseCount})
            </h3>
            {report.expenses.length === 0 ? (
              <p className="text-xs text-muted-foreground">No expenses recorded.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[36rem] text-left text-xs">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-2 py-2 font-medium">Date</th>
                      <th className="px-2 py-2 font-medium">Description</th>
                      <th className="px-2 py-2 font-medium">Paid by</th>
                      <th className="px-2 py-2 font-medium">Shared by</th>
                      <th className="px-2 py-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.expenses.map((e) => (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="whitespace-nowrap px-2 py-1.5">{formatDate(e.date)}</td>
                        <td className="max-w-[10rem] truncate px-2 py-1.5">{e.description}</td>
                        <td className="px-2 py-1.5">{e.paidBy}</td>
                        <td className="max-w-[12rem] truncate px-2 py-1.5 text-muted-foreground">
                          {e.sharedBy.length === participants.length
                            ? "Everyone"
                            : e.sharedBy.join(", ")}
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium">
                          {formatCurrency(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30">
                      <td colSpan={4} className="px-2 py-1.5 font-medium">Total</td>
                      <td className="px-2 py-1.5 text-right font-semibold">
                        {formatCurrency(report.totalSpent)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recorded payments ({report.paymentCount})
            </h3>
            {report.payments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No settlement payments recorded.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[28rem] text-left text-xs">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-2 py-2 font-medium">Date</th>
                      <th className="px-2 py-2 font-medium">From</th>
                      <th className="px-2 py-2 font-medium">To</th>
                      <th className="px-2 py-2 font-medium">Note</th>
                      <th className="px-2 py-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.payments.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="whitespace-nowrap px-2 py-1.5">{formatDate(p.date)}</td>
                        <td className="px-2 py-1.5">{p.from}</td>
                        <td className="px-2 py-1.5">{p.to}</td>
                        <td className="max-w-[8rem] truncate px-2 py-1.5 text-muted-foreground">
                          {p.note?.trim() || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium">
                          {formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-muted/20 px-3 py-3">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Validation
            </h3>
            <ul className="space-y-1 text-xs">
              <li>
                Balance checksum (sum of all nets):{" "}
                <span className="font-mono font-medium">
                  {report.balanceChecksum >= 0 ? "+" : "−"}
                  {formatCurrency(report.balanceChecksum)}
                </span>
                {report.isBalanced ? (
                  <span className="ml-2 text-emerald-600">✓ balanced</span>
                ) : (
                  <span className="ml-2 text-destructive">⚠ not zero — check data</span>
                )}
              </li>
              <li className="text-muted-foreground">
                Ledger steps: {report.ledger.length}. Print / Download include every step.
              </li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold">{value}</div>
    </div>
  );
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function printClass(n: number): string {
  if (n > 0.01) return "pos";
  if (n < -0.01) return "neg";
  return "settle";
}

function balanceLabelText(n: number): string {
  if (n > 0.01) return `owed ${formatCurrency(n)}`;
  if (n < -0.01) return `owes ${formatCurrency(n)}`;
  return "settled";
}

function formatDeltaText(n: number): string {
  if (Math.abs(n) < 0.005) return "0.00";
  const sign = n > 0 ? "+" : "−";
  return `${sign}${formatCurrency(n)}`;
}

function buildReportHtml(
  report: SettlementReportData,
  participants: string[],
  generatedLabel: string,
  includeLedger: boolean,
): string {
  const dateRangeLabel =
    report.dateRange.from && report.dateRange.to
      ? report.dateRange.from === report.dateRange.to
        ? formatDate(report.dateRange.from)
        : `${formatDate(report.dateRange.from)} – ${formatDate(report.dateRange.to)}`
      : "—";

  const peopleRows = report.people
    .map(
      (p) => `
      <tr>
        <td>${esc(p.name)}</td>
        <td class="right">${formatCurrency(p.totalPaid)}</td>
        <td class="right">${formatCurrency(p.totalShare)}</td>
        <td class="right">${formatCurrency(p.paymentsSent)}</td>
        <td class="right">${formatCurrency(p.paymentsReceived)}</td>
        <td class="right ${printClass(p.netBalance)}">${esc(balanceLabelText(p.netBalance))}</td>
      </tr>`,
    )
    .join("");

  const remainingHtml =
    report.remainingSettlements.length === 0
      ? `<p class="ok">All settled — no further payments needed.</p>`
      : `<ul>${report.remainingSettlements
          .map(
            (t) => `
          <li class="settle-row">
            <strong class="neg">${esc(t.from)}</strong>
            <span class="muted">pays</span>
            <strong class="pos">${esc(t.to)}</strong>
            <strong style="margin-left:auto">${formatCurrency(t.amount)}</strong>
          </li>`,
          )
          .join("")}</ul>`;

  const ledgerHtml =
    includeLedger
      ? `
      <section>
        <h3>Transaction detail (step by step) — ${report.ledger.length} steps</h3>
        <p class="muted">Starting balances are $0. Each expense or payment updates every member. Final nets match the summary above.</p>
        ${
          report.ledger.length === 0
            ? `<p class="muted">No transactions yet.</p>`
            : report.ledger
                .map((step) => {
                  const effects = step.effects
                    .map(
                      (fx) => `
                    <tr>
                      <td><strong>${esc(fx.name)}</strong></td>
                      <td class="muted">${esc(fx.note)}</td>
                      <td class="right ${printClass(fx.delta)}">${formatDeltaText(fx.delta)}</td>
                      <td class="right ${printClass(fx.balanceAfter)}">${esc(balanceLabelText(fx.balanceAfter))}</td>
                    </tr>`,
                    )
                    .join("");
                  const running = participants
                    .map((name) => {
                      const b = step.balancesAfter[name] ?? 0;
                      return `${esc(name)}: <span class="${printClass(b)}">${esc(balanceLabelText(b))}</span>`;
                    })
                    .join(" · ");
                  return `
              <div class="step">
                <div>
                  <span class="badge">#${step.index}</span>
                  <span class="badge ${step.kind === "expense" ? "badge-expense" : "badge-payment"}">${step.kind}</span>
                  <span class="muted">${esc(formatDate(step.date))}</span>
                  <strong>${esc(step.title)}</strong>
                  <strong style="float:right">${formatCurrency(step.amount)}</strong>
                  <div style="clear:both"></div>
                </div>
                <p class="muted">${esc(step.summary)}</p>
                <table>
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>What happened</th>
                      <th class="right">Change</th>
                      <th class="right">Balance after</th>
                    </tr>
                  </thead>
                  <tbody>${effects}</tbody>
                </table>
                <p class="muted" style="margin-top:8px"><strong>Running balances:</strong> ${running}</p>
              </div>`;
                })
                .join("")
        }
      </section>`
      : "";

  const expenseRows = report.expenses
    .map(
      (e) => `
      <tr>
        <td>${esc(formatDate(e.date))}</td>
        <td>${esc(e.description)}</td>
        <td>${esc(e.paidBy)}</td>
        <td class="muted">${esc(
          e.sharedBy.length === participants.length
            ? "Everyone"
            : e.sharedBy.join(", "),
        )}</td>
        <td class="right">${formatCurrency(e.amount)}</td>
      </tr>`,
    )
    .join("");

  const paymentRows = report.payments
    .map(
      (p) => `
      <tr>
        <td>${esc(formatDate(p.date))}</td>
        <td>${esc(p.from)}</td>
        <td>${esc(p.to)}</td>
        <td class="muted">${esc(p.note?.trim() || "—")}</td>
        <td class="right">${formatCurrency(p.amount)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(report.tripName)} — Settlement report</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <h2>${esc(report.tripName)}</h2>
  <p class="muted">Final settlement report · Generated ${esc(generatedLabel)} · full step detail included</p>
  <p class="muted">Participants: ${esc(report.participants.join(", "))}</p>

  <section>
    <h3>Trip summary</h3>
    <div class="stat-grid">
      <div class="stat"><div class="stat-label">Total spent</div><div class="stat-value">${formatCurrency(report.totalSpent)}</div></div>
      <div class="stat"><div class="stat-label">Expenses</div><div class="stat-value">${report.expenseCount}</div></div>
      <div class="stat"><div class="stat-label">Payments recorded</div><div class="stat-value">${report.paymentCount}</div></div>
      <div class="stat"><div class="stat-label">Date range</div><div class="stat-value">${esc(dateRangeLabel)}</div></div>
    </div>
  </section>

  <section>
    <h3>Per-person summary</h3>
    <table>
      <thead>
        <tr>
          <th>Person</th>
          <th class="right">Paid</th>
          <th class="right">Fair share</th>
          <th class="right">Sent</th>
          <th class="right">Received</th>
          <th class="right">Net</th>
        </tr>
      </thead>
      <tbody>${peopleRows}</tbody>
    </table>
    <p class="muted">Net = paid − fair share + payments sent − payments received.</p>
  </section>

  <section>
    <h3>Remaining settlements</h3>
    ${remainingHtml}
  </section>

  ${ledgerHtml}

  <section>
    <h3>All expenses (${report.expenseCount})</h3>
    ${
      report.expenses.length === 0
        ? `<p class="muted">No expenses recorded.</p>`
        : `<table>
      <thead>
        <tr>
          <th>Date</th><th>Description</th><th>Paid by</th><th>Shared by</th><th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>${expenseRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4"><strong>Total</strong></td>
          <td class="right"><strong>${formatCurrency(report.totalSpent)}</strong></td>
        </tr>
      </tfoot>
    </table>`
    }
  </section>

  <section>
    <h3>Recorded payments (${report.paymentCount})</h3>
    ${
      report.payments.length === 0
        ? `<p class="muted">No settlement payments recorded.</p>`
        : `<table>
      <thead>
        <tr>
          <th>Date</th><th>From</th><th>To</th><th>Note</th><th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>${paymentRows}</tbody>
    </table>`
    }
  </section>

  <section class="footer-box">
    <h3>Validation</h3>
    <p>
      Balance checksum:
      <strong>${report.balanceChecksum >= 0 ? "+" : "−"}${formatCurrency(report.balanceChecksum)}</strong>
      ${
        report.isBalanced
          ? `<span class="ok"> ✓ balanced</span>`
          : `<span class="warn"> ⚠ not zero — check data</span>`
      }
    </p>
    <p class="muted">Ledger steps in this document: ${report.ledger.length}</p>
  </section>
</body>
</html>`;
}

/** Print without popup windows (works better on mobile / strict browsers). */
function printHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Settlement report print");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    // Last resort: open blob URL
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank");
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  };

  // Give layout a tick, then print
  setTimeout(() => {
    try {
      win?.focus();
      win?.print();
    } finally {
      cleanup();
    }
  }, 250);
}
