import { useState, useMemo } from "react";
import { ArrowRight, Trash2, Pencil, Banknote, Filter, X, Paperclip } from "lucide-react";
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

interface PaymentListProps {
  payments: Payment[];
  participants?: string[];
  onEdit: (payment: Payment) => void;
  onDelete: (payment: Payment) => void;
}

export function PaymentList({ payments, participants = [], onEdit, onDelete }: PaymentListProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filterFrom, setFilterFrom] = useState("all");
  const [filterTo, setFilterTo] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const hasActiveFilters = filterFrom !== "all" || filterTo !== "all" || filterDateFrom || filterDateTo;

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      if (filterFrom !== "all" && payment.from !== filterFrom) return false;
      if (filterTo !== "all" && payment.to !== filterTo) return false;
      if (filterDateFrom && payment.date < filterDateFrom) return false;
      if (filterDateTo && payment.date > filterDateTo) return false;
      return true;
    });
  }, [payments, filterFrom, filterTo, filterDateFrom, filterDateTo]);

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
        <p className="text-sm text-muted-foreground">
          No payments recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter toggle */}
      <div className="flex items-center justify-between">
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
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Filter controls */}
      {showFilters && (
        <div className="flex flex-col gap-2 rounded-lg border border-input bg-muted/30 p-3">
          {/* From filter */}
          {participants.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Select value={filterFrom} onValueChange={(val) => setFilterFrom(val ?? "all")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Anyone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Anyone</SelectItem>
                  {participants.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* To filter */}
          {participants.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Select value={filterTo} onValueChange={(val) => setFilterTo(val ?? "all")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Anyone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Anyone</SelectItem>
                  {participants.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">From date</label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To date</label>
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

      {/* Results info */}
      {hasActiveFilters && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredPayments.length} of {payments.length} payments
        </p>
      )}

      {/* Payment items */}
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
