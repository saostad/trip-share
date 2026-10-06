import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { SettlementMethodPicker } from "@/components/trip/SettlementMethodPicker";
import { SettlementGroupsEditor } from "@/components/trip/SettlementGroupsEditor";
import { AdvancedOptions } from "@/components/trip/AdvancedOptions";
import { sanitizeSettlementGroups } from "@/lib/settlementGroups";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import type { Trip, Expense, SettlementMethod, SettlementGroup } from "@/types";

interface TripFormProps {
  trip?: Trip;
  expenses?: Expense[];
  accountOptions?: AccountOption[];
  showSettlementMethod?: boolean;
  defaultParticipantsOpen?: boolean;
  onSubmit: (data: {
    name: string;
    participants: string[];
    participantLinks: Record<string, string>;
    settlementMethod: SettlementMethod;
    settlementGroups: SettlementGroup[];
  }) => void | Promise<void>;
  onCancel: () => void;
}

export function TripForm({
  trip,
  expenses = [],
  accountOptions = [],
  showSettlementMethod = true,
  defaultParticipantsOpen = true,
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
  const [groups, setGroups] = useState<SettlementGroup[]>(
    () => sanitizeSettlementGroups(trip?.settlementGroups, trip?.participants ?? []),
  );
  const [nameError, setNameError] = useState("");
  const [participantsOpen, setParticipantsOpen] = useState(
    defaultParticipantsOpen,
  );
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = !!trip;
  const linkedCount = participants.filter((p) => !!links[p]).length;
  const advancedSummary = `${settlementMethodLabel(settlementMethod)} · ${
    groups.length === 0
      ? "no groups"
      : `${groups.length} group${groups.length === 1 ? "" : "s"}`
  }`;

  // Keep groups in sync when participants change (drop removed people)
  useEffect(() => {
    setGroups((prev) => sanitizeSettlementGroups(prev, participants));
  }, [participants]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Trip name is required");
      return;
    }

    setNameError("");
    setSubmitting(true);
    try {
      await onSubmit({
        name: trimmedName,
        participants,
        participantLinks: sanitizeParticipantLinks(participants, links),
        settlementMethod: showSettlementMethod
          ? settlementMethod
          : normalizeSettlementMethod(trip?.settlementMethod) ||
            DEFAULT_SETTLEMENT_METHOD,
        settlementGroups: sanitizeSettlementGroups(groups, participants),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="trip-name" className="text-sm font-medium leading-none">
          Trip name
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

      <div className="overflow-hidden rounded-lg border border-border">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          onClick={() => setParticipantsOpen((v) => !v)}
          aria-expanded={participantsOpen}
        >
          {participantsOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">Participants and links</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {participants.length} participant
            {participants.length === 1 ? "" : "s"}
            {participants.length > 0 ? ` · ${linkedCount} linked` : ""}
          </span>
        </button>

        {participantsOpen && (
          <div className="space-y-2 border-t border-border px-3 py-3">
            <p className="text-xs text-muted-foreground">
              Optionally link a name to a person&apos;s account (for defaults and
              notifications).
            </p>
            <ParticipantInput
              participants={participants}
              expenses={expenses}
              onChange={setParticipants}
              accountOptions={accountOptions}
              links={links}
              onLinksChange={setLinks}
            />
          </div>
        )}
      </div>

      {showSettlementMethod && (
        <AdvancedOptions summary={advancedSummary}>
          <SettlementMethodPicker
            value={settlementMethod}
            onChange={setSettlementMethod}
          />
          <p className="text-xs text-muted-foreground">
            Only the trip owner can change this. Everyone sees the same
            suggested payments.
          </p>
          <SettlementGroupsEditor
            groups={groups}
            participants={participants}
            onChange={setGroups}
          />
        </AdvancedOptions>
      )}


      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="gap-1.5">
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitting
            ? isEditMode
              ? "Saving..."
              : "Creating..."
            : isEditMode
              ? "Save changes"
              : "Create trip"}
        </Button>
      </div>
    </form>
  );
}
