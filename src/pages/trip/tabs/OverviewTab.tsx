import { useEffect, useState } from "react";
import { Link } from "react-router";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  Banknote,
  Check,
  HandCoins,
  Plus,
  Receipt,
  UserPlus,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp } from "@/components/CountUp";
import { ViewModeToggle } from "@/components/balance/ViewModeToggle";
import { hasUsableSettlementGroups } from "@/lib/settlementGroups";
import type { SettlementViewMode } from "@/types";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency } from "@/lib/formatters";
import { resolveExpenseCategory } from "@/lib/expenseCategories";
import {
  checklistState,
  myPosition,
  recentActivity,
  type ChecklistState,
  type MyPosition,
  type RecentActivityItem,
} from "@/lib/tripOverview";
import { useTripPage } from "../useTripPage";
import { cn } from "@/lib/utils";

export interface OverviewTabViewProps {
  position: MyPosition;
  /** Group-mode position; shown when the hero toggle is on "By group". */
  groupPosition?: MyPosition;
  /** Whether the trip has usable settlement groups (enables the toggle). */
  hasGroups?: boolean;
  isOwner: boolean;
  isArchived: boolean;
  checklist: ChecklistState;
  checklistDismissed: boolean;
  activity: RecentActivityItem[];
  onAddExpense: () => void;
  onEditTrip: () => void;
  onDismissChecklist: () => void;
}

