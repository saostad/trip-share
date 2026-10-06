import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CreateTripWizard } from "./CreateTripWizard";
import { TripForm } from "./TripForm";

const ACCOUNT_OPTIONS = [
  { uid: "u1", label: "Ava Example", email: "ava@example.com" },
];

function renderWizard(props?: {
  creatorName?: string | null;
  creatorUid?: string | null;
}) {
  const onSubmit = vi.fn();
  render(
    <CreateTripWizard
      creatorName={
        props?.creatorName === undefined ? "Ava Example" : props.creatorName
      }
      creatorUid={props?.creatorUid === undefined ? "u1" : props.creatorUid}
      accountOptions={ACCOUNT_OPTIONS}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />,
  );
  return { onSubmit };
}

function goToPeople() {
  fireEvent.change(screen.getByLabelText("Trip name"), {
    target: { value: "Bali" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

describe("CreateTripWizard validation", () => {
  it("requires a trip name like TripForm", () => {
    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Trip name is required")).toBeInTheDocument();
    expect(screen.getByLabelText("Trip name")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Trip name"), {
      target: { value: "Bali" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Who is sharing costs?")).toBeInTheDocument();
  });

  it("walks Back and Next through People and Review", () => {
    renderWizard();
    goToPeople();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Bali")).toBeInTheDocument();
    expect(screen.getByText("Ava")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Who is sharing costs?")).toBeInTheDocument();
  });
});

describe("CreateTripWizard prefill", () => {
  it("pre-fills the creator's first name, linked to their account", () => {
    renderWizard();
    goToPeople();
    const rename = screen.getByLabelText("Rename Ava");
    expect(rename).toHaveValue("Ava");
    expect(
      screen.getByText("Ava Example (ava@example.com)"),
    ).toBeInTheDocument();
  });

  it("falls back to Me without a display name", () => {
    renderWizard({ creatorName: null, creatorUid: "u1" });
    goToPeople();
    expect(screen.getByLabelText("Rename Me")).toHaveValue("Me");
  });

  it("renames the prefill and keeps the link", () => {
    renderWizard();
    goToPeople();
    const rename = screen.getByLabelText("Rename Ava");
    fireEvent.change(rename, { target: { value: "Avey" } });
    fireEvent.blur(rename);
    expect(screen.getByLabelText("Rename Avey")).toBeInTheDocument();
    expect(
      screen.getByText("Ava Example (ava@example.com)"),
    ).toBeInTheDocument();
  });

  it("unlinks and removes the prefill", () => {
    renderWizard();
    goToPeople();
    expect(screen.getByRole("combobox").textContent).toContain(
      "Ava Example (ava@example.com)",
    );
    fireEvent.click(screen.getByRole("combobox"));
    const notLinked = screen.getByRole("option", { name: "Not linked" });
    // Base UI commits the option on pointer up, like a real tap.
    fireEvent.pointerDown(notLinked);
    fireEvent.pointerUp(notLinked);
    fireEvent.click(notLinked);
    expect(screen.getByRole("combobox").textContent).toContain("Not linked");

    fireEvent.click(screen.getByRole("button", { name: "Remove Ava" }));
    expect(screen.queryByLabelText("Rename Ava")).not.toBeInTheDocument();
  });
});

describe("CreateTripWizard payload", () => {
  async function submitThroughWizard() {
    const onSubmit = vi.fn();
    const { unmount } = render(
      <CreateTripWizard
        creatorName={null}
        creatorUid={null}
        accountOptions={[]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Trip name"), {
      target: { value: "Bali" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Me" }));
    const input = screen.getByLabelText("Participant name");
    fireEvent.change(input, { target: { value: "Ava" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(input, { target: { value: "Liam" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByText("Advanced options"));
    fireEvent.click(screen.getByRole("radio", { name: /Minimize transactions/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create trip" }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    unmount();
    return payload;
  }

  async function submitThroughTripForm() {
    const onSubmit = vi.fn();
    render(
      <TripForm
        accountOptions={[]}
        showSettlementMethod
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Trip Name"), {
      target: { value: "Bali" },
    });
    const input = screen.getByLabelText("Participant name");
    fireEvent.change(input, { target: { value: "Ava" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(input, { target: { value: "Liam" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByText("Advanced options"));
    fireEvent.click(screen.getByRole("radio", { name: /Minimize transactions/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create Trip" }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    return onSubmit.mock.calls[0][0];
  }

  it("submits the same payload TripForm would for the same inputs", async () => {
    const wizardPayload = await submitThroughWizard();
    const formPayload = await submitThroughTripForm();
    expect(wizardPayload).toEqual(formPayload);
    expect(wizardPayload).toEqual({
      name: "Bali",
      participants: ["Ava", "Liam"],
      participantLinks: {},
      settlementMethod: "minimize",
      settlementGroups: [],
    });
  });

  it("keeps the method and groups hidden until Advanced options opens", () => {
    renderWizard();
    expect(
      screen.queryByText("How payments are suggested"),
    ).not.toBeInTheDocument();
  });

  it("does not submit when Next advances onto Review", () => {
    const onSubmit = vi.fn();
    render(
      <CreateTripWizard
        creatorName="Ava Example"
        creatorUid="u1"
        accountOptions={ACCOUNT_OPTIONS}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Trip name"), {
      target: { value: "Bali" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Advanced options")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create trip" }),
    ).toBeInTheDocument();
  });

  it("starts at a given step when asked", () => {
    render(
      <CreateTripWizard
        creatorName="Ava Example"
        creatorUid="u1"
        accountOptions={ACCOUNT_OPTIONS}
        initialStep={2}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Advanced options")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create trip" }),
    ).toBeInTheDocument();
  });
});
