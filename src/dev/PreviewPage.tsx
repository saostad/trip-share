import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeaderView } from "@/components/layout/Header";
import { DashboardView, TripCardSkeleton } from "@/pages/DashboardView";
import { TripPageSkeleton } from "@/pages/trip/TripPage";
import {
  HowItWorksContent,
  HowItWorksSignedOutBar,
} from "@/pages/HowItWorksPage";
import { LoginCard } from "@/pages/LoginPage";
import { WelcomeTour } from "@/components/tour/WelcomeTour";
import { CreateTripWizard } from "@/components/trip/CreateTripWizard";
import {
  BalancesExplainer,
  MarkPaidExplainer,
  SuggestedPaymentsExplainer,
} from "@/components/balance/explainerTips";
import {
  GroupsExplainer,
  MethodExplainer,
} from "@/components/trip/settlementExplainers";
import { ExpenseList } from "@/components/expense/ExpenseList";
import { CountUp } from "@/components/CountUp";
import { SettleCelebration } from "@/components/balance/SettleCelebration";
import { clearCelebratedSignature } from "@/components/balance/celebrationStorage";
import { PaymentList } from "@/components/balance/PaymentList";
import { SettlementList } from "@/components/balance/SettlementList";
import { SettlementHelpDialog } from "@/components/balance/SettlementHelpDialog";
import { TripShellView } from "@/pages/trip/TripShellView";
import { TripTabs, type TripTabId } from "@/pages/trip/TripTabs";
import { Fab } from "@/pages/trip/Fab";
import {
  OverviewTabView,
  RecentActivity,
} from "@/pages/trip/tabs/OverviewTab";
import { ExpensesTabView } from "@/pages/trip/tabs/ExpensesTab";
import { SettleTabView } from "@/pages/trip/tabs/SettleTab";
import { PeopleTabView } from "@/pages/trip/tabs/PeopleTab";
import { formatCurrency } from "@/lib/formatters";
import {
  checklistState,
  myPosition,
  recentActivity,
} from "@/lib/tripOverview";
import {
  previewExpenses,
  previewPayments,
  previewTimestamp,
  previewTrip,
} from "./fixtures";
import type { Expense, Payment, Trip } from "@/types";

type Section =
  | "tokens"
  | "badges"
  | "buttons"
  | "cards"
  | "header"
  | "trip-overview"
  | "trip-expenses"
  | "trip-settle"
  | "trip-people"
  | "dashboard"
  | "how-it-works"
  | "login"
  | "tour"
  | "wizard"
  | "infotips"
  | "empty-states"
  | "settled"
  | "skeletons"
  | "motion";

const SECTIONS: Section[] = [
  "tokens",
  "badges",
  "buttons",
  "cards",
  "header",
  "trip-overview",
  "trip-expenses",
  "trip-settle",
  "trip-people",
  "dashboard",
  "how-it-works",
  "login",
  "tour",
  "wizard",
  "infotips",
  "empty-states",
  "settled",
  "skeletons",
  "motion",
];

const SECTION_LABELS: Record<Section, string> = {
  tokens: "Tokens",
  badges: "Badges",
  buttons: "Buttons",
  cards: "Cards",
  header: "Header",
  "trip-overview": "Trip · Overview",
  "trip-expenses": "Trip · Expenses",
  "trip-settle": "Trip · Settle",
  "trip-people": "Trip · People",
  dashboard: "Dashboard",
  "how-it-works": "How it works",
  login: "Login",
  tour: "Tour",
  wizard: "Wizard",
  infotips: "InfoTips",
  "empty-states": "Empty states",
  settled: "Settled",
  skeletons: "Skeletons",
  motion: "Motion",
};

function sectionFromParam(value: string | null): Section {
  if (value !== null && (SECTIONS as string[]).includes(value)) {
    return value as Section;
  }
  return "tokens";
}

type OverviewState = "owed" | "owes" | "square" | "unlinked" | "new" | "archived";

const OVERVIEW_STATES: OverviewState[] = ["owed", "owes", "square", "unlinked", "new", "archived"];

function overviewStateFromParam(value: string | null): OverviewState {
  if (value !== null && (OVERVIEW_STATES as string[]).includes(value)) {
    return value as OverviewState;
  }
  return "owed";
}

