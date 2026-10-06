import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupsExplainer } from "@/components/trip/settlementExplainers";
import { newSettlementGroupId } from "@/lib/settlementGroups";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { SettlementGroup } from "@/types";

export interface SettlementGroupsEditorProps {
  groups: SettlementGroup[];
  participants: string[];
  onChange: (groups: SettlementGroup[]) => void;
}

/**
 * The "Pay as a group" editor, shared by the create wizard and Edit trip.
 * Controlled: parents own the groups and sanitize them when participants
 * change; this component only edits through onChange.
 */
export function SettlementGroupsEditor({
  groups,
  participants,
  onChange,
}: SettlementGroupsEditorProps) {
  const [open, setOpen] = useState(false);

  function addGroup() {
    const available = participants.filter(
      (p) => !groups.some((g) => g.members.includes(p)),
    );
    const first = available[0] ?? participants[0];
    if (!first) return;
    onChange([
      ...groups,
      {
        id: newSettlementGroupId(),
        name: "Family",
        members: [first],
        representative: first,
      },
    ]);
    setOpen(true);
  }

  function updateGroup(id: string, patch: Partial<SettlementGroup>) {
    onChange(
      groups.map((g) => {
        if (g.id !== id) return g;
        const next = { ...g, ...patch };
        // Ensure representative stays in members
        if (patch.members && !patch.members.includes(next.representative)) {
          next.representative = patch.members[0] ?? next.representative;
        }
        return next;
      }),
    );
  }

  function toggleMember(groupId: string, person: string, checked: boolean) {
    onChange(
      groups.map((g) => {
        if (g.id !== groupId) {
          // A person may only belong to one group
          if (checked && g.members.includes(person)) {
            const members = g.members.filter((m) => m !== person);
            return {
              ...g,
              members,
              representative: members.includes(g.representative)
                ? g.representative
                : members[0] ?? g.representative,
            };
          }
          return g;
        }
        const members = checked
          ? [...g.members, person]
          : g.members.filter((m) => m !== person);
        return {
          ...g,
          members,
          representative: members.includes(g.representative)
            ? g.representative
            : members[0] ?? g.representative,
        };
      }),
    );
  }

  function removeGroup(id: string) {
    onChange(groups.filter((g) => g.id !== id));
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-1 px-3 py-2.5 hover:bg-muted/40">
        <button
          type="button"
          className="flex w-full min-w-0 items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm font-medium">
            Pay as a group (families, couples)
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {groups.length === 0
              ? "optional · family / shared wallet"
              : `${groups.length} group${groups.length === 1 ? "" : "s"}`}
          </span>
        </button>
        <GroupsExplainer />
      </div>

      {open && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <p className="text-xs text-muted-foreground">
            Group family or household members so they settle as one unit.
            Expenses stay individual; only Settle up collapses them onto the
            representative.
          </p>

          {groups.map((g) => (
            <div
              key={g.id}
              className="space-y-2 rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={g.name}
                  onChange={(e) => updateGroup(g.id, { name: e.target.value })}
                  placeholder="Group name (e.g. Family)"
                  className="h-8 flex-1"
                  aria-label="Group name"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeGroup(g.id)}
                  aria-label="Remove group"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Members
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {participants.map((p) => {
                    const checked = g.members.includes(p);
                    const inOther = groups.some(
                      (og) => og.id !== g.id && og.members.includes(p),
                    );
                    return (
                      <label
                        key={p}
                        className={`flex items-center gap-1.5 text-sm ${
                          inOther && !checked ? "opacity-40" : ""
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={inOther && !checked}
                          onCheckedChange={(val) =>
                            toggleMember(g.id, p, val === true)
                          }
                        />
                        <span className="truncate">{p}</span>
                      </label>
                    );
                  })}
                  {participants.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      Add participants first
                    </span>
                  )}
                </div>
              </div>

              {g.members.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Representative (appears in Settle up)
                  </p>
                  <Select
                    value={g.representative}
                    onValueChange={(val) => {
                      const v =
                        typeof val === "string"
                          ? val
                          : (val as { value?: string } | null)?.value;
                      if (v) updateGroup(g.id, { representative: v });
                    }}
                  >
                    <SelectTrigger className="h-8 w-full">
                      <span className="truncate text-left">
                        {g.representative}
                      </span>
                      <SelectValue className="sr-only" />
                    </SelectTrigger>
                    <SelectContent>
                      {g.members.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={addGroup}
            disabled={participants.length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            Add group
          </Button>
        </div>
      )}
    </div>
  );
}
