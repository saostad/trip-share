import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExpenseList } from "@/components/expense/ExpenseList";
import { formatCurrency } from "@/lib/formatters";
import type { Expense } from "@/types";
import { useTripPage } from "../useTripPage";

export interface ExpensesTabViewProps {
  expenses: Expense[];
  participants: string[];
  isArchived: boolean;
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
}

export function ExpensesTabView({
  expenses,
  participants,
  isArchived,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}: ExpensesTabViewProps) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return (
    // Extra bottom room so the last row scrolls clear of the Fab and bottom bar.
    <div className="pb-16 md:pb-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Expenses</h2>
          <p className="text-sm text-muted-foreground">
            {expenses.length} {expenses.length === 1 ? "expense" : "expenses"} ·{" "}
            {formatCurrency(total)} total
          </p>
        </div>
        {!isArchived && (
          <Button onClick={onAddExpense} className="hidden gap-1.5 md:inline-flex">
            <Plus className="size-4" data-icon="inline-start" />
            Add expense
          </Button>
        )}
      </div>
      <Card>
        <CardContent>
          <ExpenseList
            expenses={expenses}
            participants={participants}
            readOnly={isArchived}
            onEdit={isArchived ? undefined : onEditExpense}
            onDelete={isArchived ? undefined : onDeleteExpense}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function ExpensesTab() {
  const {
    expenses,
    trip,
    isArchived,
    openAddExpense,
    openEditExpense,
    openDeleteExpense,
  } = useTripPage();
  return (
    <ExpensesTabView
      expenses={expenses}
      participants={trip.participants}
      isArchived={isArchived}
      onAddExpense={openAddExpense}
      onEditExpense={openEditExpense}
      onDeleteExpense={openDeleteExpense}
    />
  );
}
