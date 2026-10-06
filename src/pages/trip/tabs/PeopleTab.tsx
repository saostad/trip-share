import { Card, CardContent } from "@/components/ui/card";

export function PeopleTabView() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        People
      </CardContent>
    </Card>
  );
}

export function PeopleTab() {
  return <PeopleTabView />;
}
