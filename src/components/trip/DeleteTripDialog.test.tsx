import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DeleteTripDialog } from "./DeleteTripDialog";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter>
      <button type="button" onClick={() => setOpen(true)}>
        Open delete
      </button>
      <DeleteTripDialog
        tripId="t1"
        tripName="Beach trip"
        open={open}
        onOpenChange={setOpen}
      />
    </MemoryRouter>
  );
}

describe("DeleteTripDialog focus", () => {
  it("moves focus into the dialog on open and returns it on cancel", async () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open delete" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("alertdialog");
    await waitFor(() =>
      expect(dialog).toContainElement(
        document.activeElement as HTMLElement,
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("announces the trip name in the description", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open delete" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveAccessibleDescription(/Beach trip/);
  });
});
