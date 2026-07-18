import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateShareToken, buildShareLink } from "@/lib/shareLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Link, Link2Off, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Trip } from "@/types";

interface ShareLinkSectionProps {
  trip: Trip;
}

export function ShareLinkSection({ trip }: ShareLinkSectionProps) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const token = generateShareToken();
      const tripRef = doc(db, "trips", trip.id);
      await updateDoc(tripRef, {
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
      const tripRef = doc(db, "trips", trip.id);
      await updateDoc(tripRef, {
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
      const url = buildShareLink(trip.shareToken);
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }

  // No token: show generate button
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
        >
          <Link className="mr-1 h-3.5 w-3.5" />
          {loading ? "Generating..." : "Generate Share Link"}
        </Button>
      </div>
    );
  }

  // Token exists: show link with copy and revoke options
  const shareUrl = buildShareLink(trip.shareToken);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={shareUrl}
          readOnly
          className="text-xs"
        />
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
        >
          <Link2Off className="mr-1 h-3.5 w-3.5" />
          {loading ? "Revoking..." : "Revoke Link"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={loading}
        >
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          {loading ? "Regenerating..." : "Regenerate Link"}
        </Button>
      </div>
    </div>
  );
}
