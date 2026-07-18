import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ParticipantInput } from "@/components/trip/ParticipantInput";
import type { Trip, Expense } from "@/types";

interface TripFormProps {
  trip?: Trip;
  expenses?: Expense[];
  onSubmit: (data: { name: string; participants: string[] }) => void;
  onCancel: () => void;
}

export function TripForm({ trip, expenses = [], onSubmit, onCancel }: TripFormProps) {
  const [name, setName] = useState(trip?.name ?? "");
  const [participants, setParticipants] = useState<string[]>(
    trip?.participants ?? []
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
    onSubmit({ name: trimmedName, participants });
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
