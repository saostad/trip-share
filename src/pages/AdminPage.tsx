import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAiAdminStatus,
  listAiModels,
  saveAiSettings,
  testReceiptExtraction,
  type AiAdminStatusResponse,
  type ListedModel,
  type TestReceiptExtractionResponse,
} from "@/lib/aiApi";
import { EXPENSE_CATEGORIES } from "@/lib/expenseCategories";
import { fileToReceiptImage } from "@/lib/receiptImage";

const DEFAULT_DAILY_LIMIT = 30;
const MAX_DAILY_LIMIT = 500;

function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : "Something went wrong.";
}

function StatusDot({ tone }: { tone: "ok" | "warn" | "missing" }) {
  const color =
    tone === "ok" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : "bg-gray-300";
  return <span aria-hidden="true" className={`inline-block size-2 rounded-full ${color}`} />;
}

export function AdminPage() {
  const { adminLoading, isAdmin } = useAuth();

  if (adminLoading) {
    return (
      <div>
        <Header />
        <div className="flex min-h-[50vh] items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
            role="status"
            aria-label="Loading admin status"
          />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div>
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-10 text-center">
          <p className="text-lg font-medium">You&apos;re not authorized to view this page.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Go back home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold">Admin</h1>
        <AiReceiptSection />
      </main>
    </div>
  );
}

function AiReceiptSection() {
  const [status, setStatus] = useState<AiAdminStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [dailyLimit, setDailyLimit] = useState(String(DEFAULT_DAILY_LIMIT));
  const [formReady, setFormReady] = useState(false);

  const [models, setModels] = useState<ListedModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [testFile, setTestFile] = useState<File | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestReceiptExtractionResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatusLoading(true);
    setStatusError(null);
    getAiAdminStatus()
      .then((result) => {
        if (cancelled) return;
        setStatus(result);
        setStatusLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatusError(errorMessage(err));
        setStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status === null || formReady) return;
    setFormReady(true);
    const savedSettings = status.settings;
    setEnabled(savedSettings?.enabled ?? false);
    setProvider(savedSettings?.provider ?? status.providers[0]?.id ?? "");
    setModel(savedSettings?.model ?? "");
    setDailyLimit(String(savedSettings?.dailyLimitPerUser ?? DEFAULT_DAILY_LIMIT));
  }, [status, formReady]);

  useEffect(() => {
    if (!provider) {
      setModels([]);
      return;
    }
    let cancelled = false;
    setModelsLoading(true);
    setModelsError(null);
    listAiModels(provider)
      .then((result) => {
        if (cancelled) return;
        setModels(result.models);
        setModelsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setModels([]);
        setModelsError(errorMessage(err));
        setModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  function handleProviderChange(next: string | null) {
    if (next === null) return;
    setProvider(next);
    setModel("");
    setSaved(false);
    setSaveError(null);
  }

  async function handleSave() {
    const trimmedModel = model.trim();
    const limit = Number(dailyLimit);
    if (!provider) {
      setSaveError("Choose a provider first.");
      return;
    }
    if (!trimmedModel) {
      setSaveError("Enter a model ID.");
      return;
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_DAILY_LIMIT) {
      setSaveError(`Daily limit must be a whole number from 1 to ${MAX_DAILY_LIMIT}.`);
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const savedSettings = await saveAiSettings({
        enabled,
        provider,
        model: trimmedModel,
        dailyLimitPerUser: limit,
      });
      setStatus((prev) =>
        prev === null
          ? prev
          : { ...prev, settings: savedSettings, settingsStatus: "ok", settingsError: null },
      );
      setSaved(true);
    } catch (err: unknown) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testFile || !provider || !model.trim()) return;
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      const image = await fileToReceiptImage(testFile);
      const result = await testReceiptExtraction({
        provider,
        model: model.trim(),
        image,
        categories: EXPENSE_CATEGORIES.map((category) => ({
          id: category.id,
          label: category.label,
        })),
      });
      setTestResult(result);
    } catch (err: unknown) {
      setTestError(errorMessage(err));
    } finally {
      setTesting(false);
    }
  }

  if (statusLoading) {
    return (
      <section aria-label="AI receipt extraction">
        <h2 className="text-lg font-semibold">AI receipt extraction</h2>
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading AI status…
        </div>
      </section>
    );
  }

  if (statusError !== null || status === null) {
    return (
      <section aria-label="AI receipt extraction">
        <h2 className="text-lg font-semibold">AI receipt extraction</h2>
        <p className="mt-2 text-sm text-destructive" role="alert">
          {statusError ?? "Could not load AI status."}
        </p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => {
            setStatusLoading(true);
            setStatusError(null);
            getAiAdminStatus()
              .then((result) => {
                setStatus(result);
                setStatusLoading(false);
              })
              .catch((err: unknown) => {
                setStatusError(errorMessage(err));
                setStatusLoading(false);
              });
          }}
        >
          Retry
        </Button>
      </section>
    );
  }

  const selectedProvider = status.providers.find((entry) => entry.id === provider);
  const testReady = testFile !== null && provider !== "" && model.trim() !== "";

  return (
    <section aria-label="AI receipt extraction" className="space-y-6">
      <h2 className="text-lg font-semibold">AI receipt extraction</h2>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {status.providers.length === 0 ? (
            <p className="text-muted-foreground">No AI providers are configured on the server.</p>
          ) : (
            <ul className="space-y-2">
              {status.providers.map((entry) => (
                <li key={entry.id} className="flex items-center gap-2">
                  <StatusDot tone={entry.keyConfigured ? "ok" : "warn"} />
                  <span className="font-medium">{entry.label}</span>
                  <span className="text-muted-foreground">
                    {entry.keyConfigured ? "API key configured" : "API key missing"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <StatusDot tone={status.settingsStatus === "ok" ? "ok" : "missing"} />
            {status.settingsStatus === "ok" && (
              <span>
                Settings saved
                {status.updatedAt !== null && status.updatedBy !== null
                  ? ` by ${status.updatedBy} on ${new Date(status.updatedAt).toLocaleString()}`
                  : ""}
                .
              </span>
            )}
            {status.settingsStatus === "missing" && <span>No settings saved yet.</span>}
            {status.settingsStatus === "invalid" && (
              <span>Saved settings are invalid: {status.settingsError ?? "unknown error"}.</span>
            )}
          </div>
          {status.keysStatus === "invalid" && (
            <p className="text-amber-600" role="alert">
              The provider-keys secret on the server is invalid. Fix the secret, then reload this
              page.
            </p>
          )}
          {status.ignoredKeyNames.length > 0 && (
            <p className="text-muted-foreground">
              Ignored unknown key names: {status.ignoredKeyNames.join(", ")}.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={enabled}
              onCheckedChange={(checked) => {
                setEnabled(checked === true);
                setSaved(false);
              }}
              aria-label="Enable AI receipt extraction"
            />
            Enable AI receipt extraction
          </label>

          <div className="space-y-1.5">
            <label htmlFor="ai-provider" className="text-sm font-medium leading-none">
              Provider
            </label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger id="ai-provider" className="w-full">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {status.providers.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-model" className="text-sm font-medium leading-none">
              Model
            </label>
            <Input
              id="ai-model"
              list="ai-model-options"
              value={model}
              onChange={(event) => {
                setModel(event.target.value);
                setSaved(false);
              }}
              placeholder="e.g. gemini-2.5-flash"
              autoComplete="off"
            />
            <datalist id="ai-model-options">
              {models.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </datalist>
            {modelsLoading && (
              <p className="text-xs text-muted-foreground">Loading known models…</p>
            )}
            {modelsError !== null && (
              <p className="text-xs text-muted-foreground">
                Couldn&apos;t load suggestions — you can still type a model ID. ({modelsError})
              </p>
            )}
            {selectedProvider !== undefined && (
              <p className="text-xs text-muted-foreground">{selectedProvider.modelHelp}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-daily-limit" className="text-sm font-medium leading-none">
              Daily extractions per user
            </label>
            <Input
              id="ai-daily-limit"
              type="number"
              min={1}
              max={MAX_DAILY_LIMIT}
              value={dailyLimit}
              onChange={(event) => {
                setDailyLimit(event.target.value);
                setSaved(false);
              }}
            />
          </div>

          {saveError !== null && (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          )}
          {saved && (
            <p className="text-sm text-emerald-600" role="status">
              Settings saved.
            </p>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Save settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test extraction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Runs one extraction with the provider and model above. Nothing is saved.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="ai-test-image" className="text-sm font-medium leading-none">
              Receipt photo
            </label>
            <Input
              id="ai-test-image"
              type="file"
              accept="image/*"
              onChange={(event) => {
                setTestFile(event.target.files?.[0] ?? null);
                setTestResult(null);
                setTestError(null);
              }}
            />
          </div>
          <Button onClick={handleTest} disabled={!testReady || testing} variant="outline">
            {testing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Run test
          </Button>
          {testError !== null && (
            <p className="text-sm text-destructive" role="alert">
              {testError}
            </p>
          )}
          {testResult !== null && <TestResultView result={testResult} />}
        </CardContent>
      </Card>
    </section>
  );
}

function TestResultView({ result }: { result: TestReceiptExtractionResponse }) {
  if ("error" in result) {
    return (
      <div className="space-y-2 text-sm" role="alert">
        <p className="font-medium text-destructive">Extraction failed: {result.error}</p>
        <p className="text-muted-foreground">Took {result.latencyMs} ms.</p>
        {result.rawText !== "" && (
          <details>
            <summary className="cursor-pointer font-medium">Model output</summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
              {result.rawText}
            </pre>
          </details>
        )}
      </div>
    );
  }
  const rows: Array<[string, string]> = [
    ["Description", result.fields.description ?? "—"],
    ["Category", result.fields.category ?? "—"],
    ["Date", result.fields.date ?? "—"],
    ["Amount", result.fields.amount === null ? "—" : String(result.fields.amount)],
    ["Currency", result.fields.currency ?? "—"],
  ];
  return (
    <div className="space-y-2 text-sm">
      <dl className="divide-y divide-border rounded-lg border">
        {rows.map(([term, value]) => (
          <div key={term} className="flex justify-between gap-4 px-3 py-1.5">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {result.missing.length > 0 && (
        <p className="text-muted-foreground">Missing: {result.missing.join(", ")}.</p>
      )}
      <p className="text-muted-foreground">Took {result.latencyMs} ms.</p>
      {result.rawText !== "" && (
        <details>
          <summary className="cursor-pointer font-medium">Model output</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
            {result.rawText}
          </pre>
        </details>
      )}
    </div>
  );
}