function stepFromParam(value: string | null, max: number): number {
  const step = Number.parseInt(value ?? "", 10);
  if (Number.isInteger(step) && step >= 1 && step <= max) return step;
  return 1;
}

function TokenSwatch({
  name,
  className,
  light,
  dark,
}: {
  name: string;
  className: string;
  light: string;
  dark: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className={`h-12 ${className}`} aria-hidden />
      <div className="space-y-0.5 bg-card px-2 py-1.5">
        <div className="truncate text-xs font-medium">{name}</div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">L {light}</div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">D {dark}</div>
      </div>
    </div>
  );
}

function TokensSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Swatches</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <TokenSwatch name="background" className="bg-background" light="oklch(0.985 0.004 95)" dark="oklch(0.17 0.015 250)" />
          <TokenSwatch name="foreground" className="bg-foreground" light="oklch(0.22 0.02 250)" dark="oklch(0.93 0.01 250)" />
          <TokenSwatch name="card" className="bg-card" light="oklch(1 0 0)" dark="oklch(0.21 0.015 250)" />
          <TokenSwatch name="primary" className="bg-primary" light="oklch(0.5 0.11 195)" dark="oklch(0.74 0.11 190)" />
          <TokenSwatch name="primary-foreground" className="bg-primary-foreground" light="oklch(1 0 0)" dark="oklch(0.22 0.02 250)" />
          <TokenSwatch name="secondary" className="bg-secondary" light="oklch(0.94 0.005 95)" dark="oklch(0.27 0.015 250)" />
          <TokenSwatch name="muted" className="bg-muted" light="oklch(0.94 0.005 95)" dark="oklch(0.27 0.015 250)" />
          <TokenSwatch name="muted-foreground" className="bg-muted-foreground" light="oklch(0.5 0.02 250)" dark="oklch(0.7 0.015 250)" />
          <TokenSwatch name="accent" className="bg-accent" light="oklch(0.94 0.005 95)" dark="oklch(0.27 0.015 250)" />
          <TokenSwatch name="destructive" className="bg-destructive" light="oklch(0.577 0.245 27.325)" dark="oklch(0.704 0.191 22.216)" />
          <TokenSwatch name="positive" className="bg-positive" light="oklch(0.52 0.13 155)" dark="oklch(0.76 0.14 155)" />
          <TokenSwatch name="negative" className="bg-negative" light="oklch(0.55 0.15 30)" dark="oklch(0.74 0.14 30)" />
          <TokenSwatch name="warning" className="bg-warning" light="oklch(0.85 0.12 80)" dark="oklch(0.35 0.08 60)" />
          <TokenSwatch name="warning-foreground" className="bg-warning-foreground" light="oklch(0.38 0.08 60)" dark="oklch(0.85 0.12 80)" />
          <TokenSwatch name="border" className="bg-border" light="oklch(0.9 0.005 95)" dark="oklch(1 0 0 / 10%)" />
          <TokenSwatch name="ring" className="bg-ring" light="= primary" dark="= primary" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          L is the light value, D the dark value. The swatch shows the current theme.
        </p>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Sample text on surfaces</h2>
        <div className="space-y-2">
          <p className="rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10">
            Foreground on background — The quick brown fox
          </p>
          <p className="rounded-lg bg-card px-3 py-2 text-sm text-foreground shadow-card ring-1 ring-foreground/10">
            Foreground on card — The quick brown fox
          </p>
          <p className="rounded-lg bg-background px-3 py-2 text-sm text-muted-foreground ring-1 ring-foreground/10">
            Muted-foreground on background — The quick brown fox
          </p>
          <p className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            Primary-foreground on primary — Button text
          </p>
          <p className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-positive shadow-card ring-1 ring-foreground/10">
            Positive on card — You get back {formatCurrency(42.5)}
          </p>
          <p className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-negative shadow-card ring-1 ring-foreground/10">
            Negative on card — You owe {formatCurrency(18.2)}
          </p>
          <p className="rounded-lg bg-warning px-3 py-2 text-sm font-medium text-warning-foreground">
            Warning-foreground on warning — Archived trip
          </p>
        </div>
      </div>
    </div>
  );
}

function BadgesSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Variants (size sm)</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral" size="sm">Neutral</Badge>
          <Badge variant="primary" size="sm">Primary</Badge>
          <Badge variant="positive" size="sm">Positive</Badge>
          <Badge variant="negative" size="sm">Negative</Badge>
          <Badge variant="warning" size="sm">Warning</Badge>
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Variants (size md)</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral" size="md">Neutral</Badge>
          <Badge variant="primary" size="md">Primary</Badge>
          <Badge variant="positive" size="md">Positive</Badge>
          <Badge variant="negative" size="md">Negative</Badge>
          <Badge variant="warning" size="md">Warning</Badge>
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">In context</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="primary">Created by you</Badge>
          <Badge variant="neutral">Shared with you</Badge>
          <Badge variant="warning">Archived</Badge>
        </div>
      </div>
    </div>
  );
}

function ButtonsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Variants</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="default">Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Sizes</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Add">
            <Plus className="size-4" />
          </Button>
          <Button size="icon-xs" aria-label="Add extra small">
            <Plus className="size-3" />
          </Button>
          <Button size="icon-sm" aria-label="Add small">
            <Plus className="size-3.5" />
          </Button>
          <Button size="icon-lg" aria-label="Add large">
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Disabled and loading</h2>
        <div className="flex flex-wrap gap-2">
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>Disabled outline</Button>
          <Button disabled className="gap-1.5">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading
          </Button>
        </div>
      </div>
    </div>
  );
}

