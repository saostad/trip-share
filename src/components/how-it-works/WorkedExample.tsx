import { useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateBalances, computeSettlements } from "@/lib/balances";
import { formatCurrency } from "@/lib/formatters";
import { fadeSlideUp } from "@/lib/motion";
import {
  WORKED_EXAMPLE_EXPENSES,
  WORKED_EXAMPLE_FRIENDS,
} from "./workedExampleData";

/** Same $0.01 threshold as the rest of the app. */
const SQUARE_THRESHOLD = 0.01;

const FINAL_STAGE = 2;

function balanceLabel(name: string, net: number): string {
  if (net > SQUARE_THRESHOLD) return `${name} gets back ${formatCurrency(net)}`;
  if (net < -SQUARE_THRESHOLD)
    return `${name} owes ${formatCurrency(Math.abs(net))}`;
  return `${name} is all square`;
}

function DrawnArrow() {
  return (
    <m.svg
      className="h-4 min-w-10 flex-1 text-primary"
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
      aria-hidden
    >
      <m.line
        x1="0"
        y1="6"
        x2="90"
        y2="6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      <m.path
        d="M88 1.5 L99 6 L88 10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.2 }}
      />
    </m.svg>
  );
}

export function WorkedExampleScene({ stage }: { stage: number }) {
  const friends = [...WORKED_EXAMPLE_FRIENDS];
  const balances = calculateBalances(WORKED_EXAMPLE_EXPENSES, friends, []);
  const transfers = computeSettlements(
    "greedy",
    WORKED_EXAMPLE_EXPENSES,
    friends,
    [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          3 expenses
        </h3>
        <ul className="space-y-2">
          {WORKED_EXAMPLE_EXPENSES.map((expense) => (
            <li
              key={expense.id}
              className="flex flex-wrap items-baseline gap-x-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="font-medium">{expense.description}</span>
              <span className="text-muted-foreground">
                {expense.paidBy} paid {formatCurrency(expense.amount)}, split 3
                ways
              </span>
            </li>
          ))}
        </ul>
      </div>

      {stage >= 1 && (
        <m.div
          variants={fadeSlideUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Each person&apos;s balance
          </h3>
          <ul className="space-y-2">
            {friends.map((name) => (
              <li
                key={name}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium"
              >
                {balanceLabel(name, balances[name] ?? 0)}
              </li>
            ))}
          </ul>
        </m.div>
      )}

      {stage >= 2 && (
        <m.div
          variants={fadeSlideUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {`${transfers.length} suggested payments`}
          </h3>
          <ul className="space-y-2">
            {transfers.map((transfer) => (
              <li
                key={`${transfer.from}-${transfer.to}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="shrink-0 font-medium">{transfer.from}</span>
                <DrawnArrow />
                <span className="shrink-0 font-medium">{transfer.to}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatCurrency(transfer.amount)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            {transfers.map((t) => `${t.from} pays ${t.to}`).join(" · ")} —{" "}
            {transfers.length} payments settle all 3 expenses.
          </p>
        </m.div>
      )}
    </div>
  );
}

export function WorkedExample() {
  const reduceMotion = useReducedMotion();
  const [runId, setRunId] = useState(0);
  const [stage, setStage] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (reduceMotion) {
      setStage(FINAL_STAGE);
      return;
    }
    if (!startedRef.current) return;
    setStage(0);
    const first = setTimeout(() => setStage(1), 900);
    const second = setTimeout(() => setStage(FINAL_STAGE), 2100);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, [runId, reduceMotion]);

  return (
    <m.div
      onViewportEnter={() => {
        startedRef.current = true;
        setRunId((id) => id + 1);
      }}
      viewport={{ once: true }}
      className="rounded-xl border border-border bg-muted/40 p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">A weekend, worked out</h2>
        {!reduceMotion && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setRunId((id) => id + 1)}
          >
            <RotateCcw className="size-4" aria-hidden />
            Replay
          </Button>
        )}
      </div>
      <WorkedExampleScene stage={stage} />
    </m.div>
  );
}
