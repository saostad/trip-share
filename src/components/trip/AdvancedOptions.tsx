import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface AdvancedOptionsProps {
  /** One-line summary shown while collapsed, e.g. the current method. */
  summary?: string;
  children: ReactNode;
}

/** Collapsed-by-default disclosure, shared by the wizard and Edit trip. */
export function AdvancedOptions({ summary, children }: AdvancedOptionsProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">Advanced options</span>
        {summary && !open && (
          <span className="ml-auto truncate text-xs text-muted-foreground">
            {summary}
          </span>
        )}
      </button>
      {open && (
        <div className="space-y-4 border-t border-border px-3 py-3">
          {children}
        </div>
      )}
    </div>
  );
}
