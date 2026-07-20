import { useState, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText, Image, Loader2 } from "lucide-react";
import type { FileAttachment } from "@/types";

export type { FileAttachment };

interface FileUploadProps {
  /** Storage path prefix, e.g. "trips/{tripId}/expenses" */
  storagePath: string;
  /** Current attachment (for edit mode) */
  value?: FileAttachment | null;
  /** Called when file is uploaded or removed */
  onChange: (file: FileAttachment | null) => void;
}

export function FileUpload({ storagePath, value, onChange }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert("File must be smaller than 10MB");
      return;
    }

    setUploading(true);
    setProgress(0);

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fullPath = `${storagePath}/${timestamp}_${safeName}`;
    const storageRef = ref(storage, fullPath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setProgress(pct);
      },
      () => {
        setUploading(false);
        alert("Upload failed. Please try again.");
      },
      async () => {
        const url = await getDownloadURL(storageRef);
        onChange({
          name: file.name,
          url,
          path: fullPath,
          type: file.type,
        });
        setUploading(false);
      }
    );
  }

  async function handleRemove() {
    if (!value) return;
    try {
      await deleteObject(ref(storage, value.path));
    } catch {
      // File might already be deleted, continue
    }
    onChange(null);
  }

  function getFileIcon(type: string) {
    if (type.startsWith("image/")) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  }

  // Show existing attachment
  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/30 p-2">
        {getFileIcon(value.type)}
        <a
          href={value.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate text-xs text-blue-600 hover:underline"
        >
          {value.name}
        </a>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleRemove}
          aria-label="Remove attachment"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // Show upload button
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="gap-1.5"
      >
        {uploading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {progress}%
          </>
        ) : (
          <>
            <Paperclip className="h-3.5 w-3.5" />
            Attach file
          </>
        )}
      </Button>
      {uploading && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
