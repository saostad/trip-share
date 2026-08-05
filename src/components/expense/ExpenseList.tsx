import { useState, useMemo } from "react";
import { Receipt, Filter, X, ArrowUpDown } from "lucide-react";
import { ExpenseItem } from "@/components/expense/ExpenseItem";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Expense } from "@/types";

type SortKey =
  | "date-desc"
  | "date-asc"
  | "amount-desc"
  | "amount-asc"
  | "description"
  | "paidBy";

const SORT_LABELS: Record<SortKey, string> = {
  "date-desc": "Date (newest)",
  "date-asc": "Date (oldest)",
  "amount-desc": "Amount (high → low)",
  "amount-asc": "Amount (low → high)",
  description: "Description A–Z",
  paidBy: "Paid by A–Z",
};

interface ExpenseListProps {
  expenses: Expense[];
  participants?: string[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseList({
  expenses,
  participants = [],
  onEdit,
  onDelete,
}: ExpenseListProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filterPaidBy, setFilterPaidBy] = useState<string>("all");
  const [filterSharedBy, setFilterSharedBy] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");

  const hasActiveFilters =
    filterPaidBy !== "all" ||
    filterSharedBy !== "all" ||
    !!filterDateFrom ||
    !!filterDateTo;

  const filteredExpenses = useMemo(() => {
    const list = expenses.filter((expense) => {
      if (filterPaidBy !== "all" && expense.paidBy !== filterPaidBy) return false;
      if (filterSharedBy !== "all" && !expense.sharedBy.includes(filterSharedBy))
        return false;
      if (filterDateFrom && expense.date < filterDateFrom) return false;
      if (filterDateTo && expense.date > filterDateTo) return false;
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
        case "description":
          return (
            a.description.localeCompare(b.description, undefined, {
              sensitivity: "base",
            }) || b.date.localeCompare(a.date)
          );
        case "paidBy":
          return (
            a.paidBy.localeCompare(b.paidBy, undefined, {
              sensitivity: "base",
            }) || b.date.localeCompare(a.date)
          );
        default:
          return 0;
      }
    });

    return list;
  }, [
    expenses,
    filterPaidBy,
    filterSharedBy,
    filterDateFrom,
    filterDateTo,
    sortKey,
  ]);

  function clearFilters() {
    setFilterPaidBy("all");
    setFilterSharedBy("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Receipt className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No expenses yet. Add your first expense to get started.
        </p>
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
              <label className="text-xs font-medium text-muted-foreground">
                Paid by
              </label>
              <Select
                value={filterPaidBy}
                onValueChange={(val) => setFilterPaidBy(val ?? "all")}
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
              <label className="text-xs font-medium text-muted-foreground">
                Shared by
              </label>
              <Select
                value={filterSharedBy}
                onValueChange={(val) => setFilterSharedBy(val ?? "all")}
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
                From
              </label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To</label>
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
          Showing {filteredExpenses.length} of {expenses.length} expenses
        </p>
      )}

      {filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No expenses match the current filters.
          </p>
        </div>
      ) : (
        <ul className="max-h-[min(24rem,60vh)] space-y-2 overflow-y-auto">
          {filteredExpenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
