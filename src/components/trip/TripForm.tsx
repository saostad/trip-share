import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ParticipantInput,
  type AccountOption,
} from "@/components/trip/ParticipantInput";
import { sanitizeParticipantLinks } from "@/lib/participantLinks";
import {
  DEFAULT_SETTLEMENT_METHOD,
  normalizeSettlementMethod,
  settlementMethodLabel,
} from "@/lib/balances";
import type { Trip, Expense, SettlementMethod } from "@/types";

interface TripFormProps {
  trip?: Trip;
  expenses?: Expense[];
  accountOptions?: AccountOption[];
  /** When true, show settlement method (owner create/edit). */
  showSettlementMethod?: boolean;
  onSubmit: (data: {
    name: string;
    participants: string[];
    participantLinks: Record<string, string>;
    settlementMethod: SettlementMethod;
  }) => void;
  onCancel: () => void;
}

function methodHelp(method: SettlementMethod): string {
  if (method === "pairwise") {
    return "Each person only settles with people they shared expenses with (after netting). May create more transfers. ";
  }
  if (method === "smallest") {
    return "Always clears the person with the smallest remaining balance first. Easy to follow; may need more transfers. ";
  }
  return "Pairs the largest remaining debt with the largest remaining credit. Usually fewer transfers. ";
}

export function TripForm({
  trip,
  expenses = [],
  accountOptions = [],
  showSettlementMethod = true,
  onSubmit,
  onCancel,
}: TripFormProps) {
  const [name, setName] = useState(trip?.name ?? "");
  const [participants, setParticipants] = useState<string[]>(
    trip?.participants ?? [],
  );
  const [links, setLinks] = useState<Record<string, string>>(
    trip?.participantLinks ?? {},
  );
  const [settlementMethod, setSettlementMethod] = useState<SettlementMethod>(
    normalizeSettlementMethod(trip?.settlementMethod),
  );
  const [nameError, setNameError] = useState("");

  const isEditMode = !!trip;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Trip name is required");
      return;
    }

    setNameError("");
    onSubmit({
      name: trimmedName,
      participants,
      participantLinks: sanitizeParticipantLinks(participants, links),
      settlementMethod: showSettlementMethod
        ? settlementMethod
        : normalizeSettlementMethod(trip?.settlementMethod) ||
          DEFAULT_SETTLEMENT_METHOD,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="trip-name" className="text-sm font-medium leading-none">
          Trip Name
        </label>
        <Input
          id="trip-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError("");
          }}
          placeholder="Enter trip name"
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "trip-name-error" : undefined}
        />
        {nameError && (
          <p id="trip-name-error" className="text-sm text-destructive">
            {nameError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">Participants</label>
        <ParticipantInput
          participants={participants}
          expenses={expenses}
          onChange={setParticipants}
          accountOptions={accountOptions}
          links={links}
          onLinksChange={setLinks}
        />
      </div>

      {showSettlementMethod && (
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">
            Settlement method
          </label>
          <Select
            value={settlementMethod}
            onValueChange={(val) => {
              const v =
                typeof val === "string"
                  ? val
                  : (val as { value?: string } | null)?.value;
              setSettlementMethod(normalizeSettlementMethod(v));
            }}
          >
            <SelectTrigger className="w-full">
              <span className="truncate text-left">
                {settlementMethodLabel(settlementMethod)}
              </span>
              <SelectValue className="sr-only" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="greedy">Greedy (largest first)</SelectItem>
              <SelectItem value="smallest">
                Smallest first (clear one person)
              </SelectItem>
              <SelectItem value="pairwise">Pairwise netting</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {methodHelp(settlementMethod)}
            Only the trip owner can change this; everyone sees the same Settle Up
            list.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {isEditMode ? "Save Changes" : "Create Trip"}
        </Button>
      </div>
    </form>
  );
}
