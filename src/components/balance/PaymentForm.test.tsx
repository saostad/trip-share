import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { format } from "date-fns";
import { PaymentForm } from "./PaymentForm";

const PARTICIPANTS = ["Ava", "Liam", "Maya"];

describe("PaymentForm prefill", () => {
  it("pre-fills from, to and amount as a 2-decimal string", () => {
    render(
      <PaymentForm
        participants={PARTICIPANTS}
        prefill={{ from: "Liam", to: "Ava", amount: 12.4 }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Total Amount")).toHaveValue(12.4);
    expect(
      (screen.getByLabelText("Total Amount") as HTMLInputElement).value,
    ).toBe("12.40");
  });

  it("submits the pre-filled transfer with today's date", async () => {
    const onSubmit = vi.fn();
    render(
      <PaymentForm
        participants={PARTICIPANTS}
        prefill={{ from: "Liam", to: "Ava", amount: 12.4 }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Record a payment"));
    await screen.findByText("Record a payment");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith([
      {
        from: "Liam",
        to: "Ava",
        amount: 12.4,
        date: format(new Date(), "yyyy-MM-dd"),
        note: "",
        attachment: null,
      },
    ]);
  });
});
