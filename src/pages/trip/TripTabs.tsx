import { NavLink } from "react-router";
import { House, Receipt, HandCoins, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabDef {
  to: string;
  end: boolean;
  label: string;
  Icon: LucideIcon;
}

const TABS: TabDef[] = [
  { to: ".", end: true, label: "Overview", Icon: House },
  { to: "expenses", end: false, label: "Expenses", Icon: Receipt },
  { to: "settle", end: false, label: "Settle up", Icon: HandCoins },
  { to: "people", end: false, label: "People", Icon: Users },
];

export function TripTabs() {
  return (
    <>
      <nav aria-label="Trip sections" className="mb-6 hidden gap-1 border-b md:flex">
        {TABS.map(({ to, end, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                isActive
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
          {TABS.map(({ to, end, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
                  isActive ? "text-primary" : "text-muted-foreground",
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
