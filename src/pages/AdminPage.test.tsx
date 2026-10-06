import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AdminPage } from "./AdminPage";
import {
  getAiAdminStatus,
  listAiModels,
  saveAiSettings,
  testReceiptExtraction,
  type AiAdminStatusResponse,
} from "@/lib/aiApi";
import { fileToReceiptImage } from "@/lib/receiptImage";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { displayName: "Ada", email: "ada@example.com", photoURL: null },
    adminLoading: false,
    isAdmin: true,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/lib/aiApi", () => ({
  getAiAdminStatus: vi.fn(),
  listAiModels: vi.fn(),
  saveAiSettings: vi.fn(),
  testReceiptExtraction: vi.fn(),
}));

vi.mock("@/lib/receiptImage", () => ({
  fileToReceiptImage: vi.fn(),
}));

const statusFixture: AiAdminStatusResponse = {
  providers: [
    { id: "gemini", label: "Google Gemini", keyConfigured: true, modelHelp: "Gemini model help." },
    { id: "openai", label: "OpenAI", keyConfigured: false, modelHelp: "OpenAI model help." },
  ],
  settings: {
    enabled: true,
    provider: "gemini",
    model: "gemini-2.5-flash",
    dailyLimitPerUser: 30,
  },
  settingsStatus: "ok",
  settingsError: null,
  keysStatus: "ok",
  ignoredKeyNames: [],
  updatedAt: "2026-10-06T10:00:00.000Z",
  updatedBy: "ada@example.com",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.setItem("theme", "light");
  vi.mocked(getAiAdminStatus).mockResolvedValue(statusFixture);
  vi.mocked(listAiModels).mockResolvedValue({
    models: [{ id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }],
  });
  vi.mocked(saveAiSettings).mockImplementation(async (input) => input);
});

describe("AdminPage AI section", () => {
  it("shows provider key status and saved settings", async () => {
    renderPage();
    await screen.findByText("API key configured");
    expect(screen.getAllByText("Google Gemini").length).toBeGreaterThan(0);
    expect(screen.getByText("API key configured")).toBeInTheDocument();
    expect(screen.getByText("API key missing")).toBeInTheDocument();
    expect(screen.getByText(/ada@example\.com/)).toBeInTheDocument();
    expect(screen.getByLabelText("Model")).toHaveValue("gemini-2.5-flash");
    expect(screen.getByLabelText("Daily extractions per user")).toHaveValue(30);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("retries after a status load failure", async () => {
    vi.mocked(getAiAdminStatus).mockRejectedValueOnce(new Error("offline"));
    renderPage();
    expect(await screen.findByText("offline")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("API key configured")).toBeInTheDocument();
  });

  it("saves the edited settings", async () => {
    renderPage();
    await screen.findByText("API key configured");
    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "gemini-2.0-flash" } });
    fireEvent.change(screen.getByLabelText("Daily extractions per user"), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    await screen.findByText("Settings saved.");
    expect(saveAiSettings).toHaveBeenCalledWith({
      enabled: true,
      provider: "gemini",
      model: "gemini-2.0-flash",
      dailyLimitPerUser: 50,
    });
  });

  it("blocks save with an empty model", async () => {
    renderPage();
    await screen.findByText("API key configured");
    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    expect(await screen.findByText("Enter a model ID.")).toBeInTheDocument();
    expect(saveAiSettings).not.toHaveBeenCalled();
  });

  it("shows a save error from the server", async () => {
    vi.mocked(saveAiSettings).mockRejectedValue(new Error("permission denied"));
    renderPage();
    await screen.findByText("API key configured");
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    expect(await screen.findByText("permission denied")).toBeInTheDocument();
  });

  it("switching provider clears the model and reloads suggestions", async () => {
    renderPage();
    await screen.findByText("API key configured");
    expect(listAiModels).toHaveBeenCalledWith("gemini");
    fireEvent.click(screen.getByRole("combobox", { name: "Provider" }));
    const openaiOption = await screen.findByRole("option", { name: "OpenAI" });
    fireEvent.pointerDown(openaiOption);
    fireEvent.click(openaiOption);
    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toHaveValue("");
    });
    expect(listAiModels).toHaveBeenCalledWith("openai");
    expect(screen.getByText("OpenAI model help.")).toBeInTheDocument();
  });

  it("runs a test extraction and shows the fields", async () => {
    vi.mocked(fileToReceiptImage).mockResolvedValue({ mimeType: "image/jpeg", base64: "AAA" });
    vi.mocked(testReceiptExtraction).mockResolvedValue({
      fields: {
        description: "Lunch",
        category: "food",
        date: "2026-10-05",
        amount: 12.5,
        currency: null,
      },
      missing: ["currency"],
      rawText: '{"description":"Lunch"}',
      latencyMs: 123,
    });
    renderPage();
    await screen.findByText("API key configured");
    const runButton = screen.getByRole("button", { name: "Run test" });
    expect(runButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Receipt photo"), {
      target: { files: [new File(["bytes"], "receipt.jpg", { type: "image/jpeg" })] },
    });
    expect(runButton).toBeEnabled();
    fireEvent.click(runButton);
    expect(await screen.findByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Missing: currency.")).toBeInTheDocument();
    expect(screen.getByText("Took 123 ms.")).toBeInTheDocument();
    expect(testReceiptExtraction).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "gemini",
        model: "gemini-2.5-flash",
        image: { mimeType: "image/jpeg", base64: "AAA" },
      }),
    );
    const call = vi.mocked(testReceiptExtraction).mock.calls[0][0];
    expect(call.categories).toHaveLength(14);
  });

  it("shows test diagnostics on failure", async () => {
    vi.mocked(fileToReceiptImage).mockResolvedValue({ mimeType: "image/jpeg", base64: "AAA" });
    vi.mocked(testReceiptExtraction).mockResolvedValue({
      fields: null,
      missing: [],
      rawText: "not json",
      latencyMs: 50,
      error: "The model returned invalid JSON.",
    });
    renderPage();
    await screen.findByText("API key configured");
    fireEvent.change(screen.getByLabelText("Receipt photo"), {
      target: { files: [new File(["bytes"], "receipt.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Run test" }));
    expect(await screen.findByText(/Extraction failed/)).toBeInTheDocument();
  });
});
