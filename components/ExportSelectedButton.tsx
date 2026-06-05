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
        className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
          selectedMessageIds.length > 0
            ? "border-[#22C55E]/40 bg-black/[0.03] text-[#16A34A] hover:bg-[#22C55E] hover:text-white dark:bg-white/[0.04] dark:text-[#A1A1AA] dark:hover:text-white"
            : "border-[rgba(0,0,0,0.08)] bg-black/[0.03] text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#71717A]"
        }`}
      >
        {exporting
          ? "Exporting..."
          : `Export Selected (${selectedMessageIds.length})`}
      </button>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
      ) : null}
    </div>
  );
}