function Hero({
  position,
  groupPosition,
  hasGroups,
  isOwner,
  isArchived,
  onAddExpense,
  onEditTrip,
}: {
  position: MyPosition;
  groupPosition?: MyPosition;
  hasGroups?: boolean;
  isOwner: boolean;
  isArchived: boolean;
  onAddExpense: () => void;
  onEditTrip: () => void;
}) {
  // Each box owns its toggle, like the Settle cards; the choice isn't persisted.
  const [viewMode, setViewMode] = useState<SettlementViewMode>(
    hasGroups ? "group" : "person",
  );
  const showToggle =
    hasGroups === true &&
    (position.kind === "owed" ||
      position.kind === "owes" ||
      position.kind === "square");
  const groupView =
    showToggle && viewMode === "group" && groupPosition !== undefined;
  const displayed = groupView && groupPosition ? groupPosition : position;

  if (displayed.kind === "empty") {
    return (
      <Card>
        <CardContent className="space-y-1">
          <p className="text-2xl font-bold">No expenses yet</p>
          <p className="text-sm text-muted-foreground">
            Add the first expense and TripShare keeps a running balance for
            everyone.
          </p>
          {!isArchived && (
            <div className="pt-2">
              <Button onClick={onAddExpense} className="gap-1.5">
                <Plus className="size-4" data-icon="inline-start" />
                Add expense
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (displayed.kind === "unlinked") {
    return (
      <Card>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground">Total spent</p>
          <p className="text-3xl font-bold break-all tabular-nums">
            <CountUp value={displayed.totalSpent} format={formatCurrency} />
          </p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(displayed.perPersonAverage)} per person
          </p>
          {isOwner && !isArchived ? (
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={onEditTrip}>
                Choose which name is you
              </Button>
            </div>
          ) : (
            !isOwner && (
              <p className="pt-2 text-sm">
                Ask the trip creator to link your account to a name to see your
                own balance.
              </p>
            )
          )}
        </CardContent>
      </Card>
    );
  }

  if (displayed.kind === "square") {
    const group = displayed.group;
    return (
      <Card>
        <CardContent className="space-y-2">
          {showToggle && (
            <div className="flex justify-start">
              <ViewModeToggle
                value={viewMode}
                onChange={setViewMode}
                ariaLabel="Overview view"
              />
            </div>
          )}
          <p className="text-2xl font-bold break-words">
            {group ? `${group.name} is all square` : "You're all square"}
          </p>
          {group ? (
            <p className="text-xs break-words text-muted-foreground">
              {group.representative} pays or receives for {group.name}.{" "}
              <Link to="settle" className="underline underline-offset-2 hover:text-foreground">
                See Settle up
              </Link>
              .
            </p>
          ) : (
            displayed.inGroup && (
              <p className="text-xs text-muted-foreground">
                Your group settles as one;{" "}
                <Link to="settle" className="underline underline-offset-2 hover:text-foreground">
                  see Settle up
                </Link>
                .
              </p>
            )
          )}
        </CardContent>
      </Card>
    );
  }

  const group = displayed.group;
  const label =
    displayed.kind === "owed"
      ? (group ? `${group.name} gets back` : "You get back")
      : (group ? `${group.name} owes` : "You owe");
  const amountClass = displayed.kind === "owed" ? "text-positive" : "text-negative";

  return (
    <Card>
      <CardContent className="space-y-2">
        {showToggle && (
          <div className="flex justify-start">
            <ViewModeToggle
              value={viewMode}
              onChange={setViewMode}
              ariaLabel="Overview view"
            />
          </div>
        )}
        <p className="text-sm break-words text-muted-foreground">{label}</p>
        <p className={cn("text-3xl font-bold break-all tabular-nums", amountClass)}>
          <CountUp value={displayed.amount} format={formatCurrency} />
        </p>
        {displayed.counterparties.length > 0 && (
          <ul className="space-y-1">
            {displayed.counterparties.map((c) => {
              const other = c.label ?? c.name;
              return (
                <li
                  key={`${c.direction}-${c.name}`}
                  className="text-sm break-words tabular-nums"
                >
                  {c.direction === "owesMe"
                    ? (group ? `${other} owes your group ` : `${other} owes you `)
                    : (group ? `Your group owes ${other} ` : `You owe ${other} `)}
                  <span
                    className={cn(
                      "font-medium",
                      c.direction === "owesMe" ? "text-positive" : "text-negative",
                    )}
                  >
                    {formatCurrency(c.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {group ? (
          <p className="text-xs break-words text-muted-foreground">
            {group.representative} pays or receives for {group.name}.{" "}
            <Link to="settle" className="underline underline-offset-2 hover:text-foreground">
              See Settle up
            </Link>
            .
          </p>
        ) : (
          displayed.inGroup && (
            <p className="text-xs text-muted-foreground">
              Your group settles as one;{" "}
              <Link to="settle" className="underline underline-offset-2 hover:text-foreground">
                see Settle up
              </Link>
              .
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}

function QuickActions({
  isOwner,
  isArchived,
  onAddExpense,
}: {
  isOwner: boolean;
  isArchived: boolean;
  onAddExpense: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {!isArchived && (
        <Button onClick={onAddExpense} className="gap-1.5">
          <Plus className="size-4" data-icon="inline-start" />
          Add expense
        </Button>
      )}
      <Link to="settle" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
        <HandCoins />
        Settle up
      </Link>
      {isOwner && (
        <Link to="people#invite" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
          <UserPlus />
          Invite people
        </Link>
      )}
    </div>
  );
}

const CHECKLIST_LABELS: Record<string, string> = {
  people: "Add people",
  expense: "Add your first expense",
  invite: "Invite friends",
  settle: "Settle up",
};

function Checklist({
  checklist,
  isOwner,
  onAddExpense,
  onEditTrip,
  onDismiss,
}: {
  checklist: ChecklistState;
  isOwner: boolean;
  onAddExpense: () => void;
  onEditTrip: () => void;
  onDismiss: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Getting started</CardTitle>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {checklist.steps.map((step) => (
            <li key={step.id} className="flex items-center gap-3 text-sm">
              {step.done ? (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-positive/15 text-positive">
                  <Check className="size-3.5" aria-hidden />
                </span>
              ) : (
                <span className="size-6 shrink-0 rounded-full border-2 border-border" aria-hidden />
              )}
              <span className={step.done ? "text-muted-foreground" : "font-medium"}>
                {CHECKLIST_LABELS[step.id] ?? step.id}
              </span>
              {!step.done && step.id === "people" && isOwner && (
                <Button variant="outline" size="sm" className="ml-auto" onClick={onEditTrip}>
                  Edit trip
                </Button>
              )}
              {!step.done && step.id === "people" && !isOwner && (
                <span className="ml-auto text-xs text-muted-foreground">
                  The trip creator adds people
                </span>
              )}
              {!step.done && step.id === "expense" && (
                <Button variant="outline" size="sm" className="ml-auto" onClick={onAddExpense}>
                  Add expense
                </Button>
              )}
              {!step.done && step.id === "invite" && (
                <Link
                  to="people#invite"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto")}
                >
                  Invite
                </Link>
              )}
              {!step.done && step.id === "settle" && (
                <Link
                  to="settle"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto")}
                >
                  Settle up
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ActivityRow({ item }: { item: RecentActivityItem }) {
  if (item.kind === "expense") {
    const { expense } = item;
    const category = resolveExpenseCategory(expense.category, expense.description);
    const Icon = category?.icon ?? Receipt;
    return (
      <li className="flex items-center gap-3 py-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{expense.description}</span>
          <span className="block text-xs text-muted-foreground">
            {expense.paidBy} paid ·{" "}
            {formatDistanceToNow(parseISO(expense.date), { addSuffix: true })}
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {formatCurrency(expense.amount)}
        </span>
      </li>
    );
  }

  const { payment } = item;
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Banknote className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">Payment</span>
        <span className="block truncate text-xs text-muted-foreground">
          {payment.from} paid {payment.to} ·{" "}
          {formatDistanceToNow(parseISO(payment.date), { addSuffix: true })}
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {formatCurrency(payment.amount)}
      </span>
    </li>
  );
}

export function RecentActivity({ activity }: { activity: RecentActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <EmptyState
            icons={[
              {
                Icon: Receipt,
                circleClassName: "bg-primary/10 text-primary",
              },
              {
                Icon: Banknote,
                circleClassName: "bg-muted text-muted-foreground",
              },
            ]}
            title="No activity yet"
            description="Expenses and payments will show up here."
          />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {activity.map((item) => (
                <ActivityRow
                  key={`${item.kind}-${item.kind === "expense" ? item.expense.id : item.payment.id}`}
                  item={item}
                />
              ))}
            </ul>
            <Link
              to="expenses"
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              See all expenses
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function OverviewTabView({
  position,
  groupPosition,
  hasGroups,
  isOwner,
  isArchived,
  checklist,
  checklistDismissed,
  activity,
  onAddExpense,
  onEditTrip,
  onDismissChecklist,
}: OverviewTabViewProps) {
  const showChecklist =
    !isArchived && !checklistDismissed && !checklist.complete;
  return (
    <div className="space-y-4">
      <Hero
        position={position}
        groupPosition={groupPosition}
        hasGroups={hasGroups}
        isOwner={isOwner}
        isArchived={isArchived}
        onAddExpense={onAddExpense}
        onEditTrip={onEditTrip}
      />
      {position.kind !== "empty" && (
        <QuickActions
          isOwner={isOwner}
          isArchived={isArchived}
          onAddExpense={onAddExpense}
        />
      )}
      {showChecklist && (
        <Checklist
          checklist={checklist}
          isOwner={isOwner}
          onAddExpense={onAddExpense}
          onEditTrip={onEditTrip}
          onDismiss={onDismissChecklist}
        />
      )}
      <RecentActivity activity={activity} />
    </div>
  );
}

function dismissedKey(tripId: string): string {
  return `tripshare.checklist.dismissed.${tripId}`;
}

function readDismissed(tripId: string): boolean {
  try {
    return localStorage.getItem(dismissedKey(tripId)) === "1";
  } catch {
    return false;
  }
}

export function OverviewTab() {
  const {
    tripId,
    trip,
    expenses,
    payments,
    isOwner,
    isArchived,
    myName,
    openAddExpense,
    openEditTrip,
  } = useTripPage();

  const position = myPosition(trip, expenses, payments, myName);
  const hasGroups = hasUsableSettlementGroups(trip.settlementGroups);
  const groupPosition = myPosition(trip, expenses, payments, myName, "group");
  const checklist = checklistState(trip, expenses, payments, isOwner);
  const activity = recentActivity(expenses, payments);
  const [dismissed, setDismissed] = useState(() => readDismissed(tripId));

  useEffect(() => {
    setDismissed(readDismissed(tripId));
  }, [tripId]);

  function handleDismiss() {
    try {
      localStorage.setItem(dismissedKey(tripId), "1");
    } catch {
      // Private mode: dismissal lasts for this visit only.
    }
    setDismissed(true);
  }

  return (
    <OverviewTabView
      position={position}
      groupPosition={groupPosition}
      hasGroups={hasGroups}
      isOwner={isOwner}
      isArchived={isArchived}
      checklist={checklist}
      checklistDismissed={dismissed}
      activity={activity}
      onAddExpense={openAddExpense}
      onEditTrip={openEditTrip}
      onDismissChecklist={handleDismiss}
    />
  );
}
