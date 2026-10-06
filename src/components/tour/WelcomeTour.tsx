import { useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import {
  Camera,
  Check,
  Eye,
  HandCoins,
  Plus,
  Receipt,
  Scale,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fadeSlideUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface TourStep {
  title: string;
  body: string;
  mainIcon: typeof Users;
  badgeIcon: typeof Plus;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Create a trip",
    body: "Name your trip and add the people sharing costs.",
    mainIcon: Users,
    badgeIcon: Plus,
  },
  {
    title: "Add expenses",
    body: "Snap a receipt or type it in.",
    mainIcon: Receipt,
    badgeIcon: Camera,
  },
  {
    title: "See who owes whom",
    body: "Balances update with every expense.",
    mainIcon: Scale,
    badgeIcon: Eye,
  },
  {
    title: "Settle up with fewer payments",
    body: "Two transfers can settle a whole weekend.",
    mainIcon: HandCoins,
    badgeIcon: Check,
  },
];

function StepIllustration({ step }: { step: TourStep }) {
  return (
    <div className="relative mx-auto size-24" aria-hidden>
      <span className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-primary">
        <step.mainIcon className="size-10" />
      </span>
      <m.span
        className="absolute -right-1 -bottom-1 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      >
        <step.badgeIcon className="size-4" />
      </m.span>
    </div>
  );
}

export interface WelcomeTourProps {
  open: boolean;
  onClose: () => void;
  /** First step to show; the app always starts at 0. */
  initialStep?: number;
}

export function WelcomeTour({ open, onClose, initialStep = 0 }: WelcomeTourProps) {
  const [step, setStep] = useState(initialStep);
  const last = step === TOUR_STEPS.length - 1;
  const current = TOUR_STEPS[step] ?? TOUR_STEPS[0]!;
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setStep(initialStep);
  }, [open, initialStep]);

  function goNext() {
    if (last) {
      onClose();
    } else {
      setStep((s) => Math.min(s + 1, TOUR_STEPS.length - 1));
    }
  }

  function goBack() {
    const next = Math.max(step - 1, 0);
    // Back disables itself on step 1, which would drop focus out of the
    // dialog; move it to Next first, while Back is still enabled.
    if (next === 0) {
      nextRef.current?.focus();
    }
    setStep(next);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className="max-w-xs text-center"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            goNext();
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            goBack();
          }
        }}
      >
        <m.div
          key={step}
          variants={fadeSlideUp}
          initial="hidden"
          animate="show"
        >
          <StepIllustration step={current} />
          <DialogTitle className="mt-4 text-lg">{current.title}</DialogTitle>
          <DialogDescription className="mt-1 text-center">
            {current.body}
          </DialogDescription>
        </m.div>

        <div
          className="flex items-center justify-center gap-1.5"
          role="img"
          aria-label={`Step ${step + 1} of ${TOUR_STEPS.length}`}
        >
          {TOUR_STEPS.map((s, index) => (
            <span
              key={s.title}
              className={cn(
                "h-2 rounded-full transition-colors",
                index === step ? "w-6 bg-primary" : "w-2 bg-muted",
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Skip
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goBack}
              disabled={step === 0}
            >
              Back
            </Button>
            <Button
              ref={nextRef}
              type="button"
              size="sm"
              onClick={goNext}
            >
              {last ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
