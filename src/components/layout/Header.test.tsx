import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { HeaderView, type HeaderViewProps } from "./Header";

function baseProps(overrides: Partial<HeaderViewProps> = {}): HeaderViewProps {
  return {
    user: {
      displayName: "Ava Example",
      email: "ava@example.com",
      photoURL: null,
    },
    isAdmin: false,
    theme: "light",
    buildCommit: "abc1234",
    buildTime: "2026-10-06T12:00:00.000Z",
    onToggleTheme: vi.fn(),
    onSignOut: vi.fn(),
    ...overrides,
  };
}

function renderHeader(props: HeaderViewProps) {
  return render(
    <MemoryRouter>
      <HeaderView {...props} />
    </MemoryRouter>,
  );
}

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "User menu" }));
}

describe("HeaderView", () => {
  it("shows Admin only for admins", () => {
    const { unmount } = renderHeader(baseProps({ isAdmin: true }));
    openMenu();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    unmount();

    renderHeader(baseProps({ isAdmin: false }));
    openMenu();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("links the Help button to How it works", () => {
    renderHeader(baseProps());
    const help = screen.getByRole("link", { name: "How it works" });
    expect(help).toHaveAttribute("href", "/how-it-works");
  });

  it("has a How it works menu item", () => {
    renderHeader(baseProps());
    openMenu();
    expect(
      screen.getByRole("menuitem", { name: "How it works" }),
    ).toBeInTheDocument();
  });

  it("shows Replay welcome tour only with a handler", () => {
    const props = baseProps({ onReplayTour: vi.fn() });
    const { unmount } = renderHeader(props);
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Replay welcome tour" }));
    expect(props.onReplayTour).toHaveBeenCalledTimes(1);
    unmount();

    renderHeader(baseProps({ onReplayTour: undefined }));
    openMenu();
    expect(
      screen.queryByRole("menuitem", { name: "Replay welcome tour" }),
    ).not.toBeInTheDocument();
  });

  it("calls onSignOut when Sign out is clicked", () => {
    const props = baseProps();
    renderHeader(props);
    openMenu();
    fireEvent.click(screen.getByText("Sign out"));
    expect(props.onSignOut).toHaveBeenCalledTimes(1);
  });

  it("shows the version text", () => {
    renderHeader(baseProps());
    openMenu();
    expect(screen.getByText(/Version abc1234 · /)).toBeInTheDocument();
  });

  it("calls onToggleTheme when the theme item is clicked", () => {
    const props = baseProps({ theme: "light" });
    renderHeader(props);
    openMenu();
    fireEvent.click(screen.getByText("Dark mode"));
    expect(props.onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it("opens with the keyboard and closes with Escape", () => {
    renderHeader(baseProps());
    const trigger = screen.getByRole("button", { name: "User menu" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(screen.queryByText("Sign out")).not.toBeInTheDocument();

    // The trigger is a native button, so Enter/Space activate it in browsers.
    // jsdom doesn't synthesize click from keyboard, so fire the key event
    // followed by the click the browser would produce.
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter" });
    fireEvent.click(trigger);
    expect(screen.getByText("Sign out")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
  });
});