function CardsSection() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Lisbon Weekend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-positive/20 bg-positive/5 px-3 py-2 text-sm">
            <span className="font-medium">Ava gets back</span>
            <span className="font-semibold tabular-nums text-positive">{formatCurrency(42.5)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-negative/20 bg-negative/5 px-3 py-2 text-sm">
            <span className="font-medium">Liam owes</span>
            <span className="font-semibold tabular-nums text-negative">{formatCurrency(18.2)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
            <span className="font-medium">Maya all square</span>
            <span className="font-semibold tabular-nums text-muted-foreground">{formatCurrency(0)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HeaderSection({ theme }: { theme: "light" | "dark" }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  function toggleTheme() {
    const next = new URLSearchParams(params);
    next.set("theme", theme === "dark" ? "light" : "dark");
    navigate(`?${next.toString()}`, { replace: true });
  }

  const noop = () => {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Admin</h2>
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <HeaderView
            user={{ displayName: "Ava Example", email: "ava@example.com", photoURL: null }}
            isAdmin
            theme={theme}
            buildCommit="abc1234"
            buildTime="2026-10-06T12:00:00.000Z"
            onToggleTheme={toggleTheme}
            onSignOut={noop}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Open the avatar menu to see Admin, theme toggle, version and sign out.
        </p>
      </div>
      <div>
        <h2 className="mb-2 text-lg font-semibold">Non-admin</h2>
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <HeaderView
            user={{ displayName: "Liam Guest", email: "liam@example.com", photoURL: null }}
            isAdmin={false}
            theme={theme}
            buildCommit="abc1234"
            buildTime="2026-10-06T12:00:00.000Z"
            onToggleTheme={toggleTheme}
            onSignOut={noop}
          />
        </div>
      </div>
    </div>
  );
}

const noop = () => {};

function TripPreviewShell({
  activeTab,
  trip,
  isOwner,
  isArchived,
  showFab,
  theme,
  children,
}: {
  activeTab: TripTabId;
  trip: Trip;
  isOwner: boolean;
  isArchived: boolean;
  showFab: boolean;
  theme: "light" | "dark";
  children: ReactNode;
}) {
  return (
    <TripShellView
      trip={trip}
      isOwner={isOwner}
      isArchived={isArchived}
      header={
        <HeaderView
          user={{ displayName: "Ava Example", email: "ava@example.com", photoURL: null }}
          isAdmin={isOwner}
          theme={theme}
          buildCommit="abc1234"
          buildTime="2026-10-06T12:00:00.000Z"
          onToggleTheme={noop}
          onSignOut={noop}
        />
      }
      tabs={<TripTabs active={activeTab} />}
      fab={showFab && !isArchived ? <Fab onAdd={noop} /> : null}
    >
      {children}
    </TripShellView>
  );
}

const SQUARE_EXPENSES: Expense[] = [
  {
    id: "sq1",
    description: "Dinner",
    category: "food",
    date: "2026-10-01",
    amount: 50,
    paidBy: "Ava",
    sharedBy: ["Ava", "Liam"],
    createdAt: previewTimestamp("2026-10-01T19:00:00.000Z"),
  },
  {
    id: "sq2",
    description: "Lunch",
    category: "food",
    date: "2026-10-02",
    amount: 50,
    paidBy: "Liam",
    sharedBy: ["Ava", "Liam"],
    createdAt: previewTimestamp("2026-10-02T12:30:00.000Z"),
  },
];

function TripOverviewSection({ theme, state }: { theme: "light" | "dark"; state: OverviewState }) {
  let trip: Trip = previewTrip;
  let expenses: Expense[] = previewExpenses;
  let payments: Payment[] = previewPayments;
  let myName: string | null = "Ava";
  const isOwner = true;

  if (state === "owes") {
    myName = "Maya";
  } else if (state === "square") {
    trip = {
      ...previewTrip,
      participants: ["Ava", "Liam"],
      participantLinks: {},
      collaboratorIds: [],
      settlementGroups: [],
    };
    expenses = SQUARE_EXPENSES;
    payments = [];
    myName = "Ava";
  } else if (state === "unlinked") {
    myName = null;
  } else if (state === "new") {
    trip = {
      ...previewTrip,
      participants: ["Ava"],
      participantLinks: {},
      collaboratorIds: [],
      shareToken: null,
      settlementGroups: [],
    };
    expenses = [];
    payments = [];
    myName = "Ava";
  } else if (state === "archived") {
    trip = { ...previewTrip, archived: true };
    myName = "Ava";
  }

  const isArchived = trip.archived === true;
  return (
    <TripPreviewShell
      activeTab="overview"
      trip={trip}
      isOwner={isOwner}
      isArchived={isArchived}
      showFab={false}
      theme={theme}
    >
      <OverviewTabView
        position={myPosition(trip, expenses, payments, myName)}
        isOwner={isOwner}
        isArchived={isArchived}
        checklist={checklistState(trip, expenses, payments, isOwner)}
        checklistDismissed={false}
        activity={recentActivity(expenses, payments)}
        onAddExpense={noop}
        onEditTrip={noop}
        onDismissChecklist={noop}
      />
    </TripPreviewShell>
  );
}

function TripExpensesSection({ theme }: { theme: "light" | "dark" }) {
  return (
    <TripPreviewShell
      activeTab="expenses"
      trip={previewTrip}
      isOwner
      isArchived={false}
      showFab
      theme={theme}
    >
      <ExpensesTabView
        expenses={previewExpenses}
        participants={previewTrip.participants}
        isArchived={false}
        onAddExpense={noop}
        onEditExpense={noop}
        onDeleteExpense={noop}
      />
    </TripPreviewShell>
  );
}

function TripSettleSection({ theme }: { theme: "light" | "dark" }) {
  return (
    <TripPreviewShell
      activeTab="settle"
      trip={previewTrip}
      isOwner
      isArchived={false}
      showFab={false}
      theme={theme}
    >
      <SettleTabView
        tripId={previewTrip.id}
        expenses={previewExpenses}
        participants={previewTrip.participants}
        payments={previewPayments}
        tripName={previewTrip.name}
        settlementMethod={previewTrip.settlementMethod}
        settlementGroups={previewTrip.settlementGroups}
        isArchived={false}
        onMarkPaid={() => toast.success("Marked as paid (preview)")}
        onAddPayment={noop}
        onEditPayment={noop}
        onDeletePayment={noop}
        onOpenHelp={noop}
        onOpenReport={noop}
        onDownloadExcel={() => toast.success("Excel export (preview)")}
      />
    </TripPreviewShell>
  );
}

function TripPeopleSection({ theme }: { theme: "light" | "dark" }) {
  return (
    <TripPreviewShell
      activeTab="people"
      trip={previewTrip}
      isOwner
      isArchived={false}
      showFab={false}
      theme={theme}
    >
      <PeopleTabView
        trip={previewTrip}
        members={{}}
        myName="Ava"
        isOwner
        isArchived={false}
        archiving={false}
        onEditTrip={noop}
        onToggleArchive={noop}
        onDeleteTrip={noop}
      />
    </TripPreviewShell>
  );
}

const DASHBOARD_TRIPS = [
  { trip: previewTrip, role: "owner" as const },
  {
    trip: {
      ...previewTrip,
      id: "preview-trip-2",
      name: "Ski Weekend",
      participants: ["Ava", "Liam", "Maya"],
      updatedAt: previewTimestamp("2026-10-04T09:00:00.000Z"),
    },
    role: "collaborator" as const,
  },
  {
    trip: {
      ...previewTrip,
      id: "preview-trip-3",
      name: "Old Beach Trip",
      archived: true,
      updatedAt: previewTimestamp("2026-08-01T12:00:00.000Z"),
    },
    role: "owner" as const,
  },
];

function DashboardSection({ theme }: { theme: "light" | "dark" }) {
  const header = (
    <HeaderView
      user={{ displayName: "Ava Example", email: "ava@example.com", photoURL: null }}
      isAdmin={false}
      theme={theme}
      buildCommit="abc1234"
      buildTime="2026-10-06T12:00:00.000Z"
      onToggleTheme={noop}
      onSignOut={noop}
    />
  );
  const accountOptions = [
    { uid: "fake-uid-ava", label: "Ava Example", email: "ava@example.com" },
  ];
  async function handleCreate() {
    toast.success("Trip created (preview)");
    return true;
  }
  return (
    <div className="space-y-8">
      <DashboardView
        displayName="Ava Example"
        creatorUid="fake-uid-ava"
        trips={DASHBOARD_TRIPS}
        loading={false}
        loadError={false}
        canCreateTrips
        accessLoading={false}
        accountOptions={accountOptions}
        onCreateTrip={handleCreate}
        header={header}
      />
      <div>
        <h2 className="mb-2 text-lg font-semibold">Empty state</h2>
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <DashboardView
            displayName="Ava Example"
            creatorUid="fake-uid-ava"
            trips={[]}
            loading={false}
            loadError={false}
            canCreateTrips
            accessLoading={false}
            accountOptions={accountOptions}
            onCreateTrip={handleCreate}
            header={null}
          />
        </div>
      </div>
    </div>
  );
}

function HowItWorksSection() {
  const [videoOpen, setVideoOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <HowItWorksSignedOutBar />
      <HowItWorksContent onWatchVideo={() => setVideoOpen(true)} />
      <SettlementHelpDialog open={videoOpen} onOpenChange={setVideoOpen} />
    </div>
  );
}

function LoginSection() {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <LoginCard signingIn={false} onSignIn={noop} />
    </div>
  );
}

function TourSection({ step }: { step: number }) {
  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        The welcome tour opens as a dialog over the dashboard.
      </p>
      <WelcomeTour open onClose={noop} initialStep={step - 1} />
    </div>
  );
}

function WizardSection({ step }: { step: number }) {
  return (
    <div className="mx-auto max-w-lg">
      <CreateTripWizard
        creatorName="Ava Example"
        creatorUid="fake-uid-ava"
        accountOptions={[
          {
            uid: "fake-uid-ava",
            label: "Ava Example",
            email: "ava@example.com",
          },
        ]}
        initialStep={step - 1}
        onSubmit={() => {
          toast.success("Trip created (preview)");
        }}
        onCancel={noop}
      />
    </div>
  );
}

function InfoTipsSection() {
  const rows: { label: string; tip: ReactNode; room: string }[] = [
    { label: "Balances", tip: <BalancesExplainer open />, room: "min-h-44" },
    {
      label: "Suggested payments",
      tip: <SuggestedPaymentsExplainer open />,
      room: "min-h-44",
    },
    {
      label: "How payments are suggested",
      tip: <MethodExplainer open />,
      room: "min-h-96",
    },
    { label: "Pay as a group", tip: <GroupsExplainer open />, room: "min-h-44" },
    { label: "Mark as paid", tip: <MarkPaidExplainer open />, room: "min-h-40" },
  ];
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className={row.room}>
          <p className="flex items-center gap-1 text-sm font-medium">
            {row.label}
            {row.tip}
          </p>
        </div>
      ))}
    </div>
  );
}

