import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildSettlementReport } from "@/lib/settlementReport";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { FileText, Printer } from "lucide-react";
import type { Expense, Payment } from "@/types";

interface SettlementReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripName: string;
  participants: string[];
  expenses: Expense[];
  payments: Payment[];
}

export function SettlementReportDialog({
  open,
  onOpenChange,
  tripName,
  participants,
  expenses,
  payments,
}: SettlementReportDialogProps) {
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

  function handlePrint() {
    window.print();
  }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-4 py-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Settlement report
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={showLedger ? "default" : "outline"}
                onClick={() => setShowLedger((v) => !v)}
              >
                {showLedger ? "Hide step detail" : "Show step detail"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
                <Printer className="h-3.5 w-3.5" />
                Print / PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div
          id="settlement-report-print"
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm print:max-h-none print:overflow-visible print:px-0 print:py-0"
        >
          <div className="mb-4 border-b pb-3">
            <h2 className="text-lg font-bold">{report.tripName}</h2>
            <p className="text-xs text-muted-foreground">
              Final settlement report · Generated {generatedLabel}
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

          {/* Step-by-step ledger */}
          {(showLedger || true) && (
            <section className={`mb-5 ${showLedger ? "" : "print:block hidden"}`}>
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
                Step detail final balances should match the per-person summary nets.
                Use Print / PDF to keep a permanent copy.
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
