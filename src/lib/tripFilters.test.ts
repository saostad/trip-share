import { describe, it, expect } from "vitest";
import { filterTripsForUser } from "./tripFilters";
import type { Trip } from "@/types";
import { Timestamp } from "firebase/firestore";

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    ownerId: "owner-uid",
    name: "Test Trip",
    participants: ["Alice", "Bob"],
    collaboratorIds: [],
    shareToken: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

describe("filterTripsForUser", () => {
  it("returns trips where user is the owner with role 'owner'", () => {
    const trips = [makeTrip({ id: "t1", ownerId: "user-1" })];
    const result = filterTripsForUser("user-1", trips);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("owner");
    expect(result[0].trip.id).toBe("t1");
  });

  it("returns trips where user is a collaborator with role 'collaborator'", () => {
    const trips = [makeTrip({ id: "t2", ownerId: "other", collaboratorIds: ["user-1"] })];
    const result = filterTripsForUser("user-1", trips);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("collaborator");
    expect(result[0].trip.id).toBe("t2");
  });

  it("excludes trips where user is neither owner nor collaborator", () => {
    const trips = [makeTrip({ id: "t3", ownerId: "other", collaboratorIds: ["someone-else"] })];
    const result = filterTripsForUser("user-1", trips);

    expect(result).toHaveLength(0);
  });

  it("handles mix of owned, collaborated, and unrelated trips", () => {
    const trips = [
      makeTrip({ id: "owned", ownerId: "user-1" }),
      makeTrip({ id: "collab", ownerId: "other", collaboratorIds: ["user-1"] }),
      makeTrip({ id: "unrelated", ownerId: "other", collaboratorIds: [] }),
    ];
    const result = filterTripsForUser("user-1", trips);

    expect(result).toHaveLength(2);
    expect(result.find((r) => r.trip.id === "owned")?.role).toBe("owner");
    expect(result.find((r) => r.trip.id === "collab")?.role).toBe("collaborator");
  });

  it("returns empty array when trips is empty", () => {
    const result = filterTripsForUser("user-1", []);
    expect(result).toHaveLength(0);
  });

  it("prioritizes owner role when user is both owner and in collaboratorIds", () => {
    const trips = [makeTrip({ id: "t4", ownerId: "user-1", collaboratorIds: ["user-1"] })];
    const result = filterTripsForUser("user-1", trips);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("owner");
  });
});