function EmptyStatesSection() {
  const blocks: { label: string; body: ReactNode }[] = [
    {
      label: "Expenses",
      body: <ExpenseList expenses={[]} onAdd={noop} />,
    },
    {
      label: "Payments",
      body: <PaymentList payments={[]} onAdd={noop} />,
    },
    {
      label: "Settle · no expenses",
      body: (
        <SettlementList
          expenses={[]}
          participants={previewTrip.participants}
          payments={[]}
          settlementMethod={previewTrip.settlementMethod}
        />
      ),
    },
    {
      label: "Settle · all square",
      body: (
        <SettlementList
          expenses={SQUARE_EXPENSES}
          participants={["Ava", "Liam"]}
          payments={[]}
          settlementMethod="greedy"
        />
      ),
    },
    {
      label: "Recent activity",
      body: <RecentActivity activity={[]} />,
    },
  ];
  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <div key={block.label}>
          <h2 className="mb-2 text-lg font-semibold">{block.label}</h2>
          <Card>
            <CardContent>{block.body}</CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

const SETTLED_PREVIEW_TRIP_ID = "preview-settled";

function SettledSection() {
  const [round, setRound] = useState(0);
  const [settled, setSettled] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function replay() {
    clearCelebratedSignature(SETTLED_PREVIEW_TRIP_ID);
    if (timer.current !== null) window.clearTimeout(timer.current);
    // Remount with transfers, then settle on the next tick so the
    // fresh-transition confetti plays again.
    setSettled(false);
    setRound((r) => r + 1);
    timer.current = window.setTimeout(() => setSettled(true), 150);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setSettled(true)} disabled={settled}>
          Simulate settling
        </Button>
        <Button variant="outline" onClick={replay}>
          Replay confetti
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Replay clears this trip&apos;s celebrated key, then re-settles so the
        one-time burst plays again. Reloading the page does not replay it.
      </p>
      <SettleCelebration
        key={round}
        tripId={SETTLED_PREVIEW_TRIP_ID}
        expenses={previewExpenses}
        payments={previewPayments}
        hasTransfers={!settled}
        onDownloadExcel={() => toast.success("Excel export (preview)")}
      />
    </div>
  );
}

