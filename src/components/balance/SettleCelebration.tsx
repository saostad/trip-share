import { useEffect, useMemo, useRef } from "react";
import { m, useReducedMotion } from "motion/react";
import { PartyPopper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  readCelebratedSignature,
  writeCelebratedSignature,
} from "./celebrationStorage";
import type { Expense, Payment } from "@/types";

const CONFETTI_COLORS = [
  "bg-primary",
  "bg-positive",
  "bg-warning",
  "bg-negative",
];

interface ConfettiPiece {
  left: number;
  size: number;
  color: string;
  round: boolean;
  drift: number;
  fall: number;
  spin: number;
  duration: number;
  delay: number;
}

function buildPieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    left: (i * 97) % 100,
    size: 6 + ((i * 13) % 5),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
    round: i % 2 === 0,
    drift: ((i * 53) % 41) - 20,
    fall: 140 + ((i * 37) % 81),
    spin: (i * 89) % 360,
    duration: 1.4 + (i % 5) * 0.1,
    delay: (i % 7) * 0.05,
  }));
}

function Confetti() {
  const pieces = useMemo(() => buildPieces(40), []);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {pieces.map((piece, index) => (
        <m.span
          key={index}
          className={`absolute top-0 ${piece.round ? "rounded-full" : "rounded-[2px]"} ${piece.color}`}
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size,
          }}
          initial={{ x: 0, y: -12, opacity: 1, rotate: 0 }}
          animate={{
            x: piece.drift,
            y: piece.fall,
            opacity: 0,
            rotate: piece.spin,
          }}
          transition={{ duration: piece.duration, delay: piece.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export interface SettleCelebrationProps {
  tripId: string;
  expenses: Expense[];
  payments: Payment[];
  hasTransfers: boolean;
}

/**
 * Non-modal "all square" card for the top of the Settle tab. Shows only on
 * a fresh transition to empty (previously had transfers, at least one
 * expense), once per trip state; confetti is skipped under reduced motion.
 */
export function SettleCelebration({
  tripId,
  expenses,
  payments,
  hasTransfers,
}: SettleCelebrationProps) {
  const reduceMotion = useReducedMotion();
  const signature = useMemo(
    () =>
      JSON.stringify([
        expenses.map((e) => e.id).sort(),
        payments.map((p) => p.id).sort(),
      ]),
    [expenses, payments],
  );
  const celebrated = useMemo(
    () => readCelebratedSignature(tripId) === signature,
    [tripId, signature],
  );

  const prevHadTransfers = useRef<boolean | null>(null);
  const fresh =
    prevHadTransfers.current === true &&
    !hasTransfers &&
    expenses.length >= 1;
  useEffect(() => {
    prevHadTransfers.current = hasTransfers;
  }, [hasTransfers]);

  const visible = fresh && !celebrated;
  useEffect(() => {
    if (visible) writeCelebratedSignature(tripId, signature);
  }, [visible, tripId, signature]);

  if (!visible) return null;

  return (
    <Card className="relative overflow-hidden border-positive/30 bg-positive/5">
      {!reduceMotion && <Confetti />}
      <CardContent className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-positive/15 text-positive">
          <PartyPopper className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-positive">Everyone is all square</p>
          <p className="text-sm text-muted-foreground">
            Nothing left to pay.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
