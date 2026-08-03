import type { Trip, UserProfile } from "@/types";
import type { AccountOption } from "@/components/trip/ParticipantInput";
import { participantNameForUid } from "@/lib/participantLinks";

export function buildAccountOptions(
  trip: Trip | null | undefined,
  user: { uid: string; displayName: string | null; email: string | null } | null | undefined,
  members: Record<string, UserProfile>,
): AccountOption[] {
  if (!trip || !user) return [];
  const opts: AccountOption[] = [];
  const seen = new Set<string>();
  const push = (uid: string, label: string, email?: string | null) => {
    if (seen.has(uid)) return;
    seen.add(uid);
    opts.push({ uid, label, email });
  };
  const ownerProfile = members[trip.ownerId];
  push(
    trip.ownerId,
    ownerProfile?.displayName ||
      (user.uid === trip.ownerId ? user.displayName : null) ||
      "Owner",
    ownerProfile?.email ?? (user.uid === trip.ownerId ? user.email : null),
  );
  for (const uid of trip.collaboratorIds ?? []) {
    const p = members[uid];
    push(uid, p?.displayName || p?.email || `User ${uid.slice(0, 6)}`, p?.email);
  }
  return opts;
}

export function linkedParticipantName(
  trip: Trip | null | undefined,
  uid: string | null | undefined,
): string | null {
  return participantNameForUid(trip, uid);
}
