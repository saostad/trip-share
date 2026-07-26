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
import { ChevronLeft, ChevronRight } from "lucide-react";
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

const STEPS = [
  { id: "details", label: "Details" },
  { id: "amount", label: "Amount" },
  { id: "people", label: "People" },
  { id: "receipt", label: "Receipt" },
] as const;

export function ExpenseForm({
  expense,
  participants,
  tripId,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const isEditMode = !!expense;

  const [step, setStep] = useState(0);

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

  const allSelected =
    participants.length > 0 && participants.every((p) => sharedBy.includes(p));
  const isLastStep = step === STEPS.length - 1;

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

  function validateCurrentStep(): boolean {
    if (step === 1) {
      const parsedAmount = parseFloat(amount);
      if (!parsedAmount || parsedAmount <= 0) {
        setAmountError("Amount must be greater than $0.00");
        return false;
      }
      setAmountError("");
      return true;
    }

    if (step === 2) {
      if (sharedBy.length === 0) {
        setSharedByError("At least one participant must be selected");
        return false;
      }
      setSharedByError("");
      return true;
    }

    return true;
  }

  function handleNext() {
    if (!validateCurrentStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    let hasError = false;

    if (!parsedAmount || parsedAmount <= 0) {
      setAmountError("Amount must be greater than $0.00");
      setStep(1);
      hasError = true;
    } else {
      setAmountError("");
    }

    if (sharedBy.length === 0) {
      setSharedByError("At least one participant must be selected");
      if (!hasError) setStep(2);
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

    if (!isEditMode) {
      setDescription("");
      setDate(today);
      setAmount("");
      setPaidBy(participants[0] ?? "");
      setSharedBy([...participants]);
      setAttachment(null);
      setStep(0);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors " +
                (i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted text-muted-foreground")
              }
            >
              {i + 1}
            </div>
            <span
              className={
                "text-[10px] font-medium " +
                (i === step ? "text-foreground" : "text-muted-foreground")
              }
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step 1: Description + Date */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="expense-description"
              className="text-sm font-medium leading-none"
            >
              Description
            </label>
            <Input
              id="expense-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this expense for?"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="expense-date"
              className="text-sm font-medium leading-none"
            >
              Date
            </label>
            <Input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 2: Amount */}
      {step === 1 && (
        <div className="space-y-2">
          <label
            htmlFor="expense-amount"
            className="text-sm font-medium leading-none"
          >
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
              autoFocus
            />
          </div>
          {amountError && (
            <p id="expense-amount-error" className="text-sm text-destructive">
              {amountError}
            </p>
          )}
        </div>
      )}

      {/* Step 3: Paid by + Shared by */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Paid by</label>
            <Select
              value={paidBy}
              onValueChange={(val) => setPaidBy(val as string)}
            >
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
              aria-describedby={
                sharedByError ? "expense-shared-by-error" : undefined
              }
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium cursor-pointer"
                >
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
        </div>
      )}

      {/* Step 4: Summary + Attachment */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-input bg-muted/30 p-3 text-sm space-y-1.5">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Description</span>
              <span className="font-medium text-right truncate max-w-[60%]">
                {description.trim() || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{date}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">
                ${parseFloat(amount || "0").toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Paid by</span>
              <span className="font-medium">{paidBy || "—"}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Shared by</span>
              <span className="font-medium text-right max-w-[60%]">
                {sharedBy.length === participants.length
                  ? "Everyone"
                  : sharedBy.join(", ") || "—"}
              </span>
            </div>
          </div>

          {tripId && (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Receipt / Document (optional)
              </label>
              <FileUpload
                storagePath={`trips/${tripId}/expenses`}
                value={attachment}
                onChange={setAttachment}
              />
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-2 pt-2">
        <div className="flex gap-2">
          {onCancel && step === 0 && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {!isLastStep ? (
            <Button type="button" onClick={handleNext} className="gap-1">
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button type="submit">
              {isEditMode ? "Save Changes" : "Add Expense"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