function SkeletonsSection({ theme }: { theme: "light" | "dark" }) {
  const header = (
    <HeaderView
      user={{ displayName: "Ava Example", email: "ava@example.com", photoURL: null }}
      isAdmin={false}
      theme={theme}
      buildCommit="abc1234"
      buildTime="2026-10-06T12:00:00.000Z"
      onToggleTheme={noop}
      onSignOut={noop}
    />
  );
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Dashboard</h2>
        <DashboardView
          displayName="Ava Example"
          creatorUid="fake-uid-ava"
          trips={[]}
          loading
          loadError={false}
          canCreateTrips
          accessLoading={false}
          accountOptions={[]}
          onCreateTrip={() => true}
          header={header}
        />
      </div>
      <div>
        <h2 className="mb-2 text-lg font-semibold">Trip cards</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TripCardSkeleton />
          <TripCardSkeleton />
          <TripCardSkeleton />
        </div>
      </div>
      <div>
        <h2 className="mb-2 text-lg font-semibold">Trip page</h2>
        <TripPageSkeleton />
      </div>
    </div>
  );
}

let fakeRowId = 0;

function makeFakeExpense(): Expense {
  fakeRowId += 1;
  return {
    id: `fake-row-${fakeRowId}`,
    description: `Fake pastries ${fakeRowId}`,
    category: "food",
    date: "2026-10-06",
    amount: 12.5 + fakeRowId,
    paidBy: "Ava",
    sharedBy: ["Ava", "Liam"],
    createdAt: previewTimestamp("2026-10-06T12:00:00.000Z"),
  };
}

function MotionSection() {
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    previewExpenses.slice(0, 3),
  );
  const [heroAmount, setHeroAmount] = useState(128.5);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Count-up</h2>
        <p className="text-4xl font-bold">
          <CountUp value={heroAmount} format={formatCurrency} />
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setHeroAmount((v) => v + 42.75)}
          >
            Add $42.75
          </Button>
          <Button variant="outline" onClick={() => setHeroAmount(128.5)}>
            Reset
          </Button>
        </div>
      </div>
      <div>
        <h2 className="mb-2 text-lg font-semibold">List rows</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setExpenses((prev) => [makeFakeExpense(), ...prev])}
          >
            Add a row
          </Button>
          <Button
            variant="outline"
            onClick={() => setExpenses((prev) => prev.slice(1))}
            disabled={expenses.length === 0}
          >
            Remove a row
          </Button>
        </div>
        <ExpenseList
          expenses={expenses}
          participants={previewTrip.participants}
          onEdit={noop}
          onDelete={(expense) =>
            setExpenses((prev) => prev.filter((e) => e.id !== expense.id))
          }
          onAdd={() => setExpenses((prev) => [makeFakeExpense(), ...prev])}
        />
      </div>
    </div>
  );
}

