import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import type { Payment, FileAttachment } from "@/types";

interface EditPaymentFormProps {
  payment: Payment;
  participants: string[];
  tripId?: string;
  onSubmit: (data: {
    from: string;
    to: string;
    amount: number;
    date: string;
    note: string;
    attachment?: FileAttachment | null;
  }) => void | Promise<void>;
  onCancel: () => void;
}

export function EditPaymentForm({
  payment,
  participants,
  tripId,
  onSubmit,
  onCancel,
}: EditPaymentFormProps) {
  const [from, setFrom] = useState(payment.from);
  const [to, setTo] = useState(payment.to);
  const [amount, setAmount] = useState(String(payment.amount));
  const [date, setDate] = useState(payment.date);
  const [note, setNote] = useState(payment.note ?? "");
  const [attachment, setAttachment] = useState<FileAttachment | null>(
    payment.attachment ?? null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [amountError, setAmountError] = useState("");
  const [personError, setPersonError] = useState("");

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

    if (hasError) return;

    setSubmitting(true);
    try {
      await onSubmit({
        from,
        to,
        amount: parsedAmount,
        date,
        note: note.trim(),
        attachment,
      });
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
      {personError && (
        <p className="text-sm text-destructive">{personError}</p>
      )}

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
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
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
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
