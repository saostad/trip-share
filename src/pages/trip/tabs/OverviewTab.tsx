import { Card, CardContent } from "@/components/ui/card";

export function OverviewTabView() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        Overview
      </CardContent>
    </Card>
  );
}

export function OverviewTab() {
  return <OverviewTabView />;
}
