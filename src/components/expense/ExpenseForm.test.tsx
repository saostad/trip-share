import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { ExpenseForm } from "./ExpenseForm";
import * as FileUploadModule from "@/components/ui/FileUpload";
import { extractReceipt, type ExtractReceiptResponse } from "@/lib/aiApi";
import { fetchAutofillEnabled } from "@/lib/aiSettings";
import { fileToReceiptImage } from "@/lib/receiptImage";
import type { Expense } from "@/types";

vi.mock("@/components/ui/FileUpload", () => {
  let startOnChange: ((file: unknown) => void) | null = null;
  const attachment = { name: "receipt.jpg", url: "http://x/y", path: "p", type: "image/jpeg" };
  return {
    FileUpload: ({
      onChange,
      onFileSelected,
    }: {
      onChange: (file: unknown) => void;
      onFileSelected?: (file: File) => void;
    }) => {
      // Only the start-screen uploader passes onFileSelected.
      if (onFileSelected) startOnChange = onChange;
      return (
        <div>
      <button
        type="button"
        onClick={() =>
          onFileSelected?.(new File(["img"], "receipt.jpg", { type: "image/jpeg" }))
        }
      >
        mock-pick-photo
      </button>
      <button
        type="button"
        onClick={() => onFileSelected?.(new File(["pdf"], "doc.pdf", { type: "application/pdf" }))}
      >
        mock-pick-pdf
      </button>
      <button type="button" onClick={() => onChange(attachment)}>
        mock-uploaded
      </button>
      <button type="button" onClick={() => onChange(null)}>
        mock-remove
      </button>
        </div>
      );
    },
    /** Simulates the start-screen upload finishing after its UI unmounted. */
    __lateStartUpload: () => startOnChange?.(attachment),
  };
});

vi.mock("@/lib/aiApi", () => ({
  extractReceipt: vi.fn(),
}));

vi.mock("@/lib/aiSettings", () => ({
  fetchAutofillEnabled: vi.fn(),
}));

