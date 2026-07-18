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
import { format } from "date-fns";

export interface PaymentSubmitData {
  from: string;
  to: string;
  amount: number;
  date: string;
  note: string;
}

interface PaymentFormProps {
  participants: string[];
  onSubmit: (payments: PaymentSubmitData[]) => void;
  onCancel: () => void;
}

export function PaymentForm({ participants, onSubmit, onCancel }: PaymentFormProps) {
  const today = format(new Date(), "yyyy-MM-dd");

  const [onBehalfMode, setOnBehalfMode] = useState(false);
  const [from, setFrom] = useState(participants[0] ?? "");
  const [to, setTo] = useState(participants[1] ?? "");
  const [onBehalfOf, setOnBehalfOf] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");

  const [amountError, setAmountError] = useState("");
  const [personError, setPersonError] = useState("");
  const [behalfError, setBehalfError] = useState("");

  // People who can be selected as "on behalf of" (everyone except "from" and "to")
  const behalfOptions = participants.filter((p) => p !== from && p !== to);

  function handleToggleBehalf(person: string) {
    setOnBehalfOf((prev) =>
      prev.includes(person)
        ? prev.filter((p) => p !== person)
        : [...prev, person]
    );
    if (behalfError) setBehalfError("");
  }

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

    if (onBehalfMode && onBehalfOf.length === 0) {
      setBehalfError("Select at least one person");
      hasError = true;
    } else {
      setBehalfError("");
    }

    if (hasError) return;

    if (!onBehalfMode) {
      // Single payment: from pays to
      onSubmit([{ from, to, amount: parsedAmount, date, note: note.trim() }]);
    } else {
      // Split: "from" is paying "to" on behalf of multiple people
      // The total is split equally among "from" + the selected people
      const allPayers = [from, ...onBehalfOf];
      const perPerson = Math.round((parsedAmount / allPayers.length) * 100) / 100;

      const payments: PaymentSubmitData[] = allPayers.map((person) => ({
        from: person,
        to,
        amount: perPerson,
        date,
        note: note.trim()
          ? `${note.trim()} (paid by ${from} on behalf of ${allPayers.join(", ")})`
          : `Paid by ${from} on behalf of ${allPayers.join(", ")}`,
      }));

      onSubmit(payments);
    }
  }

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

      {/* On behalf of toggle */}
      <div className="space-y-2 rounded-lg border border-input p-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="on-behalf-toggle"
            checked={onBehalfMode}
            onCheckedChange={(checked) => {
              setOnBehalfMode(!!checked);
              if (!checked) { setOnBehalfOf([]); setBehalfError(""); }
            }}
          />
          <label htmlFor="on-behalf-toggle" className="cursor-pointer text-sm font-medium">
            Paying on behalf of others
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Enable this if the payer is covering the payment for other people too. The total will be split equally.
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
            {onBehalfOf.length > 0 && amount && parseFloat(amount) > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Each person&apos;s share: ${(parseFloat(amount) / (onBehalfOf.length + 1)).toFixed(2)}
              </p>
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

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Record Payment</Button>
      </div>
    </form>
  );
}
