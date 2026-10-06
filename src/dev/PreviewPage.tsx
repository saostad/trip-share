import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeaderView } from "@/components/layout/Header";
import { formatCurrency } from "@/lib/formatters";

type Section = "tokens" | "badges" | "buttons" | "cards" | "header";

const SECTIONS: Section[] = ["tokens", "badges", "buttons", "cards", "header"];

function sectionFromParam(value: string | null): Section {
  if (value === "tokens" || value === "badges" || value === "buttons" || value === "cards" || value === "header") {
    return value;
  }
  return "tokens";
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
          <Badge variant="primary">Owner</Badge>
          <Badge variant="neutral">Collaborator</Badge>
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
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${s === section ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {s}
            </Link>
          ))}
        </nav>
        {section === "tokens" && <TokensSection />}
        {section === "badges" && <BadgesSection />}
        {section === "buttons" && <ButtonsSection />}
        {section === "cards" && <CardsSection />}
        {section === "header" && <HeaderSection theme={forcedTheme} />}
      </div>
    </div>
  );
}
