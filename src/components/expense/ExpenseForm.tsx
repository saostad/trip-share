import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Keyboard,
  Receipt,
  Loader2,
} from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  expenseCategoryPayload,
  resolveExpenseCategory,
} from "@/lib/expenseCategories";
import { extractReceipt } from "@/lib/aiApi";
import { fetchAutofillEnabled } from "@/lib/aiSettings";
import {
  applyReceiptExtraction,
  touchedFieldsForEdit,
  type AutofillCurrent,
  type AutofillEdit,
  type AutofillField,
} from "@/lib/receiptAutofill";
import { fileToReceiptImage } from "@/lib/receiptImage";
import type { Expense, FileAttachment } from "@/types";

interface ExpenseFormProps {
  expense?: Expense;
  participants: string[];
  tripId?: string;
  defaultPaidBy?: string;
  onSubmit: (data: {
    description: string;
    category?: string | null;
    date: string;
    amount: number;
    paidBy: string;
    sharedBy: string[];
    attachment?: FileAttachment | null;
  }) => void | Promise<void>;
  onCancel?: () => void;
}

const STEPS = [
  { id: "details", label: "Details" },
  { id: "amount", label: "Amount" },
  { id: "paidBy", label: "Paid by" },
  { id: "sharedBy", label: "Shared by" },
  { id: "confirm", label: "Confirm" },
] as const;

const LAST_STEP_INDEX = STEPS.length - 1;

function initialCategory(expense?: Expense): string | null {
  if (!expense) return null;
  return (
    resolveExpenseCategory(expense.category, expense.description)?.id ?? null
  );
}

type AutofillState =
  | { status: "idle" }
  | { status: "running" }
  | {
      status: "done";
      filled: AutofillField[];
      /** Whether the result had any non-null field to fill with. */
      hadReadable: boolean;
      currencyNote: string | null;
    }
  | { status: "failed"; message: string }
  | { status: "skipped" };

function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : "Something went wrong.";
}

function withoutTrailingPeriod(message: string): string {
  return message.endsWith(".") ? message.slice(0, -1) : message;
}

function friendlyFieldList(filled: AutofillField[]): string {
  return [...filled].sort().join(", ");
}

function AutofillBanner({
  autofill,
  attachmentName,
}: {
  autofill: AutofillState;
  attachmentName: string | null;
}) {
  const style = "rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground";
  switch (autofill.status) {
    case "running":
      return (
        <p className={`flex items-center gap-2 ${style}`} role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Reading receipt…
        </p>
      );
    case "done":
      if (autofill.filled.length > 0) {
        return (
          <div className={`space-y-1 ${style}`}>
            <p>
              Filled from receipt: {friendlyFieldList(autofill.filled)}. Please check.
            </p>
            {autofill.currencyNote && <p>{autofill.currencyNote}</p>}
          </div>
        );
      }
      if (!autofill.hadReadable) {
        return (
          <p className={style}>
            Couldn&apos;t read anything from this receipt. Fill in the details below.
          </p>
        );
      }
      if (!attachmentName) return null;
      return (
        <p className={style}>
          Receipt attached: {attachmentName}. Fill in the details below.
        </p>
      );
    case "failed":
      return (
        <p className={style}>
          Couldn&apos;t read the receipt: {autofill.message}. Fill in the details below.
        </p>
      );
    case "skipped":
      if (!attachmentName) return null;
      return (
        <p className={style}>
          Receipt attached: {attachmentName}. Auto-fill reads photos only.
        </p>
      );
    case "idle":
      if (!attachmentName) return null;
      return (
        <p className={style}>
          Receipt attached: {attachmentName}. Fill in the details below.
        </p>
      );
  }
}

function FromReceiptMarker() {
  return (
    <span className="ml-1.5 align-middle text-xs font-normal text-muted-foreground">
      from receipt
    </span>
  );
}

