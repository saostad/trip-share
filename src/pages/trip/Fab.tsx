import { useMatch } from "react-router";
import { Plus } from "lucide-react";
import { useTripPage } from "./useTripPage";

export function Fab({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground shadow-lg md:hidden"
    >
      <Plus className="size-4" aria-hidden />
      Add expense
    </button>
  );
}

export function TripFab() {
  const { isArchived, openAddExpense } = useTripPage();
  const isOverview = useMatch("/trip/:tripId") !== null;
  const isExpenses = useMatch("/trip/:tripId/expenses") !== null;
  if (isArchived || (!isOverview && !isExpenses)) return null;
  return <Fab onAdd={openAddExpense} />;
}
