import { useState, useMemo } from "react";
import {
  ArrowRight,
  Trash2,
  Pencil,
  Banknote,
  Filter,
  X,
  Paperclip,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";
import type { Payment } from "@/types";

type SortKey =
  | "date-desc"
  | "date-asc"
  | "amount-desc"
  | "amount-asc"
  | "from"
  | "to";

const SORT_LABELS: Record<SortKey, string> = {
  "date-desc": "Date (newest)",
  "date-asc": "Date (oldest)",
  "amount-desc": "Amount (high → low)",
  "amount-asc": "Amount (low → high)",
  from: "From A–Z",
  to: "To A–Z",
};

interface PaymentListProps {
  payments: Payment[];
  participants?: string[];
  onEdit?: (payment: Payment) => void;
  onDelete?: (payment: Payment) => void;
  readOnly?: boolean;
}

export function PaymentList({
  payments,
  participants = [],
  onEdit,
  onDelete,
  readOnly = false,
}: PaymentListProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filterFrom, setFilterFrom] = useState("all");
  const [filterTo, setFilterTo] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");

  const hasActiveFilters =
    filterFrom !== "all" || filterTo !== "all" || !!filterDateFrom || !!filterDateTo;

  const filteredPayments = useMemo(() => {
    const list = payments.filter((payment) => {
      if (filterFrom !== "all" && payment.from !== filterFrom) return false;
      if (filterTo !== "all" && payment.to !== filterTo) return false;
      if (filterDateFrom && payment.date < filterDateFrom) return false;
      if (filterDateTo && payment.date > filterDateTo) return false;
      return true;
    });

    list.sort((a, b) => {
      switch (sortKey) {
        case "date-desc":
          return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
        case "date-asc":
          return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
        case "amount-desc":
          return b.amount - a.amount || b.date.localeCompare(a.date);
        case "amount-asc":
          return a.amount - b.amount || a.date.localeCompare(b.date);
        case "from":
          return (
            a.from.localeCompare(b.from, undefined, { sensitivity: "base" }) ||
            b.date.localeCompare(a.date)
          );
        case "to":
          return (
            a.to.localeCompare(b.to, undefined, { sensitivity: "base" }) ||
            b.date.localeCompare(a.date)
          );
        default:
          return 0;
      }
    });

    return list;
  }, [payments, filterFrom, filterTo, filterDateFrom, filterDateTo, sortKey]);

  function clearFilters() {
    setFilterFrom("all");
    setFilterTo("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <Banknote className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showFilters ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              !
            </span>
          )}
        </Button>

        <Select
          value={sortKey}
          onValueChange={(val) => {
            const v =
              typeof val === "string"
                ? val
                : (val as { value?: string } | null)?.value;
            if (v && v in SORT_LABELS) setSortKey(v as SortKey);
          }}
        >
          <SelectTrigger className="h-8 w-auto min-w-[9.5rem] gap-1.5 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{SORT_LABELS[sortKey]}</span>
            <SelectValue className="sr-only" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SORT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="ml-auto gap-1 text-xs"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-col gap-2 rounded-lg border border-input bg-muted/30 p-3">
          {participants.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Select
                value={filterFrom}
                onValueChange={(val) => setFilterFrom(val ?? "all")}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Anyone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Anyone</SelectItem>
                  {participants.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {participants.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Select
                value={filterTo}
                onValueChange={(val) => setFilterTo(val ?? "all")}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Anyone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Anyone</SelectItem>
                  {participants.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                From date
              </label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                To date
              </label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredPayments.length} of {payments.length} payments
        </p>
      )}

      {filteredPayments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No payments match the current filters.
          </p>
        </div>
      ) : (
        <ul className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
          {filteredPayments.map((payment) => (
            <li
              key={payment.id}
              className="flex flex-col gap-1 rounded-lg border p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 truncate font-medium">{payment.from}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate font-medium">{payment.to}</span>
                <span className="ml-auto shrink-0 font-semibold text-emerald-600">
                  {formatCurrency(payment.amount)}
                </span>
                {!readOnly && onEdit && onDelete && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(payment)}
                      aria-label="Edit payment"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDelete(payment)}
                      aria-label="Delete payment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{payment.date}</span>
                {payment.note && (
                  <>
                    <span>&middot;</span>
                    <span className="min-w-0 truncate">{payment.note}</span>
                  </>
                )}
                {payment.attachment && (
                  <>
                    <span>&middot;</span>
                    <a
                      href={payment.attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span className="truncate">{payment.attachment.name}</span>
                    </a>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
