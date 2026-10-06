import { useEffect, useMemo, useRef } from "react";
import { m, useReducedMotion } from "motion/react";
import { Download, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    duration: 0.8 + (i % 5) * 0.05,
    delay: (i % 7) * 0.05,
  }));
}

function Confetti() {
  const pieces = useMemo(() => buildPieces(20), []);
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
  onDownloadExcel?: () => void;
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
  onDownloadExcel,
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
      <CardContent className="flex flex-wrap items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-positive/15 text-positive">
          <PartyPopper className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-positive">All settled! 🎉</p>
          <p className="text-sm text-muted-foreground">
            Everyone&apos;s paid back. Nice trip.
          </p>
        </div>
        {onDownloadExcel && (
          <Button variant="outline" size="sm" onClick={onDownloadExcel}>
            <Download className="size-4" aria-hidden />
            Download Excel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
