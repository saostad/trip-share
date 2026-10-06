import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { toast } from "sonner";
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

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const statusFixture: AiAdminStatusResponse = {
  providers: [
    { id: "alpha", label: "Alpha AI", keyConfigured: true, modelHelp: "Alpha model help." },
    { id: "beta", label: "Beta AI", keyConfigured: false, modelHelp: "Beta model help." },
  ],
  settings: {
    enabled: true,
    provider: "alpha",
    model: "alpha-model-1",
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

async function selectProvider(name: string) {
  fireEvent.click(screen.getByRole("combobox", { name: "Provider" }));
  const option = await screen.findByRole("option", { name });
  fireEvent.pointerDown(option);
  fireEvent.click(option);
}

function pickImage() {
  fireEvent.change(screen.getByLabelText("Receipt photo"), {
    target: { files: [new File(["bytes"], "receipt.jpg", { type: "image/jpeg" })] },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.setItem("theme", "light");
  vi.mocked(getAiAdminStatus).mockResolvedValue(statusFixture);
  vi.mocked(listAiModels).mockResolvedValue({
    models: [{ id: "alpha-model-1", label: "Alpha Model One" }],
  });
  vi.mocked(saveAiSettings).mockImplementation(async (input) => input);
});

describe("AdminPage AI section", () => {
  it("shows provider key status and saved settings", async () => {
    renderPage();
    await screen.findByText("API key configured");
    expect(screen.getAllByText("Alpha AI").length).toBeGreaterThan(0);
    expect(screen.getByText("API key missing")).toBeInTheDocument();
    expect(screen.getByText(/Last updated by ada@example\.com on /)).toBeInTheDocument();
    expect(screen.getByLabelText("Model ID")).toHaveValue("alpha-model-1");
    expect(screen.getByLabelText("Daily extractions per user")).toHaveValue(30);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("shows 'Not set up yet' when nothing is saved", async () => {
    vi.mocked(getAiAdminStatus).mockResolvedValue({
      ...statusFixture,
      settings: null,
      settingsStatus: "missing",
      updatedAt: null,
      updatedBy: null,
    });
    renderPage();
    expect(await screen.findByText("Not set up yet.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByLabelText("Model ID")).toHaveValue("");
  });

  it("shows the invalid-settings warning", async () => {
    vi.mocked(getAiAdminStatus).mockResolvedValue({
      ...statusFixture,
      settings: null,
      settingsStatus: "invalid",
      settingsError: "Invalid 'model': must not be empty",
      updatedAt: null,
      updatedBy: null,
    });
    renderPage();
    const warning = await screen.findByText(/Saving will replace the stored settings\./);
    expect(warning).toBeInTheDocument();
    expect(warning.textContent).toContain("Invalid 'model': must not be empty");
  });

  it("shows the invalid-keys warning with the fix command", async () => {
    vi.mocked(getAiAdminStatus).mockResolvedValue({
      ...statusFixture,
      keysStatus: "invalid",
      ignoredKeyNames: ["gemni"],
      providers: statusFixture.providers.map((entry) => ({ ...entry, keyConfigured: false })),
    });
    renderPage();
    expect(await screen.findByText(/The AI_PROVIDER_KEYS secret isn't valid JSON/)).toBeInTheDocument();
    expect(
      screen.getByText("firebase functions:secrets:set AI_PROVIDER_KEYS"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/These names in AI_PROVIDER_KEYS aren't providers and are ignored: gemni/),
    ).toBeInTheDocument();
    expect(screen.queryByText("API key configured")).not.toBeInTheDocument();
  });

  it("retries after a status load failure", async () => {
    vi.mocked(getAiAdminStatus).mockRejectedValueOnce(new Error("offline"));
    renderPage();
    expect(await screen.findByText("offline")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("API key configured")).toBeInTheDocument();
  });

  it("saves an unlisted model id trimmed, toasts, and reloads the status", async () => {
    renderPage();
    await screen.findByText("API key configured");
    fireEvent.change(screen.getByLabelText("Model ID"), {
      target: { value: "  custom-model-9  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Last updated by ada@example\.com on /)).toBeInTheDocument();
    expect(saveAiSettings).toHaveBeenCalledWith({
      enabled: true,
      provider: "alpha",
      model: "custom-model-9",
      dailyLimitPerUser: 30,
    });
    expect(toast.success).toHaveBeenCalledWith("Settings saved.");
    expect(getAiAdminStatus).toHaveBeenCalledTimes(2);
  });

  it("blocks save with an empty model", async () => {
    renderPage();
    await screen.findByText("API key configured");
    fireEvent.change(screen.getByLabelText("Model ID"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter a model ID.")).toBeInTheDocument();
    expect(saveAiSettings).not.toHaveBeenCalled();
  });

  it("shows a save error inline and in a toast", async () => {
    vi.mocked(saveAiSettings).mockRejectedValue(new Error("permission denied"));
    renderPage();
    await screen.findByText("API key configured");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("permission denied")).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("permission denied");
  });

  it("validates the daily limit inline", async () => {
    renderPage();
    await screen.findByText("API key configured");
    fireEvent.change(screen.getByLabelText("Daily extractions per user"), {
      target: { value: "0" },
    });
    expect(await screen.findByText("Enter a whole number from 1 to 500.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(saveAiSettings).not.toHaveBeenCalled();
  });

  it("a pasted URL shows the hint and disables Save and Test", async () => {
    renderPage();
    await screen.findByText("API key configured");
    pickImage();
    fireEvent.change(screen.getByLabelText("Model ID"), {
      target: { value: "https://aistudio.google.com/models/alpha" },
    });
    expect(
      await screen.findByText("That looks like a page URL. Paste the model ID instead."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Test" })).toBeDisabled();
  });

  it("switching provider clears the model and reloads suggestions", async () => {
    renderPage();
    await screen.findByText("API key configured");
    expect(listAiModels).toHaveBeenCalledWith("alpha");
    await selectProvider("Beta AI (key not set)");
    expect(screen.getByLabelText("Model ID")).toHaveValue("");
    expect(listAiModels).toHaveBeenCalledWith("beta");
    expect(screen.getByText("Beta model help.")).toBeInTheDocument();
  });

  it("a provider without a key disables Test and Save while enabled", async () => {
    renderPage();
    await screen.findByText("API key configured");
    await selectProvider("Beta AI (key not set)");
    fireEvent.change(screen.getByLabelText("Model ID"), { target: { value: "beta-model-1" } });
    pickImage();
    expect(screen.getByRole("button", { name: "Test" })).toBeDisabled();
    expect(
      screen.getByText("Test is disabled because the Beta AI API key isn't set."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("a model-list error keeps the input, Test and Save working", async () => {
    vi.mocked(listAiModels).mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText("API key configured");
    expect(
      await screen.findByText(
        "Couldn't load the model list: boom. You can still paste a model ID.",
      ),
    ).toBeInTheDocument();
    const modelInput = screen.getByLabelText("Model ID");
    expect(modelInput).toBeEnabled();
    fireEvent.change(modelInput, { target: { value: "pasted-model" } });
    pickImage();
    expect(screen.getByRole("button", { name: "Test" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(saveAiSettings).toHaveBeenCalledWith(
      expect.objectContaining({ model: "pasted-model" }),
    );
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
    const testButton = screen.getByRole("button", { name: "Test" });
    expect(testButton).toBeDisabled();
    pickImage();
    expect(testButton).toBeEnabled();
    fireEvent.click(testButton);
    expect(await screen.findByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Missing: currency.")).toBeInTheDocument();
    expect(screen.getByText("Took 123 ms.")).toBeInTheDocument();
    expect(testReceiptExtraction).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "alpha",
        model: "alpha-model-1",
        image: { mimeType: "image/jpeg", base64: "AAA" },
      }),
    );
    const call = vi.mocked(testReceiptExtraction).mock.calls[0][0];
    expect(call.categories).toHaveLength(14);
  });

  it("shows a diagnostic test result with the raw text", async () => {
    vi.mocked(fileToReceiptImage).mockResolvedValue({ mimeType: "image/jpeg", base64: "AAA" });
    vi.mocked(testReceiptExtraction).mockResolvedValue({
      fields: null,
      missing: [],
      rawText: "not json at all",
      latencyMs: 50,
      error: "The model returned invalid JSON.",
    });
    renderPage();
    await screen.findByText("API key configured");
    pickImage();
    fireEvent.click(screen.getByRole("button", { name: "Test" }));
    expect(await screen.findByText(/Extraction failed/)).toBeInTheDocument();
    expect(screen.getByText("not json at all")).toBeInTheDocument();
  });
});
