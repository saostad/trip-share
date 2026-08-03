import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  personBalanceBreakdown,
  type SettlementExplanation,
} from "@/lib/balances";
import { buildLedger } from "@/lib/settlementReport";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ArrowRight, Download, FileText, Printer } from "lucide-react";
import type { Expense, Payment } from "@/types";

interface SettlementLineReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripName: string;
  transaction: SettlementExplanation | null;
  expenses: Expense[];
  payments: Payment[];
  participants: string[];
}

export function SettlementLineReportDialog({
  open,
  onOpenChange,
  tripName,
  transaction,
  expenses,
  payments,
  participants,
}: SettlementLineReportDialogProps) {
  const data = useMemo(() => {
    if (!transaction) return null;
    return buildLineReport(
      tripName,
      transaction,
      expenses,
      payments,
      participants,
    );
  }, [tripName, transaction, expenses, payments, participants]);

  if (!transaction || !data) return null;

  function handlePrint() {
    printHtml(buildLineHtml(data!));
  }

  function handleDownload() {
    const html = buildLineHtml(data!);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = `${data!.from}-pays-${data!.to}`
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-|-$/g, "");
    a.href = url;
    a.download = `${safe}-settlement-line.html`;
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
              Settlement line detail
            </DialogTitle>
            <div className="flex flex-wrap gap-2">
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
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm">
          <div className="mb-4 border-b pb-3">
            <h2 className="text-lg font-bold">{data.tripName}</h2>
            <p className="text-xs text-muted-foreground">
              Focused report for one suggested settlement · Generated{" "}
              {data.generatedLabel}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5">
              <span className="font-semibold text-destructive">{data.from}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-emerald-600">{data.to}</span>
              <span className="ml-auto text-lg font-bold tabular-nums">
                {formatCurrency(data.amount)}
              </span>
            </div>
          </div>

          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Why this amount
            </h3>
            <div className="space-y-1.5 rounded-lg border bg-muted/20 px-3 py-2.5 text-xs">
              <p>
                Debt simplification pairs largest remaining debts with largest
                remaining credits (step {data.step}).
              </p>
              <p>
                min(
                {formatCurrency(data.fromRemainingBefore)} still owed by{" "}
                {data.from}, {formatCurrency(data.toRemainingBefore)} still due
                to {data.to}) ={" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(data.amount)}
                </span>
              </p>
              <p className="text-muted-foreground">{data.amountReason}</p>
            </div>
          </section>

          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Net balance breakdown
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <BreakdownCard
                title={`${data.from} (pays)`}
                variant="owes"
                paid={data.fromBreakdown.totalPaid}
                share={data.fromBreakdown.totalShare}
                sent={data.fromBreakdown.paymentsSent}
                received={data.fromBreakdown.paymentsReceived}
                net={data.fromBreakdown.netBalance}
                remaining={data.fromRemainingBefore}
                remainingLabel="Still to pay (this step)"
              />
              <BreakdownCard
                title={`${data.to} (receives)`}
                variant="owed"
                paid={data.toBreakdown.totalPaid}
                share={data.toBreakdown.totalShare}
                sent={data.toBreakdown.paymentsSent}
                received={data.toBreakdown.paymentsReceived}
                net={data.toBreakdown.netBalance}
                remaining={data.toRemainingBefore}
                remainingLabel="Still to receive (this step)"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Net = paid − fair share + settlements sent − settlements received.
            </p>
          </section>

          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Expenses involving {data.from} or {data.to} ({data.relevantExpenses.length})
            </h3>
            {data.relevantExpenses.length === 0 ? (
              <p className="text-xs text-muted-foreground">None.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[28rem] text-left text-xs">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-2 py-2 font-medium">Date</th>
                      <th className="px-2 py-2 font-medium">Description</th>
                      <th className="px-2 py-2 font-medium">Paid by</th>
                      <th className="px-2 py-2 font-medium text-right">Amount</th>
                      <th className="px-2 py-2 font-medium text-right">
                        {data.from} impact
                      </th>
                      <th className="px-2 py-2 font-medium text-right">
                        {data.to} impact
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.relevantExpenses.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="whitespace-nowrap px-2 py-1.5">
                          {formatDate(row.date)}
                        </td>
                        <td className="max-w-[8rem] truncate px-2 py-1.5">
                          {row.description}
                        </td>
                        <td className="px-2 py-1.5">{row.paidBy}</td>
                        <td className="px-2 py-1.5 text-right">
                          {formatCurrency(row.amount)}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-right font-mono ${
                            row.fromImpact > 0.01
                              ? "text-emerald-600"
                              : row.fromImpact < -0.01
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {formatSigned(row.fromImpact)}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-right font-mono ${
                            row.toImpact > 0.01
                              ? "text-emerald-600"
                              : row.toImpact < -0.01
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {formatSigned(row.toImpact)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Payments involving {data.from} or {data.to} ({data.relevantPayments.length})
            </h3>
            {data.relevantPayments.length === 0 ? (
              <p className="text-xs text-muted-foreground">None recorded.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[24rem] text-left text-xs">
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
                    {data.relevantPayments.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="whitespace-nowrap px-2 py-1.5">
                          {formatDate(p.date)}
                        </td>
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

          <section className="mb-2">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ledger steps affecting {data.from} or {data.to}
            </h3>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Only steps where either person&apos;s balance changed. Running balances
              shown for those two people.
            </p>
            {data.ledgerSteps.length === 0 ? (
              <p className="text-xs text-muted-foreground">No steps.</p>
            ) : (
              <ol className="space-y-3">
                {data.ledgerSteps.map((step) => (
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
                      <span className="text-muted-foreground">
                        {formatDate(step.date)}
                      </span>
                      <span className="font-semibold">{step.title}</span>
                      <span className="ml-auto font-semibold">
                        {formatCurrency(step.amount)}
                      </span>
                    </div>
                    <p className="mb-2 text-muted-foreground">{step.summary}</p>
                    <div className="overflow-x-auto rounded border">
                      <table className="w-full text-left">
                        <thead className="border-b bg-muted/40">
                          <tr>
                            <th className="px-2 py-1.5 font-medium">Person</th>
                            <th className="px-2 py-1.5 font-medium">What happened</th>
                            <th className="px-2 py-1.5 font-medium text-right">
                              Change
                            </th>
                            <th className="px-2 py-1.5 font-medium text-right">
                              Balance after
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {step.effects
                            .filter(
                              (fx) =>
                                fx.name === data.from || fx.name === data.to,
                            )
                            .map((fx) => (
                              <tr key={fx.name} className="border-b last:border-0">
                                <td className="px-2 py-1 font-medium">{fx.name}</td>
                                <td className="px-2 py-1 text-muted-foreground">
                                  {fx.note}
                                </td>
                                <td
                                  className={`px-2 py-1 text-right font-mono ${
                                    fx.delta > 0.01
                                      ? "text-emerald-600"
                                      : fx.delta < -0.01
                                        ? "text-destructive"
                                        : ""
                                  }`}
                                >
                                  {formatSigned(fx.delta)}
                                </td>
                                <td className="px-2 py-1 text-right font-medium">
                                  {balanceLabel(fx.balanceAfter)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BreakdownCard({
  title,
  variant,
  paid,
  share,
  sent,
  received,
  net,
  remaining,
  remainingLabel,
}: {
  title: string;
  variant: "owes" | "owed";
  paid: number;
  share: number;
  sent: number;
  received: number;
  net: number;
  remaining: number;
  remainingLabel: string;
}) {
  const tint =
    variant === "owes"
      ? "border-destructive/20 bg-destructive/5"
      : "border-emerald-500/20 bg-emerald-500/5";

  return (
    <div className={`rounded-md border px-2.5 py-2 text-xs space-y-1 ${tint}`}>
      <p className="font-medium text-foreground">{title}</p>
      <ul className="space-y-0.5 tabular-nums">
        <li className="flex justify-between gap-2">
          <span>Paid for expenses</span>
          <span>{formatCurrency(paid)}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Fair share</span>
          <span>−{formatCurrency(share)}</span>
        </li>
        {sent > 0 && (
          <li className="flex justify-between gap-2">
            <span>Settlements sent</span>
            <span>+{formatCurrency(sent)}</span>
          </li>
        )}
        {received > 0 && (
          <li className="flex justify-between gap-2">
            <span>Settlements received</span>
            <span>−{formatCurrency(received)}</span>
          </li>
        )}
        <li className="flex justify-between gap-2 border-t border-border/60 pt-1 font-medium text-foreground">
          <span>Net balance</span>
          <span>
            {net >= 0 ? "+" : ""}
            {formatCurrency(net)}
          </span>
        </li>
        <li className="flex justify-between gap-2">
          <span>{remainingLabel}</span>
          <span className="font-medium text-foreground">
            {formatCurrency(remaining)}
          </span>
        </li>
      </ul>
    </div>
  );
}

function formatSigned(n: number): string {
  if (Math.abs(n) < 0.005) return "0.00";
  const sign = n > 0 ? "+" : "−";
  return `${sign}${formatCurrency(n)}`;
}

function balanceLabel(n: number): string {
  if (n > 0.01) return `owed ${formatCurrency(n)}`;
  if (n < -0.01) return `owes ${formatCurrency(n)}`;
  return "settled";
}

interface LineReportData {
  tripName: string;
  generatedLabel: string;
  from: string;
  to: string;
  amount: number;
  step: number;
  fromRemainingBefore: number;
  toRemainingBefore: number;
  amountReason: string;
  fromBreakdown: ReturnType<typeof personBalanceBreakdown>;
  toBreakdown: ReturnType<typeof personBalanceBreakdown>;
  relevantExpenses: {
    id: string;
    date: string;
    description: string;
    paidBy: string;
    amount: number;
    fromImpact: number;
    toImpact: number;
  }[];
  relevantPayments: Payment[];
  ledgerSteps: ReturnType<typeof buildLedger>;
}

function buildLineReport(
  tripName: string,
  tx: SettlementExplanation,
  expenses: Expense[],
  payments: Payment[],
  participants: string[],
): LineReportData {
  const fromBreakdown = personBalanceBreakdown(tx.from, expenses, payments);
  const toBreakdown = personBalanceBreakdown(tx.to, expenses, payments);

  const amountReason =
    tx.fromRemainingBefore <= tx.toRemainingBefore
      ? `${tx.from} still owed ${formatCurrency(tx.fromRemainingBefore)} at this step, so the transfer is that full amount.`
      : `${tx.to} was still owed ${formatCurrency(tx.toRemainingBefore)} at this step, so the transfer covers that full credit.`;

  const relevantExpenses = expenses
    .filter(
      (e) =>
        e.paidBy === tx.from ||
        e.paidBy === tx.to ||
        e.sharedBy.includes(tx.from) ||
        e.sharedBy.includes(tx.to),
    )
    .map((e) => {
      const share =
        e.sharedBy.length > 0 ? e.amount / e.sharedBy.length : 0;
      const impact = (name: string) => {
        let d = 0;
        if (e.paidBy === name) d += e.amount;
        if (e.sharedBy.includes(name)) d -= share;
        return Math.round(d * 100) / 100;
      };
      return {
        id: e.id,
        date: e.date,
        description: e.description,
        paidBy: e.paidBy,
        amount: e.amount,
        fromImpact: impact(tx.from),
        toImpact: impact(tx.to),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const relevantPayments = payments
    .filter(
      (p) =>
        p.from === tx.from ||
        p.from === tx.to ||
        p.to === tx.from ||
        p.to === tx.to,
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const fullLedger = buildLedger(participants, expenses, payments);
  const ledgerSteps = fullLedger.filter((step) =>
    step.effects.some((fx) => fx.name === tx.from || fx.name === tx.to),
  );

  let generatedLabel: string;
  try {
    generatedLabel = new Date().toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    generatedLabel = new Date().toISOString();
  }

  return {
    tripName,
    generatedLabel,
    from: tx.from,
    to: tx.to,
    amount: tx.amount,
    step: tx.step,
    fromRemainingBefore: tx.fromRemainingBefore,
    toRemainingBefore: tx.toRemainingBefore,
    amountReason,
    fromBreakdown,
    toBreakdown,
    relevantExpenses,
    relevantPayments,
    ledgerSteps,
  };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildLineHtml(data: LineReportData): string {
  const styles = `
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.45; color: #111; margin: 16px; }
    h2 { font-size: 18px; margin: 0 0 4px; }
    h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #555; margin: 16px 0 8px; }
    .muted { color: #666; font-size: 11px; }
    .hero { border: 1px solid #ddd; border-radius: 8px; padding: 12px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .neg { color: #dc2626; font-weight: 600; }
    .pos { color: #059669; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f5f5f5; }
    td.right, th.right { text-align: right; }
    .box { border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
    .step { border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin-bottom: 10px; }
  `;

  const expenseRows = data.relevantExpenses
    .map(
      (e) => `
    <tr>
      <td>${esc(formatDate(e.date))}</td>
      <td>${esc(e.description)}</td>
      <td>${esc(e.paidBy)}</td>
      <td class="right">${formatCurrency(e.amount)}</td>
      <td class="right">${formatSigned(e.fromImpact)}</td>
      <td class="right">${formatSigned(e.toImpact)}</td>
    </tr>`,
    )
    .join("");

  const paymentRows = data.relevantPayments
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

  const ledgerHtml = data.ledgerSteps
    .map((step) => {
      const effects = step.effects
        .filter((fx) => fx.name === data.from || fx.name === data.to)
        .map(
          (fx) => `
        <tr>
          <td><strong>${esc(fx.name)}</strong></td>
          <td class="muted">${esc(fx.note)}</td>
          <td class="right">${formatSigned(fx.delta)}</td>
          <td class="right">${esc(balanceLabel(fx.balanceAfter))}</td>
        </tr>`,
        )
        .join("");
      return `
      <div class="step">
        <div><strong>#${step.index}</strong> · ${esc(step.kind)} · ${esc(formatDate(step.date))} · ${esc(step.title)}
          <strong style="float:right">${formatCurrency(step.amount)}</strong></div>
        <p class="muted">${esc(step.summary)}</p>
        <table>
          <thead><tr><th>Person</th><th>What happened</th><th class="right">Change</th><th class="right">Balance after</th></tr></thead>
          <tbody>${effects}</tbody>
        </table>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(data.from)} → ${esc(data.to)} settlement</title><style>${styles}</style></head><body>
  <h2>${esc(data.tripName)}</h2>
  <p class="muted">Settlement line detail · ${esc(data.generatedLabel)}</p>
  <div class="hero">
    <span class="neg">${esc(data.from)}</span>
    <span>→</span>
    <span class="pos">${esc(data.to)}</span>
    <strong style="margin-left:auto;font-size:16px">${formatCurrency(data.amount)}</strong>
  </div>

  <h3>Why this amount</h3>
  <div class="box">
    <p>Debt simplification step ${data.step}.</p>
    <p>min(${formatCurrency(data.fromRemainingBefore)} still owed by ${esc(data.from)},
       ${formatCurrency(data.toRemainingBefore)} still due to ${esc(data.to)}) =
       <strong>${formatCurrency(data.amount)}</strong></p>
    <p class="muted">${esc(data.amountReason)}</p>
  </div>

  <h3>Net balance breakdown</h3>
  <div class="box">
    <p><strong>${esc(data.from)}</strong> (pays)</p>
    <p>Paid ${formatCurrency(data.fromBreakdown.totalPaid)} · Share −${formatCurrency(data.fromBreakdown.totalShare)}
       · Sent +${formatCurrency(data.fromBreakdown.paymentsSent)}
       · Received −${formatCurrency(data.fromBreakdown.paymentsReceived)}
       · Net <strong>${formatCurrency(data.fromBreakdown.netBalance)}</strong>
       · Still to pay this step: ${formatCurrency(data.fromRemainingBefore)}</p>
  </div>
  <div class="box">
    <p><strong>${esc(data.to)}</strong> (receives)</p>
    <p>Paid ${formatCurrency(data.toBreakdown.totalPaid)} · Share −${formatCurrency(data.toBreakdown.totalShare)}
       · Sent +${formatCurrency(data.toBreakdown.paymentsSent)}
       · Received −${formatCurrency(data.toBreakdown.paymentsReceived)}
       · Net <strong>${formatCurrency(data.toBreakdown.netBalance)}</strong>
       · Still to receive this step: ${formatCurrency(data.toRemainingBefore)}</p>
  </div>

  <h3>Expenses involving ${esc(data.from)} or ${esc(data.to)}</h3>
  ${data.relevantExpenses.length === 0 ? `<p class="muted">None.</p>` : `<table>
    <thead><tr><th>Date</th><th>Description</th><th>Paid by</th><th class="right">Amount</th>
    <th class="right">${esc(data.from)}</th><th class="right">${esc(data.to)}</th></tr></thead>
    <tbody>${expenseRows}</tbody></table>`}

  <h3>Payments involving ${esc(data.from)} or ${esc(data.to)}</h3>
  ${data.relevantPayments.length === 0 ? `<p class="muted">None.</p>` : `<table>
    <thead><tr><th>Date</th><th>From</th><th>To</th><th>Note</th><th class="right">Amount</th></tr></thead>
    <tbody>${paymentRows}</tbody></table>`}

  <h3>Ledger steps affecting ${esc(data.from)} or ${esc(data.to)}</h3>
  ${ledgerHtml || `<p class="muted">None.</p>`}
  </body></html>`;
}

function printHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Settlement line print");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank");
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
