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
import { format } from "date-fns";

interface PaymentFormProps {
  participants: string[];
  onSubmit: (data: {
    from: string;
    to: string;
    amount: number;
    date: string;
    note: string;
  }) => void;
  onCancel: () => void;
}

export function PaymentForm({ participants, onSubmit, onCancel }: PaymentFormProps) {
  const today = format(new Date(), "yyyy-MM-dd");

  const [from, setFrom] = useState(participants[0] ?? "");
  const [to, setTo] = useState(participants[1] ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");

  const [amountError, setAmountError] = useState("");
  const [personError, setPersonError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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

    onSubmit({ from, to, amount: parsedAmount, date, note: note.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">From (who paid)</label>
        <Select value={from} onValueChange={(val) => { setFrom(val ?? ""); if (personError) setPersonError(""); }}>
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
        <Select value={to} onValueChange={(val) => { setTo(val ?? ""); if (personError) setPersonError(""); }}>
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
          Amount
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
            onChange={(e) => { setAmount(e.target.value); if (amountError) setAmountError(""); }}
            placeholder="0.00"
            className="pl-6"
            aria-invalid={!!amountError}
          />
        </div>
        {amountError && (
          <p className="text-sm text-destructive">{amountError}</p>
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

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Record Payment</Button>
      </div>
    </form>
  );
}
