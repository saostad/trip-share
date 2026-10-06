import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DashboardView } from "./DashboardView";
import { TripPageSkeleton } from "./trip/TripPage";

describe("loading skeletons", () => {
  it("announces dashboard loading as a status", () => {
    render(
      <MemoryRouter>
        <DashboardView
          displayName="Ava Example"
          creatorUid="fake-uid-ava"
          trips={[]}
          loading
          loadError={false}
          canCreateTrips
          accessLoading={false}
          accountOptions={[]}
          onCreateTrip={() => true}
          header={null}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("status", { name: "Loading…" }),
    ).toBeInTheDocument();
  });

  it("announces trip loading as a status", () => {
    render(<TripPageSkeleton />);
    const status = screen.getByRole("status", { name: "Loading…" });
    expect(status).toBeInTheDocument();
    // Header, tab bar, hero, and two cards.
    expect(status.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(9);
  });
});
