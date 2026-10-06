import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "@/App";
import { useAuth } from "@/contexts/AuthContext";
import { HowItWorksPage } from "./HowItWorksPage";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));

const mockUseAuth = vi.mocked(useAuth);

function signedOut() {
  mockUseAuth.mockReturnValue({
    user: null,
    loading: false,
    canCreateTrips: false,
    accessLoading: false,
    isAdmin: false,
    adminLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
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

describe("HowItWorksPage signed out", () => {
  it("shows the minimal bar with a Sign in link", () => {
    signedOut();
    render(
      <MemoryRouter>
        <HowItWorksPage />
      </MemoryRouter>,
    );
    const signIn = screen.getByRole("link", { name: "Sign in" });
    expect(signIn).toHaveAttribute("href", "/login");
    expect(
      screen.queryByRole("button", { name: "User menu" }),
    ).not.toBeInTheDocument();
  });

  it("shows the hero, 4 steps, FAQ and video link", () => {
    signedOut();
    render(
      <MemoryRouter>
        <HowItWorksPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText("Split trip costs without the awkward math"),
    ).toBeInTheDocument();
    for (const step of [
      "Create a trip and add people",
      "Add expenses as you go",
      "See who owes whom",
      "Settle up with fewer payments",
    ]) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }
    expect(screen.getByText('What\u2019s a "fair share"?')).toBeInTheDocument();
    expect(
      screen.getByText("Why are there fewer payments than expenses?"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Watch a 3-minute video" }),
    ).toBeInTheDocument();
  });
});

describe("HowItWorksPage signed in", () => {
  it("shows the normal header with the user menu", () => {
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
    render(
      <MemoryRouter>
        <HowItWorksPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("button", { name: "User menu" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
  });
});

describe("/how-it-works route", () => {
  it("renders without auth", async () => {
    signedOut();
    window.history.pushState({}, "", "/how-it-works");
    render(<App />);
    expect(
      await screen.findByText("Split trip costs without the awkward math"),
    ).toBeInTheDocument();
  });
});
