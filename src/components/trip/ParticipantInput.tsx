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
import { X, ShieldAlert, Link2 } from "lucide-react";
import { getRemovableParticipants } from "@/lib/participants";
import type { Expense, UserProfile } from "@/types";

export interface AccountOption {
  uid: string;
  label: string;
  email?: string | null;
}

interface ParticipantInputProps {
  participants: string[];
  expenses: Expense[];
  onChange: (participants: string[]) => void;
  /** Optional: link each participant name to a signed-in account */
  accountOptions?: AccountOption[];
  links?: Record<string, string>;
  onLinksChange?: (links: Record<string, string>) => void;
  members?: Record<string, UserProfile>;
}

export function ParticipantInput({
  participants,
  expenses,
  onChange,
  accountOptions = [],
  links = {},
  onLinksChange,
}: ParticipantInputProps) {
  const [inputValue, setInputValue] = useState("");

  const { removable } = getRemovableParticipants(participants, expenses);
  const removableSet = new Set(removable);
  const canLink = accountOptions.length > 0 && !!onLinksChange;

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
    if (onLinksChange && links[name]) {
      const next = { ...links };
      delete next[name];
      onLinksChange(next);
    }
  }

  function setLink(name: string, uid: string | null) {
    if (!onLinksChange) return;
    const next = { ...links };
    // Drop this uid from any other participant (1:1)
    if (uid) {
      for (const [n, u] of Object.entries(next)) {
        if (u === uid && n !== name) delete next[n];
      }
      next[name] = uid;
    } else {
      delete next[name];
    }
    onLinksChange(next);
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

      {canLink && (
        <p className="text-xs text-muted-foreground">
          Optionally link a name to a collaborator account (for defaults and future notifications).
        </p>
      )}

      {participants.length > 0 && (
        <ul className="space-y-2" aria-label="Participants list">
          {participants.map((name) => {
            const isRemovable = removableSet.has(name);
            const linkedUid = links[name] ?? "";
            return (
              <li
                key={name}
                className="flex flex-col gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center justify-between gap-2 sm:flex-1">
                  <span className="truncate font-medium">{name}</span>
                  {isRemovable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemove(name)}
                      aria-label={`Remove ${name}`}
                      className="shrink-0"
                    >
                      <X className="size-3.5" />
                    </Button>
                  ) : (
                    <span
                      className="relative inline-flex shrink-0"
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
                </div>

                {canLink && (
                  <div className="flex min-w-0 items-center gap-1.5 sm:w-56">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <Select
                      value={linkedUid || "__none__"}
                      onValueChange={(val) =>
                        setLink(name, !val || val === "__none__" ? null : val)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Not linked" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Not linked</SelectItem>
                        {accountOptions.map((opt) => (
                          <SelectItem key={opt.uid} value={opt.uid}>
                            {opt.label}
                            {opt.email ? ` (${opt.email})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
