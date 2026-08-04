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
import { formatCurrency } from "@/lib/formatters";
import { Download, FileText, Printer } from "lucide-react";
import type { Expense, Payment } from "@/types";

interface SettlementReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripName: string;
  participants: string[];
  expenses: Expense[];
  payments: Payment[];
  settlementMethod?: string | null;
}

export function SettlementReportDialog({
  open,
  onOpenChange,
  tripName,
  participants,
  expenses,
  payments,
  settlementMethod,
}: SettlementReportDialogProps) {
  const [showLedger, setShowLedger] = useState(true);

  const report = useMemo(
    () =>
      buildSettlementReport(
        tripName,
        participants,
        expenses,
        payments,
        settlementMethod,
      ),
    [tripName, participants, expenses, payments, settlementMethod],
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

  function handlePrint() {
    const html = buildReportHtml(report, generatedLabel);
    printHtml(html);
  }

  function handleDownload() {
    const html = buildReportHtml(report, generatedLabel);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName =
      tripName.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "trip";
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
            Method: {report.settlementMethodLabel}. Print / Download include full
            step detail.
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
              Remaining settlements ({report.settlementMethodLabel})
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
                    <span className="ml-auto font-semibold">
                      {formatCurrency(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
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
                      <td className="px-2 py-1.5 text-right">
                        {formatCurrency(p.totalPaid)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatCurrency(p.totalShare)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatCurrency(p.paymentsSent)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatCurrency(p.paymentsReceived)}
                      </td>
                      <td
                        className={`px-2 py-1.5 text-right font-semibold ${balanceClass(p.netBalance)}`}
                      >
                        {balanceLabel(p.netBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {showLedger && (
            <section className="mb-5">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Transaction detail (step by step)
              </h3>
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
                        <span className="font-semibold">{step.title}</span>
                        <span className="ml-auto font-semibold">
                          {formatCurrency(step.amount)}
                        </span>
                      </div>
                      <p className="mb-2 text-muted-foreground">{step.summary}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          <section className="rounded-lg border bg-muted/20 px-3 py-3">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Validation
            </h3>
            <ul className="space-y-1 text-xs">
              <li>
                Balance checksum:{" "}
                <span className="font-mono font-medium">
                  {report.balanceChecksum >= 0 ? "+" : "-"}
                  {formatCurrency(report.balanceChecksum)}
                </span>
                {report.isBalanced ? (
                  <span className="ml-2 text-emerald-600">balanced</span>
                ) : (
                  <span className="ml-2 text-destructive">not zero</span>
                )}
              </li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

function buildReportHtml(
  report: SettlementReportData,
  generatedLabel: string,
): string {
  const remaining =
    report.remainingSettlements.length === 0
      ? "<p>All settled.</p>"
      : "<ul>" +
        report.remainingSettlements
          .map(
            (t) =>
              "<li><strong>" +
              esc(t.from) +
              "</strong> pays <strong>" +
              esc(t.to) +
              "</strong> " +
              formatCurrency(t.amount) +
              "</li>",
          )
          .join("") +
        "</ul>";

  return (
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><title>" +
    esc(report.tripName) +
    " — Settlement</title></head><body>" +
    "<h2>" +
    esc(report.tripName) +
    "</h2>" +
    "<p>Generated " +
    esc(generatedLabel) +
    " · Method: " +
    esc(report.settlementMethodLabel) +
    "</p>" +
    "<p>Participants: " +
    esc(report.participants.join(", ")) +
    "</p>" +
    "<h3>Remaining settlements</h3>" +
    remaining +
    "<p>Checksum: " +
    formatCurrency(report.balanceChecksum) +
    (report.isBalanced ? " (balanced)" : " (check data)") +
    "</p></body></html>"
  );
}

function printHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 1000);
    }
  }, 250);
}
