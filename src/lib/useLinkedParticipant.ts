import type { Trip, UserProfile } from "@/types";
import type { AccountOption } from "@/components/trip/ParticipantInput";
import { participantNameForUid } from "@/lib/participantLinks";

function profileLabel(
  profile: UserProfile | undefined,
  fallback: string,
): { label: string; email: string | null } {
  const email = profile?.email ?? null;
  const name = profile?.displayName?.trim() || null;
  if (name && email) return { label: name, email };
  if (name) return { label: name, email: null };
  if (email) return { label: email, email };
  return { label: fallback, email: null };
}

export function buildAccountOptions(
  trip: Trip | null | undefined,
  user:
    | { uid: string; displayName: string | null; email: string | null }
    | null
    | undefined,
  members: Record<string, UserProfile>,
): AccountOption[] {
  if (!trip || !user) return [];
  const opts: AccountOption[] = [];
  const seen = new Set<string>();

  const push = (uid: string, label: string, email?: string | null) => {
    if (!uid || seen.has(uid)) return;
    seen.add(uid);
    opts.push({ uid, label, email: email ?? null });
  };

  // Owner
  const ownerProfile = members[trip.ownerId];
  if (user.uid === trip.ownerId) {
    const { label, email } = profileLabel(
      {
        uid: user.uid,
        displayName: user.displayName ?? ownerProfile?.displayName ?? null,
        email: user.email ?? ownerProfile?.email ?? null,
        photoURL: ownerProfile?.photoURL ?? null,
      },
      "Me (owner)",
    );
    push(trip.ownerId, label, email);
  } else {
    const { label, email } = profileLabel(ownerProfile, "Owner");
    push(trip.ownerId, label, email);
  }

  // Collaborators
  for (const uid of trip.collaboratorIds ?? []) {
    const p = members[uid];
    const { label, email } = profileLabel(
      p,
      `User ${uid.slice(0, 6)}…`,
    );
    push(uid, label, email);
  }

  // Include any already-linked uids missing from members/collaborators
  // so the dropdown can still show a readable option when possible.
  for (const uid of Object.values(trip.participantLinks ?? {})) {
    if (seen.has(uid)) continue;
    const p = members[uid];
    const { label, email } = profileLabel(p, `User ${uid.slice(0, 6)}…`);
    push(uid, label, email);
  }

  return opts;
}

export function linkedParticipantName(
  trip: Trip | null | undefined,
  uid: string | null | undefined,
): string | null {
  return participantNameForUid(trip, uid);
}
