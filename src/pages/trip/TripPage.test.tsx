import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "@/App";
import { useTrip } from "@/hooks/useTrip";
import { useExpenses } from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";
import { useMembers } from "@/hooks/useMembers";
import { useAuth } from "@/contexts/AuthContext";
import {
  previewExpenses,
  previewPayments,
  previewTrip,
} from "@/dev/fixtures";
import type { Trip } from "@/types";

vi.mock("@/hooks/useTrip", () => ({ useTrip: vi.fn() }));
vi.mock("@/hooks/useExpenses", () => ({ useExpenses: vi.fn() }));
vi.mock("@/hooks/usePayments", () => ({ usePayments: vi.fn() }));
vi.mock("@/hooks/useMembers", () => ({ useMembers: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("sonner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("sonner")>();
  return {
    ...actual,
    toast: { success: vi.fn(), error: vi.fn() },
  };
});

const mockUseTrip = vi.mocked(useTrip);
const mockUseExpenses = vi.mocked(useExpenses);
const mockUsePayments = vi.mocked(usePayments);
const mockUseMembers = vi.mocked(useMembers);
const mockUseAuth = vi.mocked(useAuth);

function mockTripData(trip: Trip) {
  mockUseTrip.mockReturnValue({ trip, loading: false, error: null });
  mockUseExpenses.mockReturnValue({ expenses: previewExpenses, loading: false, error: null });
  mockUsePayments.mockReturnValue({ payments: previewPayments, loading: false, error: null });
  mockUseMembers.mockReturnValue({ members: {}, loading: false });
  mockUseAuth.mockReturnValue({
    user: {
      uid: "fake-uid-ava",
      displayName: "Ava Example",
      email: "ava@example.com",
      photoURL: null,
    },
    loading: false,
    canCreateTrips: true,
    accessLoading: false,
    isAdmin: false,
    adminLoading: false,
    signOut: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
}

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("theme", "light");
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

describe("trip routes", () => {
  it.each([
    ["/trip/preview-trip-1", /gets back/],
    ["/trip/preview-trip-1/expenses", /9 expenses/],
    ["/trip/preview-trip-1/settle", /Suggested payments/],
    ["/trip/preview-trip-1/people", /Participants/],
  ])("renders the right tab for %s", async (path, pattern) => {
    mockTripData(previewTrip);
    renderAt(path);
    expect(await screen.findByText(pattern)).toBeInTheDocument();
  });

  it("redirects unknown children to the index", async () => {
    mockTripData(previewTrip);
    renderAt("/trip/preview-trip-1/bogus");
    expect(await screen.findByText(/gets back/)).toBeInTheDocument();
  });

  it("marks only the active tab with aria-current", async () => {
    mockTripData(previewTrip);
    renderAt("/trip/preview-trip-1/expenses");
    const expensesLinks = await screen.findAllByRole("link", { name: "Expenses" });
    expect(expensesLinks.length).toBeGreaterThan(0);
    for (const link of expensesLinks) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
    const overviewLinks = screen.getAllByRole("link", { name: "Overview" });
    for (const link of overviewLinks) {
      expect(link).not.toHaveAttribute("aria-current", "page");
    }
  });
});

describe("archived gating", () => {
  const archivedTrip = { ...previewTrip, archived: true };

  it("hides every Add expense entry on overview", async () => {
    mockTripData(archivedTrip);
    renderAt("/trip/preview-trip-1");
    await screen.findByText("Recent activity");
    expect(screen.queryByText("Add expense")).not.toBeInTheDocument();
  });

  it("hides the desktop Add button on expenses", async () => {
    mockTripData(archivedTrip);
    renderAt("/trip/preview-trip-1/expenses");
    await screen.findByText(/9 expenses/);
    expect(screen.queryByText("Add expense")).not.toBeInTheDocument();
  });

  it("hides Mark as paid and Record payment on settle", async () => {
    mockTripData(archivedTrip);
    renderAt("/trip/preview-trip-1/settle");
    await screen.findByText("Suggested payments");
    expect(screen.queryByText("Mark as paid")).not.toBeInTheDocument();
    expect(screen.queryByText("Record a payment")).not.toBeInTheDocument();
  });
});
