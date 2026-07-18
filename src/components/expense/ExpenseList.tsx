import { useState, useMemo } from "react";
import { Receipt, Filter, X } from "lucide-react";
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

interface ExpenseListProps {
  expenses: Expense[];
  participants?: string[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseList({ expenses, participants = [], onEdit, onDelete }: ExpenseListProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filterPaidBy, setFilterPaidBy] = useState<string>("all");
  const [filterSharedBy, setFilterSharedBy] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const hasActiveFilters = filterPaidBy !== "all" || filterSharedBy !== "all" || filterDateFrom || filterDateTo;

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // Filter by paid by
      if (filterPaidBy !== "all" && expense.paidBy !== filterPaidBy) {
        return false;
      }

      // Filter by shared by
      if (filterSharedBy !== "all" && !expense.sharedBy.includes(filterSharedBy)) {
        return false;
      }

      // Filter by date range
      if (filterDateFrom && expense.date < filterDateFrom) {
        return false;
      }
      if (filterDateTo && expense.date > filterDateTo) {
        return false;
      }

      return true;
    });
  }, [expenses, filterPaidBy, filterSharedBy, filterDateFrom, filterDateTo]);

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
          {/* Paid by filter */}
          {participants.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Paid by</label>
              <Select value={filterPaidBy} onValueChange={(val) => setFilterPaidBy(val ?? "all")}>
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

          {/* Shared by filter */}
          {participants.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Shared by</label>
              <Select value={filterSharedBy} onValueChange={(val) => setFilterSharedBy(val ?? "all")}>
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
              <label className="text-xs font-medium text-muted-foreground">From</label>
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

      {/* Results info */}
      {hasActiveFilters && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredExpenses.length} of {expenses.length} expenses
        </p>
      )}

      {/* Expense items */}
      {filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No expenses match the current filters.
          </p>
        </div>
      ) : (
        <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
          {filteredExpenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
