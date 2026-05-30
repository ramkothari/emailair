"use client";

import { useState } from "react";

type ExportSelectedButtonProps = {
  selectedMessageIds: string[];
};

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export function ExportSelectedButton({
  selectedMessageIds,
}: ExportSelectedButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportSelectedEmails() {
    if (selectedMessageIds.length === 0) {
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/export/selected", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageIds: selectedMessageIds,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Failed to export selected emails");
      }

      const blob = await response.blob();

      downloadBlob(blob, "emails-export.zip");
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Failed to export selected emails"
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={exportSelectedEmails}
        disabled={selectedMessageIds.length === 0 || exporting}
        className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {exporting
          ? "Exporting..."
          : `Export Selected (${selectedMessageIds.length})`}
      </button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
