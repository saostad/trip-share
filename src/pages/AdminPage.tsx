import { useEffect, useState } from "react";
import { Link } from "react-router";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { expenseCategoryPayload } from "@/lib/expenseCategories";
import { fileToReceiptImage } from "@/lib/receiptImage";

const DEFAULT_DAILY_LIMIT = 30;
const MAX_DAILY_LIMIT = 500;
const MODEL_URL_HINT = "That looks like a page URL. Paste the model ID instead.";

function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : "Something went wrong.";
}

/** Strips one trailing period so an inserted server message never doubles up with ours. */
function withoutTrailingPeriod(message: string): string {
  return message.endsWith(".") ? message.slice(0, -1) : message;
}

function formatUpdatedAt(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : format(date, "PPpp");
}

function StatusDot({ tone }: { tone: "ok" | "warn" | "missing" }) {
  const color =
    tone === "ok"
      ? "bg-positive"
      : tone === "warn"
        ? "bg-warning ring-1 ring-warning-foreground/40"
        : "bg-muted-foreground";
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
            className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"
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
          <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
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

  const [testFile, setTestFile] = useState<File | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestReceiptExtractionResponse | null>(null);

  function applySettings(next: AiAdminStatusResponse) {
    const savedSettings = next.settings;
    setEnabled(savedSettings?.enabled ?? false);
    setProvider(savedSettings?.provider ?? next.providers[0]?.id ?? "");
    setModel(savedSettings?.model ?? "");
    setDailyLimit(String(savedSettings?.dailyLimitPerUser ?? DEFAULT_DAILY_LIMIT));
  }

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
    applySettings(status);
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

  if (statusLoading) {
    return (
      <section aria-label="Receipt auto-fill (AI)">
        <h2 className="text-lg font-semibold">Receipt auto-fill (AI)</h2>
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading AI status…
        </div>
      </section>
    );
  }

  if (statusError !== null || status === null) {
    return (
      <section aria-label="Receipt auto-fill (AI)">
        <h2 className="text-lg font-semibold">Receipt auto-fill (AI)</h2>
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
  const providerKeyMissing = selectedProvider !== undefined && !selectedProvider.keyConfigured;
  const modelTrimmed = model.trim();
  const modelIsUrl = modelTrimmed.includes("://");
  const limitNumber = Number(dailyLimit);
  const limitError =
    dailyLimit.trim() === "" ||
    !Number.isInteger(limitNumber) ||
    limitNumber < 1 ||
    limitNumber > MAX_DAILY_LIMIT
      ? `Enter a whole number from 1 to ${MAX_DAILY_LIMIT}.`
      : null;
  const testReady = testFile !== null && provider !== "" && modelTrimmed !== "";
  const saveBlockedByKey = enabled && providerKeyMissing;

  function handleProviderChange(next: string | null) {
    if (next === null) return;
    setProvider(next);
    setModel("");
    setSaveError(null);
  }

  async function handleSave() {
    if (!provider) {
      setSaveError("Choose a provider first.");
      return;
    }
    if (!modelTrimmed) {
      setSaveError("Enter a model ID.");
      return;
    }
    if (limitError !== null) {
      setSaveError(limitError);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await saveAiSettings({
        enabled,
        provider,
        model: modelTrimmed,
        dailyLimitPerUser: limitNumber,
      });
      toast.success("Settings saved.");
    } catch (err: unknown) {
      const message = errorMessage(err);
      setSaveError(message);
      toast.error(message);
      return;
    } finally {
      setSaving(false);
    }
    try {
      const fresh = await getAiAdminStatus();
      setStatus(fresh);
      applySettings(fresh);
    } catch (err: unknown) {
      setSaveError(`Settings saved, but reloading the status failed: ${errorMessage(err)}`);
    }
  }

  async function handleTest() {
    if (!testFile || !provider || !modelTrimmed) return;
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      const image = await fileToReceiptImage(testFile);
      const result = await testReceiptExtraction({
        provider,
        model: modelTrimmed,
        image,
        categories: expenseCategoryPayload(),
      });
      setTestResult(result);
    } catch (err: unknown) {
      setTestError(errorMessage(err));
    } finally {
      setTesting(false);
    }
  }

  const updatedOn =
    status.updatedAt !== null && status.updatedBy !== null
      ? { by: status.updatedBy, on: formatUpdatedAt(status.updatedAt) }
      : null;

  return (
    <section aria-label="Receipt auto-fill (AI)" className="space-y-6">
      <h2 className="text-lg font-semibold">Receipt auto-fill (AI)</h2>

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
            {status.settingsStatus === "ok" &&
              (updatedOn !== null && updatedOn.on !== null ? (
                <span>
                  Last updated by {updatedOn.by} on {updatedOn.on}.
                </span>
              ) : (
                <span>Settings saved.</span>
              ))}
            {status.settingsStatus === "missing" && <span>Not set up yet.</span>}
          </div>
          {status.settingsStatus === "invalid" && (
            <p className="text-warning-foreground" role="alert">
              The saved settings are invalid:{" "}
              {withoutTrailingPeriod(status.settingsError ?? "unknown error")}. Saving will
              replace the stored settings.
            </p>
          )}
          {status.keysStatus === "invalid" && (
            <div className="space-y-1 text-warning-foreground" role="alert">
              <p>
                The AI_PROVIDER_KEYS secret isn&apos;t valid JSON, so no provider has a key. Run
                this to replace it:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-2 text-xs text-foreground">
                npx firebase-tools functions:secrets:set AI_PROVIDER_KEYS --project{" "}
                {import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "<projectId>"}
              </pre>
            </div>
          )}
          {status.ignoredKeyNames.length > 0 && (
            <p className="text-muted-foreground">
              These names in AI_PROVIDER_KEYS aren&apos;t providers and are ignored:{" "}
              {status.ignoredKeyNames.join(", ")}
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
                    {entry.keyConfigured ? "" : " (key not set)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-model" className="text-sm font-medium leading-none">
              Model ID
            </label>
            <Input
              id="ai-model"
              list="ai-model-options"
              value={model}
              onChange={(event) => {
                setModel(event.target.value);
              }}
              placeholder="Paste a model ID"
              autoComplete="off"
            />
            <datalist id="ai-model-options">
              {models.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </datalist>
            {modelIsUrl && (
              <p className="text-xs text-destructive" role="alert">
                {MODEL_URL_HINT}
              </p>
            )}
            {modelsLoading && <p className="text-xs text-muted-foreground">Loading models…</p>}
            {modelsError !== null && (
              <p className="text-xs text-muted-foreground">
                Couldn&apos;t load the model list: {withoutTrailingPeriod(modelsError)}. You can
                still paste a model ID.
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
              }}
            />
            {limitError !== null && (
              <p className="text-xs text-destructive" role="alert">
                {limitError}
              </p>
            )}
          </div>

          {saveBlockedByKey && selectedProvider !== undefined && (
            <p className="text-xs text-muted-foreground">
              Save is disabled because the {selectedProvider.label} API key isn&apos;t set. Turn
              the feature off to save anyway.
            </p>
          )}
          {saveError !== null && (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || modelIsUrl || saveBlockedByKey}
          >
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Save
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
          {providerKeyMissing && selectedProvider !== undefined && (
            <p className="text-xs text-muted-foreground">
              Test is disabled because the {selectedProvider.label} API key isn&apos;t set.
            </p>
          )}
          <Button
            onClick={handleTest}
            disabled={!testReady || testing || modelIsUrl || providerKeyMissing}
            variant="outline"
          >
            {testing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Test
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
