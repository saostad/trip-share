import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from "@/components/ui/avatar";
import { Users, UserMinus, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { doc, updateDoc, arrayRemove, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { linksWithoutUid, participantNameForUid } from "@/lib/participantLinks";
import type { Trip, UserProfile } from "@/types";

interface CollaboratorListProps {
  tripId: string;
  collaboratorIds: string[];
  members?: Record<string, UserProfile>;
  isOwner?: boolean;
  trip?: Trip | null;
}

function getInitials(profile: UserProfile | undefined, uid: string): string {
  if (profile?.displayName) {
    return profile.displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return uid.slice(0, 2).toUpperCase();
}

function getDisplayName(profile: UserProfile | undefined, uid: string): string {
  if (profile?.displayName) return profile.displayName;
  if (profile?.email) return profile.email;
  return `User ${uid.slice(0, 6)}`;
}

export function CollaboratorList({
  tripId,
  collaboratorIds,
  members = {},
  isOwner = false,
  trip = null,
}: CollaboratorListProps) {
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  if (collaboratorIds.length === 0) {
    return null;
  }

  async function handleRemove(uid: string) {
    setRemoving(uid);
    try {
      await updateDoc(doc(db, "trips", tripId), {
        collaboratorIds: arrayRemove(uid),
        participantLinks: linksWithoutUid(trip?.participantLinks, uid),
      });
      await deleteDoc(doc(db, "trips", tripId, "members", uid));
      toast.success("Collaborator removed");
    } catch {
      toast.error("Failed to remove collaborator");
    } finally {
      setRemoving(null);
    }
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
          {collaboratorIds.slice(0, 3).map((uid) => {
            const profile = members[uid];
            return (
              <Avatar key={uid} size="sm">
                {profile?.photoURL && (
                  <AvatarImage src={profile.photoURL} alt={getDisplayName(profile, uid)} />
                )}
                <AvatarFallback>{getInitials(profile, uid)}</AvatarFallback>
              </Avatar>
            );
          })}
        </AvatarGroup>
        <span className="text-xs text-muted-foreground">
          {collaboratorIds.length}{" "}
          {collaboratorIds.length === 1 ? "collaborator" : "collaborators"}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collaborators ({collaboratorIds.length})</DialogTitle>
          </DialogHeader>
          <ul className="max-h-[400px] space-y-2 overflow-y-auto">
            {collaboratorIds.map((uid) => {
              const profile = members[uid];
              const linkedAs = participantNameForUid(trip, uid);
              return (
                <li
                  key={uid}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Avatar size="default">
                    {profile?.photoURL && (
                      <AvatarImage
                        src={profile.photoURL}
                        alt={getDisplayName(profile, uid)}
                      />
                    )}
                    <AvatarFallback>{getInitials(profile, uid)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {getDisplayName(profile, uid)}
                    </p>
                    {profile?.email && (
                      <p className="truncate text-xs text-muted-foreground">
                        {profile.email}
                      </p>
                    )}
                    {linkedAs ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-primary">
                        <Link2 className="h-3 w-3" />
                        Linked as participant “{linkedAs}”
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Not linked to a participant name
                      </p>
                    )}
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemove(uid)}
                      disabled={removing === uid}
                      aria-label={`Remove ${getDisplayName(profile, uid)}`}
                      className="shrink-0 text-destructive hover:bg-destructive/10"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {isOwner && (
            <p className="text-xs text-muted-foreground">
              Link accounts to participant names in Edit Trip.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
