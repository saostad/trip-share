import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Link, Link2Off, RefreshCw, Loader2 } from "lucide-react";
import type { Trip } from "@/types";

function buildShareLink(token: string): string {
  return `${window.location.origin}/join/${token}`;
}

function randomToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 20; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

interface ShareLinkSectionProps {
  trip: Trip;
}

export function ShareLinkSection({ trip }: ShareLinkSectionProps) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const token = randomToken();
      await updateDoc(doc(db, "trips", trip.id), {
        shareToken: token,
        updatedAt: serverTimestamp(),
      });
      toast.success("Share link generated");
    } catch {
      toast.error("Failed to generate share link");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    setLoading(true);
    try {
      await updateDoc(doc(db, "trips", trip.id), {
        shareToken: null,
        updatedAt: serverTimestamp(),
      });
      toast.success("Share link revoked");
    } catch {
      toast.error("Failed to revoke share link");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!trip.shareToken) return;
    try {
      await navigator.clipboard.writeText(buildShareLink(trip.shareToken));
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  if (!trip.shareToken) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          No active share link. Generate one to invite collaborators.
        </p>
        <Button
          onClick={handleGenerate}
          disabled={loading}
          size="sm"
          className="gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Link className="h-3.5 w-3.5" />
          )}
          {loading ? "Generating..." : "Generate Share Link"}
        </Button>
      </div>
    );
  }

  const shareUrl = buildShareLink(trip.shareToken);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input value={shareUrl} readOnly className="text-xs" />
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopy}
          aria-label="Copy share link"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleRevoke}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Link2Off className="h-3.5 w-3.5" />
          )}
          {loading ? "Revoking..." : "Revoke Link"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {loading ? "Regenerating..." : "Regenerate Link"}
        </Button>
      </div>
    </div>
  );
}
