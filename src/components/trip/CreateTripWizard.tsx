import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ParticipantInput,
  type AccountOption,
} from "@/components/trip/ParticipantInput";
import { SettlementMethodPicker } from "@/components/trip/SettlementMethodPicker";
import { SettlementGroupsEditor } from "@/components/trip/SettlementGroupsEditor";
import { AdvancedOptions } from "@/components/trip/AdvancedOptions";
import { sanitizeParticipantLinks } from "@/lib/participantLinks";
import { sanitizeSettlementGroups } from "@/lib/settlementGroups";
import {
  DEFAULT_SETTLEMENT_METHOD,
  settlementMethodLabel,
} from "@/lib/balances";
import { Loader2 } from "lucide-react";
import type { SettlementGroup, SettlementMethod } from "@/types";

const STEPS = [
  { id: "name", label: "Name" },
  { id: "people", label: "People" },
  { id: "review", label: "Review" },
] as const;

const LAST_STEP = STEPS.length - 1;

export interface CreateTripWizardProps {
  creatorName: string | null;
  creatorUid: string | null;
  accountOptions?: AccountOption[];
  /** First step to show; the app always starts at 0. */
  initialStep?: number;
  onSubmit: (data: {
    name: string;
    participants: string[];
    participantLinks: Record<string, string>;
    settlementMethod: SettlementMethod;
    settlementGroups: SettlementGroup[];
  }) => void | Promise<void>;
  onCancel: () => void;
}

function firstNameOf(displayName: string | null): string {
  return displayName?.trim().split(/\s+/)[0] || "Me";
}

export function CreateTripWizard({
  creatorName,
  creatorUid,
  accountOptions = [],
  initialStep = 0,
  onSubmit,
  onCancel,
}: CreateTripWizardProps) {
  const prefillName = firstNameOf(creatorName);
  const [step, setStep] = useState(initialStep);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [participants, setParticipants] = useState<string[]>([prefillName]);
  const [links, setLinks] = useState<Record<string, string>>(() =>
    creatorUid ? { [prefillName]: creatorUid } : {},
  );
  const [settlementMethod, setSettlementMethod] =
    useState<SettlementMethod>(DEFAULT_SETTLEMENT_METHOD);
  const [groups, setGroups] = useState<SettlementGroup[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Keep groups in sync when participants change (drop removed people)
  useEffect(() => {
    setGroups((prev) => sanitizeSettlementGroups(prev, participants));
  }, [participants]);

  const advancedSummary = `${settlementMethodLabel(settlementMethod)} · ${
    groups.length === 0
      ? "no groups"
      : `${groups.length} group${groups.length === 1 ? "" : "s"}`
  }`;

  function labelForUid(uid: string): string {
    const opt = accountOptions.find((o) => o.uid === uid);
    if (!opt) return "linked";
    return opt.email && opt.label !== opt.email
      ? `${opt.label} (${opt.email})`
      : (opt.email ?? opt.label);
  }

  /** Same validation as TripForm. */
  function validateName(): boolean {
    if (!name.trim()) {
      setNameError("Trip name is required");
      return false;
    }
    setNameError("");
    return true;
  }

  function goNext() {
    if (step === 0 && !validateName()) return;
    setStep((s) => Math.min(s + 1, LAST_STEP));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (step < LAST_STEP) {
      goNext();
      return;
    }
    if (!validateName()) {
      setStep(0);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        participants,
        participantLinks: sanitizeParticipantLinks(participants, links),
        settlementMethod,
        settlementGroups: sanitizeSettlementGroups(groups, participants),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-1.5" aria-label="Create trip steps">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors " +
                (i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted text-muted-foreground")
              }
              aria-current={i === step ? "step" : undefined}
            >
              {i + 1}
            </div>
            <span
              className={
                "text-center text-[10px] leading-tight font-medium " +
                (i === step ? "text-foreground" : "text-muted-foreground")
              }
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {step === 0 && (
        <div className="space-y-2">
          <label
            htmlFor="wizard-trip-name"
            className="text-sm font-medium leading-none"
          >
            Trip name
          </label>
          <Input
            id="wizard-trip-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError("");
            }}
            placeholder="e.g. Bali 2026"
            aria-invalid={!!nameError}
            aria-describedby={nameError ? "wizard-trip-name-error" : undefined}
          />
          {nameError && (
            <p id="wizard-trip-name-error" className="text-sm text-destructive">
              {nameError}
            </p>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          <p className="text-sm font-medium leading-none">
            Who is sharing costs?
          </p>
          <p className="text-xs text-muted-foreground">
            You are already added. Add everyone else, one name at a time.
          </p>
          <ParticipantInput
            participants={participants}
            expenses={[]}
            onChange={setParticipants}
            accountOptions={accountOptions}
            links={links}
            onLinksChange={setLinks}
            editableNames
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-1 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">Trip name</span>
              <span className="truncate font-medium">{name.trim()}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">People</span>
              <span className="truncate font-medium">
                {participants.length === 0
                  ? "Nobody yet"
                  : participants.join(", ")}
              </span>
            </div>
            {participants.some((p) => links[p]) && (
              <p className="text-xs text-muted-foreground">
                {participants
                  .filter((p) => links[p])
                  .map((p) => `${p} · ${labelForUid(links[p])}`)
                  .join(", ")}
              </p>
            )}
          </div>

          <AdvancedOptions summary={advancedSummary}>
            <SettlementMethodPicker
              value={settlementMethod}
              onChange={setSettlementMethod}
              name="wizard-settlement-method"
            />
            <SettlementGroupsEditor
              groups={groups}
              participants={participants}
              onChange={setGroups}
            />
          </AdvancedOptions>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={step === 0 ? onCancel : goBack}
          disabled={submitting}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < LAST_STEP ? (
          <Button
            key="next"
            type="button"
            onClick={(e) => {
              // The click re-renders this button into a submit button while it
              // is still being dispatched; block the default submit action.
              e.preventDefault();
              goNext();
            }}
            disabled={submitting}
          >
            Next
          </Button>
        ) : (
          <Button
            key="submit"
            type="submit"
            disabled={submitting}
            className="gap-1.5"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? "Creating..." : "Create trip"}
          </Button>
        )}
      </div>
    </form>
  );
}
