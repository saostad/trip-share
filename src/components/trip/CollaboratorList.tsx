import { useState } from "react";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CollaboratorListProps {
  collaboratorIds: string[];
}

/**
 * Derives fallback initials from a UID (first 2 characters, uppercased).
 */
function getCollaboratorInitials(uid: string): string {
  return uid.slice(0, 2).toUpperCase();
}

/**
 * Shortens a UID for display (first 8 characters).
 */
function shortenUid(uid: string): string {
  return uid.slice(0, 8);
}

/**
 * Displays a clickable horizontal list of collaborator avatars.
 * Clicking opens a dialog with the full list of collaborator IDs.
 */
export function CollaboratorList({ collaboratorIds }: CollaboratorListProps) {
  const [open, setOpen] = useState(false);

  if (collaboratorIds.length === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted"
        aria-label="View collaborators"
      >
        <Users className="h-4 w-4 text-muted-foreground" />
        <AvatarGroup>
          {collaboratorIds.slice(0, 3).map((uid) => (
            <Avatar key={uid} size="sm">
              <AvatarFallback>{getCollaboratorInitials(uid)}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
        <span className="text-xs text-muted-foreground">
          {collaboratorIds.length}{" "}
          {collaboratorIds.length === 1 ? "collaborator" : "collaborators"}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Collaborators ({collaboratorIds.length})
            </DialogTitle>
          </DialogHeader>
          <ul className="max-h-[400px] space-y-2 overflow-y-auto">
            {collaboratorIds.map((uid) => (
              <li
                key={uid}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Avatar size="default">
                  <AvatarFallback>{getCollaboratorInitials(uid)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    Collaborator
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    ID: {shortenUid(uid)}...
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
