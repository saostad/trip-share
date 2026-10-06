import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useTrips } from "@/hooks/useTrips";
import { useAuth } from "@/contexts/AuthContext";
import { previewTrip } from "@/dev/fixtures";
import { TourProvider } from "@/components/tour/TourProvider";
import { TOUR_SEEN_KEY } from "@/components/tour/tourStorage";
import { DashboardPage } from "./DashboardPage";

vi.mock("@/hooks/useTrips", () => ({ useTrips: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));

const mockUseTrips = vi.mocked(useTrips);
const mockUseAuth = vi.mocked(useAuth);

function mockAuth() {
  mockUseAuth.mockReturnValue({
    user: {
      uid: "u1",
      displayName: "Ava",
      email: "ava@example.com",
      photoURL: null,
    },
    loading: false,
    canCreateTrips: true,
    accessLoading: false,
    isAdmin: false,
    adminLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  });
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <TourProvider>
        <DashboardPage />
      </TourProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockAuth();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DashboardPage welcome tour", () => {
  it("shows the tour once on first sign-in", () => {
    mockUseTrips.mockReturnValue({ trips: [], loading: false, error: null });
    const { unmount } = renderDashboard();
    expect(screen.getByText("Create a trip")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    unmount();

    renderDashboard();
    expect(screen.queryByText("Create a trip")).not.toBeInTheDocument();
    expect(localStorage.getItem(TOUR_SEEN_KEY)).toBe("1");
  });

  it("shows the tour when trips already exist", () => {
    mockUseTrips.mockReturnValue({
      trips: [{ trip: previewTrip, role: "owner" }],
      loading: false,
      error: null,
    });
    renderDashboard();
    expect(screen.getByText("Create a trip")).toBeInTheDocument();
  });

  it("does not show the tour while trips are loading", () => {
    mockUseTrips.mockReturnValue({ trips: [], loading: true, error: null });
    renderDashboard();
    expect(screen.queryByText("Create a trip")).not.toBeInTheDocument();
  });

  it("does not show the tour on the invite-only first-run panel", () => {
    mockUseTrips.mockReturnValue({ trips: [], loading: false, error: null });
    mockUseAuth.mockReturnValue({
      ...mockUseAuth.getMockImplementation()!(),
      canCreateTrips: false,
    });
    renderDashboard();
    expect(screen.getByText("Invite-only for new trips")).toBeInTheDocument();
    expect(screen.queryByText("Create a trip")).not.toBeInTheDocument();
  });

  it("does not show the tour when storage fails", () => {
    mockUseTrips.mockReturnValue({ trips: [], loading: false, error: null });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((key: string) => {
      if (key === TOUR_SEEN_KEY) throw new Error("blocked");
      return null;
    });
    renderDashboard();
    expect(screen.queryByText("Create a trip")).not.toBeInTheDocument();
  });

  it("auto-opens at most once per load when writes fail", () => {
    mockUseTrips.mockReturnValue({ trips: [], loading: false, error: null });
    const realSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(
      (key: string, value: string) => {
        if (key === TOUR_SEEN_KEY) throw new Error("blocked");
        realSetItem.call(localStorage, key, value);
      },
    );
    function Shell({ show }: { show: boolean }) {
      return (
        <MemoryRouter>
          <TourProvider>{show ? <DashboardPage /> : null}</TourProvider>
        </MemoryRouter>
      );
    }
    const { rerender } = render(<Shell show />);
    expect(screen.getByText("Create a trip")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    rerender(<Shell show={false} />);
    rerender(<Shell show />);
    expect(screen.queryByText("Create a trip")).not.toBeInTheDocument();
    expect(localStorage.getItem(TOUR_SEEN_KEY)).toBeNull();
  });
});
