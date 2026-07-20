import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user already dismissed this session
    if (sessionStorage.getItem("pwa-install-dismissed")) {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem("pwa-install-dismissed", "true");
  }

  // Don't show if no prompt available, already dismissed, or already installed
  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b bg-blue-600 px-4 py-2.5 text-white shadow-md">
      <div className="container mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/icons/icon-192.png"
            alt="TripShare"
            className="h-8 w-8 rounded-lg"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Install TripShare</p>
            <p className="truncate text-xs text-blue-100">
              Add to your home screen for quick access
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleInstall}
            className="gap-1.5 bg-white text-blue-600 hover:bg-blue-50"
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </Button>
          <button
            onClick={handleDismiss}
            className="rounded-full p-1 hover:bg-blue-500"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
