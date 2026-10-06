import type { ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InfoTipProps {
  /** The term being explained, as in "What does <term> mean?" */
  term: string;
  title: string;
  body: ReactNode;
  /** Renders the popover open; used by the DEV preview. */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * A small ⓘ button that explains jargon in a popover. Opens on click or
 * tap (Enter/Space on the keyboard); Escape closes it. Never hover-only.
 */
export function InfoTip({ term, title, body, defaultOpen, className }: InfoTipProps) {
  return (
    <Popover.Root defaultOpen={defaultOpen}>
      <Popover.Trigger
        aria-label={`What does ${term} mean?`}
        className={cn(
          "relative inline-flex size-6 shrink-0 items-center justify-center rounded-full align-middle text-muted-foreground outline-none after:absolute after:-inset-2.5 after:content-[''] hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <Info className="size-4" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} className="z-50">
          <Popover.Popup className="w-64 rounded-lg border border-border bg-popover p-3 text-sm shadow-md outline-none">
            <Popover.Title className="font-semibold">{title}</Popover.Title>
            <Popover.Description className="mt-1 text-muted-foreground">
              {body}
            </Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
