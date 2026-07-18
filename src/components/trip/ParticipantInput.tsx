import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, ShieldAlert } from "lucide-react";
import { getRemovableParticipants } from "@/lib/participants";
import type { Expense } from "@/types";

interface ParticipantInputProps {
  participants: string[];
  expenses: Expense[];
  onChange: (participants: string[]) => void;
}

export function ParticipantInput({
  participants,
  expenses,
  onChange,
}: ParticipantInputProps) {
  const [inputValue, setInputValue] = useState("");

  const { removable } = getRemovableParticipants(participants, expenses);
  const removableSet = new Set(removable);

  function handleAdd() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (participants.includes(trimmed)) return;
    onChange([...participants, trimmed]);
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  function handleRemove(name: string) {
    onChange(participants.filter((p) => p !== name));
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add participant name"
          aria-label="Participant name"
        />
        <Button type="button" onClick={handleAdd} size="default">
          Add
        </Button>
      </div>

      {participants.length > 0 && (
        <ul className="space-y-1" aria-label="Participants list">
          {participants.map((name) => {
            const isRemovable = removableSet.has(name);
            return (
              <li
                key={name}
                className="flex items-center justify-between rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
              >
                <span>{name}</span>
                {isRemovable ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleRemove(name)}
                    aria-label={`Remove ${name}`}
                  >
                    <X className="size-3.5" />
                  </Button>
                ) : (
                  <span
                    className="relative inline-flex"
                    title="Cannot remove: referenced in expenses"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled
                      aria-label={`Cannot remove ${name}: referenced in expenses`}
                    >
                      <ShieldAlert className="size-3.5 text-muted-foreground" />
                    </Button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
