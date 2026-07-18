import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Users } from "lucide-react";

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
 * Shortens a UID for display (first 6 characters).
 */
function shortenUid(uid: string): string {
  return uid.slice(0, 6);
}

/**
 * Displays a horizontal list of collaborator avatars with fallback initials.
 * Returns null if there are no collaborators.
 */
export function CollaboratorList({ collaboratorIds }: CollaboratorListProps) {
  if (collaboratorIds.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <AvatarGroup>
        {collaboratorIds.map((uid) => (
          <Avatar key={uid} size="sm" title={`Collaborator ${shortenUid(uid)}`}>
            <AvatarFallback>{getCollaboratorInitials(uid)}</AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
      <span className="text-xs text-muted-foreground">
        {collaboratorIds.length}{" "}
        {collaboratorIds.length === 1 ? "collaborator" : "collaborators"}
      </span>
    </div>
  );
}
