import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ParticipantInput,
  type AccountOption,
} from "@/components/trip/ParticipantInput";
import { sanitizeParticipantLinks } from "@/lib/participantLinks";
import type { Trip, Expense } from "@/types";

interface TripFormProps {
  trip?: Trip;
  expenses?: Expense[];
  accountOptions?: AccountOption[];
  onSubmit: (data: {
    name: string;
    participants: string[];
    participantLinks: Record<string, string>;
  }) => void;
  onCancel: () => void;
}

export function TripForm({
  trip,
  expenses = [],
  accountOptions = [],
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