vi.mock("@/lib/receiptImage", () => ({
  fileToReceiptImage: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const FULL_RESULT: ExtractReceiptResponse = {
  fields: {
    description: "Lunch",
    category: "food",
    date: "2026-10-05",
    amount: 12.5,
    currency: "USD",
  },
  missing: ["currency"],
};

function renderForm(expense?: Expense) {
  return render(
    <ExpenseForm
      expense={expense}
      participants={["Ada", "Bo"]}
      tripId="trip1"
      onSubmit={vi.fn()}
    />,
  );
}

function pickPhoto() {
  fireEvent.click(screen.getByRole("button", { name: "mock-pick-photo" }));
}

function uploaded() {
  fireEvent.click(screen.getByRole("button", { name: "mock-uploaded" }));
}

function next() {
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchAutofillEnabled).mockResolvedValue(true);
  vi.mocked(fileToReceiptImage).mockResolvedValue({ mimeType: "image/jpeg", base64: "AAA" });
  vi.mocked(extractReceipt).mockResolvedValue(FULL_RESULT);
});

describe("ExpenseForm auto-fill", () => {
  it("fills the fields and lists them after reading", async () => {
    const gate = deferred<ExtractReceiptResponse>();
    vi.mocked(extractReceipt).mockReturnValue(gate.promise);
    renderForm();
    expect(fetchAutofillEnabled).toHaveBeenCalledTimes(1);
    pickPhoto();
    uploaded();
    expect(await screen.findByText("Reading receipt…")).toBeInTheDocument();
    await act(async () => {
      gate.resolve(FULL_RESULT);
    });
    expect(
      await screen.findByText("Filled from receipt: amount, category, date, description. Please check."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toHaveValue("Lunch");
    expect(screen.getByLabelText(/Date/)).toHaveValue("2026-10-05");
    expect(screen.getAllByText("from receipt")).toHaveLength(3);
    expect(extractReceipt).toHaveBeenCalledTimes(1);
    const call = vi.mocked(extractReceipt).mock.calls[0][0];
    expect(call.tripId).toBe("trip1");
    expect(call.image).toEqual({ mimeType: "image/jpeg", base64: "AAA" });
    expect(call.categories).toHaveLength(14);
    next();
    expect(screen.getByLabelText(/Amount/)).toHaveValue(12.5);
  });

  it("keeps a user-edited amount and fills the rest", async () => {
    const gate = deferred<ExtractReceiptResponse>();
    vi.mocked(extractReceipt).mockReturnValue(gate.promise);
    renderForm();
    pickPhoto();
    fireEvent.click(screen.getByRole("button", { name: /Enter manually/ }));
    next();
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: "9.99" } });
    await act(async () => {
      gate.resolve(FULL_RESULT);
    });
    expect(screen.getByLabelText(/Amount/)).toHaveValue(9.99);
    expect(
      await screen.findByText("Filled from receipt: category, date, description. Please check."),
    ).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("applies a result that arrives before the upload finishes", async () => {
    renderForm();
    pickPhoto();
    await act(async () => {});
    uploaded();
    expect(await screen.findByText(/Filled from receipt/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toHaveValue("Lunch");
  });

  it("ignores a result when the attachment was removed", async () => {
    const gate = deferred<ExtractReceiptResponse>();
    vi.mocked(extractReceipt).mockReturnValue(gate.promise);
    renderForm();
    pickPhoto();
    await waitFor(() => expect(extractReceipt).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "mock-remove" }));
    await act(async () => {
      gate.resolve(FULL_RESULT);
    });
    fireEvent.click(screen.getByRole("button", { name: /Enter manually/ }));
    expect(screen.getByLabelText(/Description/)).toHaveValue("");
    expect(screen.queryByText(/Filled from receipt/)).not.toBeInTheDocument();
  });

  it("applies only the latest result when two files are picked", async () => {
    const gateA = deferred<ExtractReceiptResponse>();
    const gateB = deferred<ExtractReceiptResponse>();
    vi.mocked(extractReceipt)
      .mockReturnValueOnce(gateA.promise)
      .mockReturnValueOnce(gateB.promise);
    renderForm();
    pickPhoto();
    await waitFor(() => expect(extractReceipt).toHaveBeenCalledTimes(1));
    pickPhoto();
    await waitFor(() => expect(extractReceipt).toHaveBeenCalledTimes(2));
    await act(async () => {
      gateB.resolve({
        fields: { description: "Bee", category: null, date: null, amount: null, currency: null },
        missing: ["category", "date", "amount"],
      });
    });
    uploaded();
    expect(await screen.findByText(/Filled from receipt: description\. Please check\./)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toHaveValue("Bee");
    await act(async () => {
      gateA.resolve(FULL_RESULT);
    });
    expect(screen.getByLabelText(/Description/)).toHaveValue("Bee");
  });

  it("shows the photos-only note for a non-photo and makes no call", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "mock-pick-pdf" }));
    uploaded();
    expect(
      await screen.findByText("Receipt attached: receipt.jpg. Auto-fill reads photos only."),
    ).toBeInTheDocument();
    expect(fileToReceiptImage).not.toHaveBeenCalled();
    expect(extractReceipt).not.toHaveBeenCalled();
  });

  it("does nothing when disabled: no call and no note", async () => {
    vi.mocked(fetchAutofillEnabled).mockResolvedValue(false);
    renderForm();
    pickPhoto();
    uploaded();
    expect(
      await screen.findByText("Receipt attached: receipt.jpg. Fill in the details below."),
    ).toBeInTheDocument();
    expect(fileToReceiptImage).not.toHaveBeenCalled();
    expect(extractReceipt).not.toHaveBeenCalled();
  });

  it("shows the failure banner and Next still works", async () => {
    vi.mocked(extractReceipt).mockRejectedValue(new Error("Model gone was not found."));
    renderForm();
    pickPhoto();
    uploaded();
    expect(
      await screen.findByText("Couldn't read the receipt: Model gone was not found. Fill in the details below."),
    ).toBeInTheDocument();
    next();
    expect(screen.getByLabelText(/Amount/)).toBeInTheDocument();
  });

  it("shows the unreadable-format message on a decode failure", async () => {
    vi.mocked(fileToReceiptImage).mockRejectedValue(
      new Error("This image format can't be read in this browser."),
    );
    renderForm();
    pickPhoto();
    uploaded();
    expect(
      await screen.findByText(
        "Couldn't read the receipt: This image format can't be read in this browser. Fill in the details below.",
      ),
    ).toBeInTheDocument();
    expect(extractReceipt).not.toHaveBeenCalled();
  });

  it("makes no call in edit mode", async () => {
    const expense = {
      id: "e1",
      description: "Old",
      category: "food",
      date: "2026-10-01",
      amount: 5,
      paidBy: "Ada",
      sharedBy: ["Ada", "Bo"],
      createdAt: {} as never,
    };
    renderForm(expense);
    expect(fetchAutofillEnabled).not.toHaveBeenCalled();
    next();
    next();
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: "mock-pick-photo" }));
    await act(async () => {});
    expect(extractReceipt).not.toHaveBeenCalled();
  });

  it("warns about a non-USD receipt currency", async () => {
    vi.mocked(extractReceipt).mockResolvedValue({
      fields: { ...FULL_RESULT.fields, currency: "EUR" },
      missing: [],
    });
    renderForm();
    pickPhoto();
    uploaded();
    expect(
      await screen.findByText(
        "The receipt total is in EUR. The amount was filled as printed; check it.",
      ),
    ).toBeInTheDocument();
  });

  it("shows no photos-only note for a PDF when disabled", async () => {
    vi.mocked(fetchAutofillEnabled).mockResolvedValue(false);
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "mock-pick-pdf" }));
    uploaded();
    expect(
      await screen.findByText("Receipt attached: receipt.jpg. Fill in the details below."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Auto-fill reads photos only/)).not.toBeInTheDocument();
    expect(extractReceipt).not.toHaveBeenCalled();
  });

  it("ignores a photo result when a PDF is picked after it", async () => {
    const gate = deferred<ExtractReceiptResponse>();
    vi.mocked(extractReceipt).mockReturnValue(gate.promise);
    renderForm();
    pickPhoto();
    await waitFor(() => expect(extractReceipt).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "mock-pick-pdf" }));
    uploaded();
    expect(
      await screen.findByText("Receipt attached: receipt.jpg. Auto-fill reads photos only."),
    ).toBeInTheDocument();
    await act(async () => {
      gate.resolve(FULL_RESULT);
    });
    expect(screen.getByLabelText(/Description/)).toHaveValue("");
    expect(screen.queryByText(/Filled from receipt/)).not.toBeInTheDocument();
  });

  it("doesn't pull the user back when the upload finishes late", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /Enter manually/ }));
    next();
    expect(screen.getByLabelText(/Amount/)).toBeInTheDocument();
    // The start-screen upload finishes after the user moved on.
    const mocked = FileUploadModule as unknown as { __lateStartUpload?: () => void };
    act(() => {
      mocked.__lateStartUpload?.();
    });
    expect(screen.getByLabelText(/Amount/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Description/)).not.toBeInTheDocument();
  });

  it("toasts a late result on step 2 or later", async () => {
    const gate = deferred<ExtractReceiptResponse>();
    vi.mocked(extractReceipt).mockReturnValue(gate.promise);
    renderForm();
    pickPhoto();
    uploaded();
    await screen.findByText("Reading receipt…");
    next();
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: "5" } });
    next();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    await act(async () => {
      gate.resolve(FULL_RESULT);
    });
    expect(toast.success).toHaveBeenCalledWith(
      "Filled from receipt: category, date, description",
    );
  });
});
