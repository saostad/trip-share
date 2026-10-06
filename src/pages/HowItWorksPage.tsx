import { useState } from "react";
import { Link } from "react-router";
import {
  ChevronDown,
  HandCoins,
  Play,
  Receipt,
  Scale,
  Users,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { SettlementHelpDialog } from "@/components/balance/SettlementHelpDialog";
import { Header, HeaderLogo } from "@/components/layout/Header";
import { WorkedExample } from "@/components/how-it-works/WorkedExample";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Users,
    title: "Create a trip and add people",
    body: "Name your trip and add everyone who is sharing costs — friends, family, or the whole group chat.",
  },
  {
    icon: Receipt,
    title: "Add expenses as you go",
    body: "Snap a photo of the receipt or type in the amount. Whoever pays logs it in seconds.",
  },
  {
    icon: Scale,
    title: "See who owes whom",
    body: "TripShare keeps a running balance for everyone, so the answer is always one glance away.",
  },
  {
    icon: HandCoins,
    title: "Settle up with fewer payments",
    body: "Instead of repaying every expense, a couple of transfers settle the whole trip.",
  },
];

const FAQS = [
  {
    question: 'What\u2019s a "fair share"?',
    answer:
      "Your fair share of one expense is the total split between everyone sharing it. A $60 dinner split 3 ways means a $20 fair share each. TripShare adds up your fair shares across every expense.",
  },
  {
    question: "Why are there fewer payments than expenses?",
    answer:
      "TripShare looks at everyone's final balance instead of repaying each expense one by one. If you owe Maya $50 and Maya owes Liam $50, one payment from you to Liam settles both — debts in opposite directions cancel out.",
  },
  {
    question: "Can friends add expenses too?",
    answer:
      "Yes. Anyone with access to the trip can add expenses, so whoever pays just logs it and the balances update for everyone.",
  },
  {
    question: "What if someone only shares some of the expenses?",
    answer:
      "Every expense has its own sharing list. If Maya skips a dinner, she is left off that expense and it doesn't touch her balance.",
  },
  {
    question: "What are groups (families or couples)?",
    answer:
      "A group settles as one. If Ava and Liam are a couple, their balances are combined and the group pays or receives a single amount.",
  },
];

export function HowItWorksSignedOutBar() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <HeaderLogo />
      <Link
        to="/login"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Sign in
      </Link>
    </header>
  );
}

export function HowItWorksContent({ onWatchVideo }: { onWatchVideo: () => void }) {
  return (
    <main className="container mx-auto max-w-3xl space-y-12 px-4 py-10">
        <div className="max-w-xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Split trip costs without the awkward math
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            TripShare tracks who paid what, works out who owes whom, and settles
            everyone up with as few payments as possible.
          </p>
        </div>

        <section aria-labelledby="how-steps">
          <h2 id="how-steps" className="mb-4 text-xl font-semibold">
            How it works
          </h2>
          <ol className="space-y-5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {`Step ${index + 1}`}
                  </span>
                  <span className="block font-semibold">{step.title}</span>
                  <span className="block text-sm text-muted-foreground">
                    {step.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Worked example">
          <WorkedExample />
        </section>

        <section aria-labelledby="how-faq">
          <h2 id="how-faq" className="mb-4 text-xl font-semibold">
            Questions, answered
          </h2>
          <div className="space-y-2">
            {FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-lg border border-border bg-card"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section
          aria-label="Video"
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Play className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Prefer watching?</h2>
            <p className="text-sm text-muted-foreground">
              See how the settle-up math works in a short video.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onWatchVideo}
            className="w-full sm:w-auto"
          >
            Watch a 3-minute video
          </Button>
        </section>
    </main>
  );
}

export function HowItWorksPage() {
  const { user } = useAuth();
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {user ? <Header /> : <HowItWorksSignedOutBar />}

      <HowItWorksContent onWatchVideo={() => setVideoOpen(true)} />

      <SettlementHelpDialog open={videoOpen} onOpenChange={setVideoOpen} />
    </div>
  );
}
