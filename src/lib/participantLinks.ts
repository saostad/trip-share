import type { Trip } from "@/types";

/** Participant name linked to this uid, or null if none. */
export function participantNameForUid(
  trip: Pick<Trip, "participantLinks"> | null | undefined,
  uid: string | null | undefined,
): string | null {
  if (!trip?.participantLinks || !uid) return null;
  for (const [name, linkedUid] of Object.entries(trip.participantLinks)) {
    if (linkedUid === uid) return name;
  }
  return null;
}

/** Uid linked to this participant name, or null. */
export function uidForParticipant(
  trip: Pick<Trip, "participantLinks"> | null | undefined,
  name: string,
): string | null {
  return trip?.participantLinks?.[name] ?? null;
}

/**
 * Keep only links for participants that still exist, and ensure each uid
 * is linked to at most one participant.
 */
export function sanitizeParticipantLinks(
  participants: string[],
  links: Record<string, string> | undefined,
): Record<string, string> {
  if (!links) return {};
  const allowed = new Set(participants);
  const usedUids = new Set<string>();
  const out: Record<string, string> = {};

  for (const name of participants) {
    const uid = links[name];
    if (!uid || !allowed.has(name)) continue;
    if (usedUids.has(uid)) continue;
    usedUids.add(uid);
    out[name] = uid;
  }
  return out;
}

/** After removing a collaborator uid, drop any participant link to them. */
export function linksWithoutUid(
  links: Record<string, string> | undefined,
  uid: string,
): Record<string, string> {
  if (!links) return {};
  const out: Record<string, string> = {};
  for (const [name, linked] of Object.entries(links)) {
    if (linked !== uid) out[name] = linked;
  }
  return out;
}
