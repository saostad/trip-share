import { Card, CardContent } from "@/components/ui/card";

export function ExpensesTabView() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        Expenses
      </CardContent>
    </Card>
  );
}

export function ExpensesTab() {
  return <ExpensesTabView />;
}
