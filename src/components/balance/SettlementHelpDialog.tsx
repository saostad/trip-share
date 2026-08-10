import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/** YouTube video explaining net-balance settlements (not expense-by-expense). */
export const SETTLEMENT_HELP_VIDEO_ID = "WZ_6-_QJ6v8";

const WATCH_URL = `https://www.youtube.com/watch?v=${SETTLEMENT_HELP_VIDEO_ID}`;
const EMBED_URL = `https://www.youtube.com/embed/${SETTLEMENT_HELP_VIDEO_ID}`;

interface SettlementHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettlementHelpDialog({
  open,
  onOpenChange,
}: SettlementHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How Settle Up works</DialogTitle>
          <DialogDescription>
            Settlements use net balances — not repaying each expense one by one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
            {open && (
              <iframe
                src={EMBED_URL}
                title="How Settle Up works"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}
          </div>

          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Fair share</span> —
              what each person should have contributed overall.
            </li>
            <li>
              <span className="font-medium text-foreground">Net balance</span> —
              paid minus fair share (plus any payments already recorded).
            </li>
            <li>
              <span className="font-medium text-foreground">Settle Up</span> —
              suggests a few transfers so everyone ends at zero. Chains and
              circles of "I owe you" often cancel automatically.
            </li>
          </ul>

          <div className="flex flex-wrap justify-end gap-2">
            <a
              href={WATCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open on YouTube
            </a>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
