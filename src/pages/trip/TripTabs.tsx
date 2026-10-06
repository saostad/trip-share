import { NavLink } from "react-router";
import { House, Receipt, HandCoins, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TripTabId = "overview" | "expenses" | "settle" | "people";

interface TabDef {
  id: TripTabId;
  to: string;
  end: boolean;
  label: string;
  Icon: LucideIcon;
}

const TABS: TabDef[] = [
  { id: "overview", to: ".", end: true, label: "Overview", Icon: House },
  { id: "expenses", to: "expenses", end: false, label: "Expenses", Icon: Receipt },
  { id: "settle", to: "settle", end: false, label: "Settle up", Icon: HandCoins },
  { id: "people", to: "people", end: false, label: "People", Icon: Users },
];

/**
 * Trip navigation tabs. In the app the active tab comes from the route;
 * `active` forces one (used by /dev/preview, which lives outside /trip/*).
 */
export function TripTabs({ active }: { active?: TripTabId }) {
  return (
    <>
      <nav aria-label="Trip sections" className="mb-6 hidden gap-1 border-b md:flex">
        {TABS.map(({ id, to, end, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-current={active !== undefined && id === active ? "page" : undefined}
            className={({ isActive }) =>
              cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                (active !== undefined ? id === active : isActive)
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <nav
        aria-label="Trip sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-4">
          {TABS.map(({ id, to, end, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-current={active !== undefined && id === active ? "page" : undefined}
              className={({ isActive }) =>
                cn(
                  "flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
                  (active !== undefined ? id === active : isActive)
                    ? "text-primary"
                    : "text-muted-foreground",
                )
              }
            >
              <Icon className="size-5" aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
