import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/ui/FileUpload";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import type { FileAttachment } from "@/types";

export interface PaymentSubmitData {
  from: string;
  to: string;
  amount: number;
  date: string;
  note: string;
  attachment?: FileAttachment | null;
}

interface PaymentFormProps {
  participants: string[];
  tripId?: string;
  /** Pre-select payer when linked to current user */
  defaultFrom?: string;
  onSubmit: (payments: PaymentSubmitData[]) => void | Promise<void>;
  onCancel: () => void;
}

export function PaymentForm({ participants, tripId, defaultFrom, onSubmit, onCancel }: PaymentFormProps) {
  const today = format(new Date(), "yyyy-MM-dd");

  const [onBehalfMode, setOnBehalfMode] = useState(false);
  const [customAmounts, setCustomAmounts] = useState(false);
  const [from, setFrom] = useState(() => {
    if (defaultFrom && participants.includes(defaultFrom)) return defaultFrom;
    return participants[0] ?? "";
  });
  const [to, setTo] = useState(participants[1] ?? "");
  const [onBehalfOf, setOnBehalfOf] = useState<string[]>([]);
  const [personAmounts, setPersonAmounts] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [amountError, setAmountError] = useState("");
  const [personError, setPersonError] = useState("");
  const [behalfError, setBehalfError] = useState("");
  const [splitError, setSplitError] = useState("");

  const behalfOptions = participants.filter((p) => p !== from && p !== to);

  const allPayers = onBehalfMode ? [from, ...onBehalfOf] : [from];

  function handleToggleBehalf(person: string) {
    setOnBehalfOf((prev) =>
      prev.includes(person)
        ? prev.filter((p) => p !== person)
        : [...prev, person]
    );
    if (behalfError) setBehalfError("");
    if (splitError) setSplitError("");
  }

  function handlePersonAmountChange(person: string, value: string) {
    setPersonAmounts((prev) => ({ ...prev, [person]: value }));
    if (splitError) setSplitError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const parsedAmount = parseFloat(amount);
    let hasError = false;

    if (!parsedAmount || parsedAmount <= 0) {
      setAmountError("Amount must be greater than $0.00");
      hasError = true;
    } else {
      setAmountError("");
    }

    if (from === to) {
      setPersonError("Payer and receiver must be different people");
      hasError = true;
    } else {
      setPersonError("");
    }

    if (onBehalfMode && onBehalfOf.length === 0) {
      setBehalfError("Select at least one person");
      hasError = true;
    } else {
      setBehalfError("");
    }

    if (onBehalfMode && customAmounts) {
      const total = allPayers.reduce((sum, p) => {
        const val = parseFloat(personAmounts[p] ?? "0");
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
      const diff = Math.abs(total - parsedAmount);
      if (diff > 0.01) {
        setSplitError(`Custom amounts total $${total.toFixed(2)} but payment is $${parsedAmount.toFixed(2)}`);
        hasError = true;
      } else {
        setSplitError("");
      }
    }

    if (hasError) return;

    setSubmitting(true);
    try {
      if (!onBehalfMode) {
        await onSubmit([{ from, to, amount: parsedAmount, date, note: note.trim(), attachment }]);
      } else if (customAmounts) {
        const payments: PaymentSubmitData[] = allPayers
          .map((person, idx) => {
            const personAmount = Math.round(parseFloat(personAmounts[person] ?? "0") * 100) / 100;
            return {
              from: person,
              to,
              amount: personAmount,
              date,
              note: note.trim()
                ? `${note.trim()} (paid $${parsedAmount.toFixed(2)} by ${from} on behalf of ${allPayers.join(", ")})`
                : `(paid $${parsedAmount.toFixed(2)} by ${from} on behalf of ${allPayers.join(", ")})`,
              attachment: idx === 0 ? attachment : null,
            };
          })
          .filter((p) => p.amount > 0);

        await onSubmit(payments);
      } else {
        const perPerson = Math.round((parsedAmount / allPayers.length) * 100) / 100;

        const payments: PaymentSubmitData[] = allPayers.map((person, idx) => ({
          from: person,
          to,
          amount: perPerson,
          date,
          note: note.trim()
            ? `${note.trim()} (paid $${parsedAmount.toFixed(2)} by ${from} on behalf of ${allPayers.join(", ")})`
            : `(paid $${parsedAmount.toFixed(2)} by ${from} on behalf of ${allPayers.join(", ")})`,
          attachment: idx === 0 ? attachment : null,
        }));

        await onSubmit(payments);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const customTotal = allPayers.reduce((sum, p) => {
    const val = parseFloat(personAmounts[p] ?? "0");
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const parsedTotalAmount = parseFloat(amount) || 0;
  const remaining = parsedTotalAmount - customTotal;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">From (who paid)</label>
        <Select value={from} onValueChange={(val) => { setFrom(val ?? ""); if (personError) setPersonError(""); setOnBehalfOf((prev) => prev.filter((p) => p !== val)); }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select who paid" />
          </SelectTrigger>
          <SelectContent>
            {participants.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">To (who received)</label>
        <Select value={to} onValueChange={(val) => { setTo(val ?? ""); if (personError) setPersonError(""); setOnBehalfOf((prev) => prev.filter((p) => p !== val)); }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select who received" />
          </SelectTrigger>
          <SelectContent>
            {participants.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {personError && (
          <p className="text-sm text-destructive">{personError}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="payment-amount" className="text-sm font-medium leading-none">
          Total Amount
        </label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="payment-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); if (amountError) setAmountError(""); if (splitError) setSplitError(""); }}
            placeholder="0.00"
            className="pl-6"
            aria-invalid={!!amountError}
          />
        </div>
        {amountError && (
          <p className="text-sm text-destructive">{amountError}</p>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-input p-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="on-behalf-toggle"
            checked={onBehalfMode}
            onCheckedChange={(checked) => {
              setOnBehalfMode(!!checked);
              if (!checked) { setOnBehalfOf([]); setBehalfError(""); setCustomAmounts(false); setPersonAmounts({}); setSplitError(""); }
            }}
          />
          <label htmlFor="on-behalf-toggle" className="cursor-pointer text-sm font-medium">
            Paying on behalf of others
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Enable this if the payer is covering the payment for other people too.
        </p>

        {onBehalfMode && (
          <div className="mt-2 space-y-2 border-t pt-2">
            <p className="text-xs font-medium text-muted-foreground">
              Split payment among {from} and:
            </p>
            {behalfOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No other participants available.</p>
            ) : (
              behalfOptions.map((person) => (
                <div key={person} className="flex items-center gap-2">
                  <Checkbox
                    id={`behalf-${person}`}
                    checked={onBehalfOf.includes(person)}
                    onCheckedChange={() => handleToggleBehalf(person)}
                  />
                  <label htmlFor={`behalf-${person}`} className="cursor-pointer text-sm">
                    {person}
                  </label>
                </div>
              ))
            )}
            {behalfError && (
              <p className="text-sm text-destructive">{behalfError}</p>
            )}

            {onBehalfOf.length > 0 && (
              <div className="mt-2 space-y-2 border-t pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="custom-amounts-toggle"
                    checked={customAmounts}
                    onCheckedChange={(checked) => {
                      setCustomAmounts(!!checked);
                      if (!checked) { setPersonAmounts({}); setSplitError(""); }
                    }}
                  />
                  <label htmlFor="custom-amounts-toggle" className="cursor-pointer text-sm font-medium">
                    Custom amounts per person
                  </label>
                </div>

                {!customAmounts && parsedTotalAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Equal split: ${(parsedTotalAmount / allPayers.length).toFixed(2)} each
                  </p>
                )}

                {customAmounts && (
                  <div className="space-y-2">
                    {allPayers.map((person) => (
                      <div key={person} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm">{person}</span>
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={personAmounts[person] ?? ""}
                            onChange={(e) => handlePersonAmountChange(person, e.target.value)}
                            placeholder="0.00"
                            className="h-8 pl-5 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Total: ${customTotal.toFixed(2)} / ${parsedTotalAmount.toFixed(2)}
                      </span>
                      {Math.abs(remaining) > 0.01 && (
                        <span className={remaining > 0 ? "text-amber-600" : "text-destructive"}>
                          {remaining > 0 ? `$${remaining.toFixed(2)} remaining` : `$${Math.abs(remaining).toFixed(2)} over`}
                        </span>
                      )}
                      {Math.abs(remaining) <= 0.01 && parsedTotalAmount > 0 && (
                        <span className="text-emerald-600">Balanced</span>
                      )}
                    </div>
                    {splitError && (
                      <p className="text-sm text-destructive">{splitError}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="payment-date" className="text-sm font-medium leading-none">
          Date
        </label>
        <Input
          id="payment-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="payment-note" className="text-sm font-medium leading-none">
          Note (optional)
        </label>
        <Input
          id="payment-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Venmo transfer"
        />
      </div>

      {tripId && (
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Receipt / Document (optional)</label>
          <FileUpload
            storagePath={`trips/${tripId}/payments`}
            value={attachment}
            onChange={setAttachment}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="gap-1.5">
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitting ? "Recording..." : "Record Payment"}
        </Button>
      </div>
    </form>
  );
}
