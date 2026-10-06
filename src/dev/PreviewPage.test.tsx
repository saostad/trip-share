import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { PreviewPage } from "./PreviewPage";

function renderSection(section: string) {
  return render(
    <MemoryRouter initialEntries={[`/dev/preview?section=${section}`]}>
      <PreviewPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
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

describe("preview settled section", () => {
  it("settles, then replays confetti after clearing the key", async () => {
    renderSection("settled");
    expect(
      screen.queryByText("All settled! 🎉"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Simulate settling" }),
    );
    expect(screen.getByText("All settled! 🎉")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Replay confetti" }));
    expect(await screen.findByText("All settled! 🎉")).toBeInTheDocument();
  });
});

describe("preview skeletons section", () => {
  it("shows dashboard and trip loading states", () => {
    renderSection("skeletons");
    const statuses = screen.getAllByRole("status", { name: "Loading…" });
    expect(statuses.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Trip page" })).toBeInTheDocument();
  });
});

describe("preview motion section", () => {
  it("adds and removes a fake row with a highlight", async () => {
    const { container } = renderSection("motion");
    fireEvent.click(screen.getByRole("button", { name: "Add a row" }));
    const added = await screen.findByText(/Fake pastries/);
    expect(added).toBeInTheDocument();
    await waitFor(() =>
      expect(
        container.querySelector('[data-highlight="true"]'),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove a row" }));
    await waitFor(() =>
      expect(screen.queryByText(/Fake pastries/)).not.toBeInTheDocument(),
    );
  });

  it("changes the hero amount", async () => {
    const { container } = renderSection("motion");
    const animated = container.querySelector(
      ".text-4xl span[aria-hidden=\"true\"]",
    );
    await waitFor(() => expect(animated).toHaveTextContent("$128.50"), {
      timeout: 3000,
    });
    fireEvent.click(screen.getByRole("button", { name: "Add $42.75" }));
    await waitFor(() => expect(animated).toHaveTextContent("$171.25"), {
      timeout: 3000,
    });
  });
});