export function PreviewPage() {
  const [params] = useSearchParams();
  const section = sectionFromParam(params.get("section"));
  const themeParam = params.get("theme");
  const forcedTheme: "light" | "dark" =
    themeParam === "dark" ? "dark" : themeParam === "light" ? "light" : "light";

  useEffect(() => {
    const root = document.documentElement;
    if (forcedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [forcedTheme]);

  function hrefFor(target: Section): string {
    const next = new URLSearchParams(params);
    next.set("section", target);
    next.set("theme", forcedTheme);
    return `?${next.toString()}`;
  }

  function themeHref(target: "light" | "dark"): string {
    const next = new URLSearchParams(params);
    next.set("section", section);
    next.set("theme", target);
    return `?${next.toString()}`;
  }

  return (
    <div
      data-marker="__TRIPSHARE_DEV_PREVIEW__"
      className="min-h-dvh bg-background text-foreground"
    >
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Preview</h1>
          <div className="flex gap-2 text-sm">
            <Link
              to={themeHref("light")}
              className={`rounded-md px-2.5 py-1 ${forcedTheme === "light" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Light
            </Link>
            <Link
              to={themeHref("dark")}
              className={`rounded-md px-2.5 py-1 ${forcedTheme === "dark" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Dark
            </Link>
          </div>
        </div>
        <nav className="mb-6 flex flex-wrap gap-2" aria-label="Preview sections">
          {SECTIONS.map((s) => (
            <Link
              key={s}
              to={hrefFor(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${s === section ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {SECTION_LABELS[s]}
            </Link>
          ))}
        </nav>
        {(section === "tour" || section === "wizard") && (
          <nav className="mb-6 flex flex-wrap gap-2" aria-label="Preview step">
            {(section === "tour" ? [1, 2, 3, 4] : [1, 2, 3]).map((n) => {
              const next = new URLSearchParams(params);
              next.set("step", String(n));
              const max = section === "tour" ? 4 : 3;
              const active = stepFromParam(params.get("step"), max) === n;
              return (
                <Link
                  key={n}
                  to={`?${next.toString()}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  {`Step ${n}`}
                </Link>
              );
            })}
          </nav>
        )}
        {section === "trip-overview" && (
          <nav className="mb-6 flex flex-wrap gap-2" aria-label="Overview states">
            {OVERVIEW_STATES.map((st) => {
              const next = new URLSearchParams(params);
              next.set("state", st);
              const active = overviewStateFromParam(params.get("state")) === st;
              return (
                <Link
                  key={st}
                  to={`?${next.toString()}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  {st}
                </Link>
              );
            })}
          </nav>
        )}
        {section === "tokens" && <TokensSection />}
        {section === "badges" && <BadgesSection />}
        {section === "buttons" && <ButtonsSection />}
        {section === "cards" && <CardsSection />}
        {section === "header" && <HeaderSection theme={forcedTheme} />}
        {section === "trip-overview" && (
          <TripOverviewSection
            theme={forcedTheme}
            state={overviewStateFromParam(params.get("state"))}
          />
        )}
        {section === "trip-expenses" && <TripExpensesSection theme={forcedTheme} />}
        {section === "trip-settle" && <TripSettleSection theme={forcedTheme} />}
        {section === "trip-people" && <TripPeopleSection theme={forcedTheme} />}
        {section === "dashboard" && <DashboardSection theme={forcedTheme} />}
        {section === "how-it-works" && <HowItWorksSection />}
        {section === "login" && <LoginSection />}
        {section === "tour" && (
          <TourSection step={stepFromParam(params.get("step"), 4)} />
        )}
        {section === "wizard" && (
          <WizardSection step={stepFromParam(params.get("step"), 3)} />
        )}
        {section === "infotips" && <InfoTipsSection />}
        {section === "empty-states" && <EmptyStatesSection />}
        {section === "settled" && <SettledSection />}
        {section === "skeletons" && <SkeletonsSection theme={forcedTheme} />}
        {section === "motion" && <MotionSection />}
      </div>
    </div>
  );
}
