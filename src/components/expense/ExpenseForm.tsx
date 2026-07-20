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
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/ui/FileUpload";
import { format } from "date-fns";
import type { Expense, FileAttachment } from "@/types";

interface ExpenseFormProps {
  expense?: Expense;
  participants: string[];
  tripId?: string;
  onSubmit: (data: {
    description: string;
    date: string;
    amount: number;
    paidBy: string;
    sharedBy: string[];
    attachment?: FileAttachment | null;
  }) => void;
  onCancel?: () => void;
}

export function ExpenseForm({
  expense,
  participants,
  tripId,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const isEditMode = !!expense;

  const [description, setDescription] = useState(expense?.description ?? "");
  const [date, setDate] = useState(expense?.date ?? today);
  const [amount, setAmount] = useState(
    expense ? String(expense.amount) : ""
  );
  const [paidBy, setPaidBy] = useState(expense?.paidBy ?? (participants[0] ?? ""));
  const [sharedBy, setSharedBy] = useState<string[]>(
    expense?.sharedBy ?? [...participants]
  );
  const [attachment, setAttachment] = useState<FileAttachment | null>(
    expense?.attachment ?? null
  );

  const [amountError, setAmountError] = useState("");
  const [sharedByError, setSharedByError] = useState("");

  const allSelected = participants.length > 0 && participants.every((p) => sharedBy.includes(p));

  function handleToggleParticipant(participant: string) {
    setSharedBy((prev) =>
      prev.includes(participant)
        ? prev.filter((p) => p !== participant)
        : [...prev, participant]
    );
    if (sharedByError) setSharedByError("");
  }

  function handleSelectAll() {
    if (allSelected) {
      setSharedBy([]);
    } else {
      setSharedBy([...participants]);
    }
    if (sharedByError) setSharedByError("");
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

    if (sharedBy.length === 0) {
      setSharedByError("At least one participant must be selected");
      hasError = true;
    } else {
      setSharedByError("");
    }

    if (hasError) return;

    onSubmit({
      description: description.trim(),
      date,
      amount: parsedAmount,
      paidBy,
      sharedBy,
      attachment,
    });

    // Reset form after submit (only in create mode)
    if (!isEditMode) {
      setDescription("");
      setDate(today);
      setAmount("");
      setPaidBy(participants[0] ?? "");
      setSharedBy([...participants]);
      setAttachment(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="expense-description" className="text-sm font-medium leading-none">
          Description
        </label>
        <Input
          id="expense-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was this expense for?"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="expense-date" className="text-sm font-medium leading-none">
          Date
        </label>
        <Input
          id="expense-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="expense-amount" className="text-sm font-medium leading-none">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="expense-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (amountError) setAmountError("");
            }}
            placeholder="0.00"
            className="pl-6"
            aria-invalid={!!amountError}
            aria-describedby={amountError ? "expense-amount-error" : undefined}
          />
        </div>
        {amountError && (
          <p id="expense-amount-error" className="text-sm text-destructive">
            {amountError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">Paid by</label>
        <Select value={paidBy} onValueChange={(val) => setPaidBy(val as string)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select who paid" />
          </SelectTrigger>
          <SelectContent>
            {participants.map((participant) => (
              <SelectItem key={participant} value={participant}>
                {participant}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">Shared by</label>
        <div
          className="space-y-2 rounded-lg border border-input p-3"
          role="group"
          aria-labelledby="shared-by-label"
          aria-describedby={sharedByError ? "expense-shared-by-error" : undefined}
        >
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              Select All
            </label>
          </div>
          <div className="h-px bg-border" />
          {participants.map((participant) => (
            <div key={participant} className="flex items-center gap-2">
              <Checkbox
                id={`shared-${participant}`}
                checked={sharedBy.includes(participant)}
                onCheckedChange={() => handleToggleParticipant(participant)}
              />
              <label
                htmlFor={`shared-${participant}`}
                className="text-sm cursor-pointer"
              >
                {participant}
              </label>
            </div>
          ))}
        </div>
        {sharedByError && (
          <p id="expense-shared-by-error" className="text-sm text-destructive">
            {sharedByError}
          </p>
        )}
      </div>

      {/* File attachment */}
      {tripId && (
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Receipt / Document (optional)</label>
          <FileUpload
            storagePath={`trips/${tripId}/expenses`}
            value={attachment}
            onChange={setAttachment}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">
          {isEditMode ? "Save Changes" : "Add Expense"}
        </Button>
      </div>
    </form>
  );
}
