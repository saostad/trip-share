import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/expense/FileUpload";
import { Loader2 } from "lucide-react";
import type { FileAttachment } from "@/types";

export type PaymentSubmitData = {
  from: string;
  to: string;
  amount: number;
  date: string;
  note: string;
  attachment?: FileAttachment | null;
};

interface PaymentFormProps {
  participants: string[];
  tripId?: string;
  defaultFrom?: string;
  onSubmit: (payments: PaymentSubmitData[]) => void | Promise<void>;
  onCancel: () => void;
}

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function PaymentForm({
  participants,
  tripId,
  defaultFrom,
  onSubmit,
  onCancel,
}: PaymentFormProps) {
  const [from, setFrom] = useState(
    defaultFrom && participants.includes(defaultFrom)
      ? defaultFrom
      : participants[0] ?? "",
  );
  const [to, setTo] = useState(
    participants.find((p) => p !== (defaultFrom && participants.includes(defaultFrom) ? defaultFrom : participants[0])) ??
      participants[1] ??
      "",
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [onBehalfMode, setOnBehalfMode] = useState(false);
  const [onBehalfOf, setOnBehalfOf] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState(false);
  const [personAmounts, setPersonAmounts] = useState<Record<string, string>>({});
  const [amountError, setAmountError] = useState("");
  const [personError, setPersonError] = useState("");
  const [behalfError, setBehalfError] = useState("");
  const [splitError, setSplitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allPayers = onBehalfMode
    ? onBehalfOf.length > 0
      ? onBehalfOf
      : []
    : [from];

  function handleToggleBehalf(person: string) {
    setOnBehalfOf((prev) =>
      prev.includes(person)
        ? prev.filter((p) => p !== person)
        : [...prev, person],
    );
  }

  function handlePersonAmountChange(person: string, value: string) {
    setPersonAmounts((prev) => ({ ...prev, [person]: value }));
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
        setSplitError(
          `Custom amounts total $${total.toFixed(2)} but payment is $${parsedAmount.toFixed(2)}`,
        );
        hasError = true;
      } else {
        setSplitError("");
      }
    }

    if (hasError) return;

    setSubmitting(true);
    try {
      if (!onBehalfMode) {
        await onSubmit([
          {
            from,
            to,
            amount: parsedAmount,
            date,
            note: note.trim(),
            attachment,
          },
        ]);
      } else if (customAmounts) {
        const payments: PaymentSubmitData[] = allPayers
          .map((person, idx) => {
            const personAmount =
              Math.round(parseFloat(personAmounts[person] ?? "0") * 100) / 100;
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
        const perPerson =
          Math.round((parsedAmount / allPayers.length) * 100) / 100;
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">From</label>
          <Select value={from} onValueChange={(v) => setFrom(String(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {participants.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">To</label>
          <Select value={to} onValueChange={(v) => setTo(String(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {participants.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {personError && <p className="text-sm text-destructive">{personError}</p>}

      <div className="space-y-2">
        <label className="text-sm font-medium">Amount</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {amountError && (
          <p className="text-sm text-destructive">{amountError}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Date</label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Note</label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note"
        />
      </div>

      {tripId ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">Attachment</label>
          <FileUpload
            storagePath={`trips/${tripId}/payments`}
            value={attachment}
            onChange={setAttachment}
          />
        </div>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
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