export function ExpenseForm({
  expense,
  participants,
  tripId,
  defaultPaidBy,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const isEditMode = !!expense;

  const [phase, setPhase] = useState<"start" | "form">(
    isEditMode ? "form" : "start"
  );
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [category, setCategory] = useState<string | null>(
    initialCategory(expense)
  );
  const [description, setDescription] = useState(expense?.description ?? "");
  const [date, setDate] = useState(expense?.date ?? today);
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [paidBy, setPaidBy] = useState(() => {
    if (expense?.paidBy) return expense.paidBy;
    if (defaultPaidBy && participants.includes(defaultPaidBy)) return defaultPaidBy;
    return participants[0] ?? "";
  });
  const [sharedBy, setSharedBy] = useState<string[]>(
    expense?.sharedBy ?? [...participants]
  );
  const [attachment, setAttachment] = useState<FileAttachment | null>(
    expense?.attachment ?? null
  );

  const [amountError, setAmountError] = useState("");
  const [paidByError, setPaidByError] = useState("");
  const [sharedByError, setSharedByError] = useState("");

  // Receipt auto-fill (D14): fields the user changed since the file was picked
  // are never overwritten, and stale results are ignored via requestTokenRef.
  const [autofill, setAutofill] = useState<AutofillState>({ status: "idle" });
  const [receiptFilled, setReceiptFilled] = useState<AutofillField[]>([]);
  const touchedRef = useRef<Set<AutofillField>>(new Set());
  const requestTokenRef = useRef(0);
  const mountedRef = useRef(true);
  const stepRef = useRef(step);
  stepRef.current = step;
  const fieldsRef = useRef<AutofillCurrent>({ description, category, date, amount });
  fieldsRef.current = { description, category, date, amount };
  const autofillEnabledRef = useRef<Promise<boolean> | null>(null);

  // Read the setting once. The same promise is awaited when a file is
  // picked, so it's never read twice; the ref guard keeps re-runs free.
  useEffect(() => {
    mountedRef.current = true;
    if (!isEditMode && tripId && autofillEnabledRef.current === null) {
      autofillEnabledRef.current = fetchAutofillEnabled();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [isEditMode, tripId]);

  const allSelected =
    participants.length > 0 && participants.every((p) => sharedBy.includes(p));
  const isLastStep = step === LAST_STEP_INDEX;

  function markTouched(edit: AutofillEdit) {
    const fields = touchedFieldsForEdit(edit);
    for (const field of fields) touchedRef.current.add(field);
    setReceiptFilled((prev) => prev.filter((field) => !fields.includes(field)));
  }

  function selectPreset(id: string, label: string) {
    markTouched("preset");
    setCategory(id);
    setDescription(label);
  }

  function handleDescriptionChange(value: string) {
    markTouched("description");
    setDescription(value);
    const match = EXPENSE_CATEGORIES.find((c) => c.label === value);
    setCategory(match ? match.id : null);
  }

  function handleDateChange(value: string) {
    markTouched("date");
    setDate(value);
  }

  function handleAmountChange(value: string) {
    markTouched("amount");
    setAmount(value);
    if (amountError) setAmountError("");
  }

  function handleReceiptFileSelected(file: File) {
    if (isEditMode || !tripId) return;
    const enabledPromise = autofillEnabledRef.current;
    if (!enabledPromise) return;
    if (!file.type.startsWith("image/")) {
      setAutofill({ status: "skipped" });
      return;
    }
    touchedRef.current = new Set();
    setReceiptFilled([]);
    requestTokenRef.current += 1;
    const token = requestTokenRef.current;
    const activeTripId = tripId;
    setAutofill({ status: "idle" });
    // Runs alongside the upload; never blocks the wizard.
    void (async () => {
      const enabled = await enabledPromise;
      if (token !== requestTokenRef.current || !mountedRef.current) return;
      if (!enabled) return;
      setAutofill({ status: "running" });
      try {
        const image = await fileToReceiptImage(file);
        if (token !== requestTokenRef.current || !mountedRef.current) return;
        const result = await extractReceipt({
          tripId: activeTripId,
          image,
          categories: expenseCategoryPayload(),
        });
        if (token !== requestTokenRef.current || !mountedRef.current) return;
        const { next, filled } = applyReceiptExtraction(
          fieldsRef.current,
          touchedRef.current,
          result.fields,
        );
        setDescription(next.description);
        setCategory(next.category);
        setDate(next.date);
        setAmount(next.amount);
        setReceiptFilled(filled);
        const hadReadable =
          result.fields.description !== null ||
          result.fields.category !== null ||
          result.fields.date !== null ||
          result.fields.amount !== null;
        const currencyNote =
          result.fields.currency !== null &&
          result.fields.currency !== "USD" &&
          filled.includes("amount")
            ? `The receipt total is in ${result.fields.currency}. The amount was filled as printed; check it.`
            : null;
        setAutofill({ status: "done", filled, hadReadable, currencyNote });
        if (filled.length > 0 && stepRef.current >= 2) {
          toast.success(`Filled from receipt: ${friendlyFieldList(filled)}`);
        }
      } catch (err: unknown) {
        if (token !== requestTokenRef.current || !mountedRef.current) return;
        setAutofill({ status: "failed", message: withoutTrailingPeriod(errorMessage(err)) });
      }
    })();
  }

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

  function validateStep(stepIndex: number): boolean {
    if (stepIndex === 1) {
      const parsedAmount = parseFloat(amount);
      if (!parsedAmount || parsedAmount <= 0) {
        setAmountError("Amount must be greater than $0.00");
        return false;
      }
      setAmountError("");
      return true;
    }
    if (stepIndex === 2) {
      if (!paidBy) {
        setPaidByError("Please select who paid");
        return false;
      }
      setPaidByError("");
      return true;
    }
    if (stepIndex === 3) {
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
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, LAST_STEP_INDEX));
  }

  function handleBack() {
    if (step === 0 && !isEditMode) {
      // A late result must not apply after leaving the form.
      requestTokenRef.current += 1;
      setAutofill({ status: "idle" });
      setPhase("start");
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  }

  function startManual() {
    setPhase("form");
    setStep(0);
  }

  function handleStartAttachment(file: FileAttachment | null) {
    setAttachment(file);
    if (file) {
      setPhase("form");
      setStep(0);
    } else {
      // The attachment is gone, so a late result for it must not apply.
      requestTokenRef.current += 1;
      setAutofill({ status: "idle" });
    }
  }

  async function handleSave() {
    if (submitting) return;
    const parsedAmount = parseFloat(amount);
    let hasError = false;

    if (!parsedAmount || parsedAmount <= 0) {
      setAmountError("Amount must be greater than $0.00");
      setStep(1);
      hasError = true;
    } else {
      setAmountError("");
    }
    if (!paidBy) {
      setPaidByError("Please select who paid");
      if (!hasError) setStep(2);
      hasError = true;
    } else {
      setPaidByError("");
    }
    if (sharedBy.length === 0) {
      setSharedByError("At least one participant must be selected");
      if (!hasError) setStep(3);
      hasError = true;
    } else {
      setSharedByError("");
    }
    if (hasError) return;

    setSubmitting(true);
    try {
      await onSubmit({
        description: description.trim() || "Expense",
        category,
        date,
        amount: parsedAmount,
        paidBy,
        sharedBy,
        attachment,
      });
      if (!isEditMode) {
        setCategory(null);
        setDescription("");
        setDate(today);
        setAmount("");
        setPaidBy(
          defaultPaidBy && participants.includes(defaultPaidBy)
            ? defaultPaidBy
            : participants[0] ?? ""
        );
        setSharedBy([...participants]);
        setAttachment(null);
        setStep(0);
        setPhase("start");
        // A late result must not leak into the next expense.
        requestTokenRef.current += 1;
        setAutofill({ status: "idle" });
        setReceiptFilled([]);
        touchedRef.current = new Set();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "form") return;
    if (isLastStep) {
      handleSave();
    } else {
      handleNext();
    }
  }

  if (phase === "start") {
    return (
      <div className="space-y-5">
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Receipt className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold">Add an expense</h3>
          <p className="text-sm text-muted-foreground">
            Start from a receipt, or enter details manually.
          </p>
        </div>
        {tripId ? (
          <div className="space-y-2 rounded-lg border border-input p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Camera className="h-4 w-4 text-muted-foreground" />
              Scan or upload receipt
            </div>
            <p className="text-xs text-muted-foreground">
              Optional. We will keep the file with this expense.
            </p>
            <FileUpload
              storagePath={`trips/${tripId}/expenses`}
              value={attachment}
              onChange={handleStartAttachment}
              onFileSelected={handleReceiptFileSelected}
            />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-input p-3 text-center text-sm text-muted-foreground">
            Receipt upload needs a trip context.
          </p>
        )}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>
        <Button type="button" variant="outline" className="w-full gap-2" onClick={startManual}>
          <Keyboard className="h-4 w-4" />
          Enter manually
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 flex-col items-center gap-1">
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
                "text-[10px] font-medium text-center leading-tight " +
                (i === step ? "text-foreground" : "text-muted-foreground")
              }
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      {(step === 0 || step === 1) && (
        <AutofillBanner autofill={autofill} attachmentName={attachment?.name ?? null} />
      )}
      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              What was it for?
              {receiptFilled.includes("category") && <FromReceiptMarker />}
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {EXPENSE_CATEGORIES.map((c) => {
                const Icon = c.icon;
                const selected = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectPreset(c.id, c.label)}
                    className={
                      "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-colors " +
                      (selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input bg-background hover:bg-muted/60")
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-[11px] font-medium leading-tight">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="expense-description" className="text-sm font-medium leading-none">
              Description
              {receiptFilled.includes("description") && <FromReceiptMarker />}
            </label>
            <Input
              id="expense-description"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Or type your own description"
            />
            <p className="text-xs text-muted-foreground">Tap a category above or type a custom description.</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="expense-date" className="text-sm font-medium leading-none">
              Date
              {receiptFilled.includes("date") && <FromReceiptMarker />}
            </label>
            <Input id="expense-date" type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} />
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-2">
          <label htmlFor="expense-amount" className="text-sm font-medium leading-none">
            Amount
            {receiptFilled.includes("amount") && <FromReceiptMarker />}
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              id="expense-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className="pl-6"
              aria-invalid={!!amountError}
              autoFocus
            />
          </div>
          {amountError && <p className="text-sm text-destructive">{amountError}</p>}
        </div>
      )}
      {step === 2 && (
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Paid by</label>
          <Select
            value={paidBy}
            onValueChange={(val) => {
              setPaidBy(val as string);
              if (paidByError) setPaidByError("");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select who paid" />
            </SelectTrigger>
            <SelectContent>
              {participants.map((participant) => (
                <SelectItem key={participant} value={participant}>{participant}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {paidByError && <p className="text-sm text-destructive">{paidByError}</p>}
        </div>
      )}
      {step === 3 && (
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Shared by</label>
          <div className="space-y-2 rounded-lg border border-input p-3">
            <div className="flex items-center gap-2">
              <Checkbox id="select-all" checked={allSelected} onCheckedChange={handleSelectAll} />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">Select All</label>
            </div>
            <div className="h-px bg-border" />
            {participants.map((participant) => (
              <div key={participant} className="flex items-center gap-2">
                <Checkbox
                  id={`shared-${participant}`}
                  checked={sharedBy.includes(participant)}
                  onCheckedChange={() => handleToggleParticipant(participant)}
                />
                <label htmlFor={`shared-${participant}`} className="text-sm cursor-pointer">{participant}</label>
              </div>
            ))}
          </div>
          {sharedByError && <p className="text-sm text-destructive">{sharedByError}</p>}
        </div>
      )}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-input bg-muted/30 p-3 text-sm space-y-1.5">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Description</span>
              <span className="font-medium text-right truncate max-w-[60%]">{description.trim() || "—"}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{date}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">${parseFloat(amount || "0").toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Paid by</span>
              <span className="font-medium">{paidBy || "—"}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Shared by</span>
              <span className="font-medium text-right max-w-[60%]">
                {sharedBy.length === participants.length ? "Everyone" : sharedBy.join(", ") || "—"}
              </span>
            </div>
          </div>
          {tripId ? (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Receipt / Document (optional)</label>
              <FileUpload storagePath={`trips/${tripId}/expenses`} value={attachment} onChange={setAttachment} />
            </div>
          ) : null}
        </div>
      )}
      <div className="flex justify-between gap-2 pt-2">
        {!(isEditMode && step === 0) ? (
          <Button type="button" variant="outline" onClick={handleBack} className="gap-1" disabled={submitting}>
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </Button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          {!isLastStep ? (
            <Button type="button" onClick={handleNext} className="gap-1" disabled={submitting}>
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSave} disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting
                ? isEditMode
                  ? "Saving..."
                  : "Adding..."
                : isEditMode
                  ? "Save Changes"
                  : "Add Expense"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
