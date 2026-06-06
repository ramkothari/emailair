"use client";

import { useState } from "react";
import type { ExecutionLifecycleEvent } from "@/lib/executor/events";

type ExportSelectedButtonProps = {
  selectedMessageIds: string[];
  onExportStatusChange?: (status: ExportSelectedStatus) => void;
  onExecute?: () => void;
  disabled?: boolean;
};

export type ExportSelectedStatus =
  | {
      state: "loading";
      completed: number;
      total: number;
    }
  | {
      state: "success";
      total: number;
    }
  | {
      state: "error";
      message: string;
      total: number;
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

function downloadBase64Zip(base64: string, fileName: string): void {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  downloadBlob(new Blob([bytes], { type: "application/zip" }), fileName);
}

export function ExportSelectedButton({
  selectedMessageIds,
  onExportStatusChange,
  onExecute,
  disabled = false,
}: ExportSelectedButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportSelectedEmails() {
    if (selectedMessageIds.length === 0) {
      return;
    }

    if (onExecute) {
      onExecute();
      return;
    }

    setExporting(true);
    setError(null);
    onExportStatusChange?.({
      state: "loading",
      completed: 0,
      total: selectedMessageIds.length,
    });

    try {
      const response = await fetch("/api/executions/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "export",
          emailIds: selectedMessageIds,
        }),
      });

      if (!response.ok || !response.body) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Failed to export selected emails");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalEvent: ExecutionLifecycleEvent | null = null;

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          const event = JSON.parse(line) as ExecutionLifecycleEvent;
          finalEvent = event;

          if (event.type === "started" || event.type === "progress") {
            onExportStatusChange?.({
              state: "loading",
              completed: event.processed,
              total: event.total,
            });
          }
        }
      }

      if (buffer.trim()) {
        finalEvent = JSON.parse(buffer) as ExecutionLifecycleEvent;
      }

      if (!finalEvent) {
        throw new Error("Export did not return a result.");
      }

      if (finalEvent.type === "failed") {
        throw new Error(finalEvent.error);
      }

      if (finalEvent.type !== "completed" || !finalEvent.fileBase64) {
        throw new Error("Failed to build selected email export.");
      }

      downloadBase64Zip(
        finalEvent.fileBase64,
        finalEvent.fileName ?? "emails-export.zip"
      );
      onExportStatusChange?.({
        state: "success",
        total: selectedMessageIds.length,
      });
    } catch (exportError) {
      const message =
        exportError instanceof Error
          ? exportError.message
          : "Failed to export selected emails";

      setError(message);
      onExportStatusChange?.({
        state: "error",
        message,
        total: selectedMessageIds.length,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={exportSelectedEmails}
        disabled={selectedMessageIds.length === 0 || exporting || disabled}
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
