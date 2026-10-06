import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "./LoginPage";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));

const mockUseAuth = vi.mocked(useAuth);

beforeEach(() => {
  vi.clearAllMocks();
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
});

describe("LoginPage", () => {
  it("links to How it works", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "See how it works" });
    expect(link).toHaveAttribute("href", "/how-it-works");
  });
});
