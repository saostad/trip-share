import type { Trip, TripRole } from "@/types";

export interface AnnotatedTrip {
  trip: Trip;
  role: TripRole;
}

/**
 * Filters trips to only those accessible by the given user UID,
 * and annotates each with the user's role (owner or collaborator).
 */
export function filterTripsForUser(uid: string, trips: Trip[]): AnnotatedTrip[] {
  const result: AnnotatedTrip[] = [];

  for (const trip of trips) {
    if (trip.ownerId === uid) {
      result.push({ trip, role: "owner" });
    } else if (trip.collaboratorIds.includes(uid)) {
      result.push({ trip, role: "collaborator" });
    }
  }

  return result;
}
