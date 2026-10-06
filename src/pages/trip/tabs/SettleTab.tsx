import { Card, CardContent } from "@/components/ui/card";

export function SettleTabView() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        Settle up
      </CardContent>
    </Card>
  );
}

export function SettleTab() {
  return <SettleTabView />;
}
