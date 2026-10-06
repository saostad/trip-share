import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateIcon {
  Icon: LucideIcon;
  /** Soft token-colored circle classes, e.g. "bg-primary/10 text-primary". */
  circleClassName: string;
}

export interface EmptyStateProps {
  icons: EmptyStateIcon[];
  title: string;
  description?: string;
  actions?: ReactNode;
}

/**
 * Illustrated empty state in the dashboard's composed-icon style: soft
 * token-colored circles, a title, an optional line, and optional actions.
 */
export function EmptyState({ icons, title, description, actions }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-4 flex items-center justify-center gap-3" aria-hidden>
        {icons.map(({ Icon, circleClassName }, index) => {
          const large = icons.length === 1 || (icons.length === 3 && index === 1);
          return (
            <span
              key={index}
              className={cn(
                "flex items-center justify-center rounded-full",
                large ? "size-16" : "size-12",
                circleClassName,
              )}
            >
              <Icon className={large ? "size-7" : "size-5"} />
            </span>
          );
        })}
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {actions && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
