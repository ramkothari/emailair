"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ExportSelectedButton } from "@/components/ExportSelectedButton";
import type { ExecutionLifecycleEvent } from "@/lib/executor/events";
import type { Email, EmailActionResult } from "@/types/email";

type EmailTableProps = {
  emails: Email[];
  onDeleteSelected: (ids: string[]) => Promise<EmailActionResult>;
  onArchiveSelected: (ids: string[]) => Promise<EmailActionResult>;
  onRemoveEmails?: (ids: string[]) => void;
  heading?: string;
  description?: string;
  onViewEmail?: (id: string) => void;
  onAnalyzeResults?: () => void;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  showExportSelected?: boolean;
};

type BulkActionProgress = {
  action: "archive" | "delete" | "export";
  completed: number;
  total: number;
  startedAt: number;
  failed: number;
  etaSeconds: number | null;
};

type NotificationState =
  | {
      type: "loading";
      action: "archive" | "delete" | "export";
      completed: number;
      total: number;
      startedAt: number;
      failed: number;
      etaSeconds: number | null;
    }
  | {
      type: "success" | "error";
      message: string;
    };

export function EmailTable({
  emails,
  onDeleteSelected,
  onArchiveSelected,
  onRemoveEmails,
  heading,
  description,
  onViewEmail,
  onAnalyzeResults,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  showExportSelected = false,
}: EmailTableProps) {
  const selectAllRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<EmailActionResult | null>(null);
  const [bulkActionProgress, setBulkActionProgress] =
    useState<BulkActionProgress | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCount = selectedIds.length;
  const allSelected = emails.length > 0 && selectedCount === emails.length;
  const hasSelection = selectedCount > 0;
  const isExecuting = bulkActionProgress !== null || isPending;
  const notification = bulkActionProgress
    ? {
        type: "loading" as const,
        action: bulkActionProgress.action,
        completed: bulkActionProgress.completed,
        total: bulkActionProgress.total,
        startedAt: bulkActionProgress.startedAt,
        failed: bulkActionProgress.failed,
        etaSeconds: bulkActionProgress.etaSeconds,
      }
    : message
      ? {
          type: message.success ? ("success" as const) : ("error" as const),
          message: message.message,
        }
      : null;

  useEffect(() => {
    setSelectedIds((currentIds) =>
      currentIds.filter((id) => emails.some((email) => email.id === id))
    );
  }, [emails]);

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }

    selectAllRef.current.indeterminate =
      selectedCount > 0 && selectedCount < emails.length;
  }, [selectedCount, emails.length]);

  useEffect(() => {
    if (!message?.success) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message]);

  function toggleEmail(id: string) {
    setMessage(null);

    setSelectedIds((currentIds) => {
      if (currentIds.includes(id)) {
        return currentIds.filter((currentId) => currentId !== id);
      }

      return [...currentIds, id];
    });
  }

  function toggleAllEmails() {
    setMessage(null);

    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(emails.map((email) => email.id));
  }

  function downloadBase64File(base64: string, fileName: string): void {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    const url = URL.createObjectURL(
      new Blob([bytes], { type: "application/zip" })
    );
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function executeManualAction(
    ids: string[],
    action: "archive" | "delete" | "export"
  ): Promise<EmailActionResult> {
    const startedAt = Date.now();
    let latestEvent: ExecutionLifecycleEvent | null = null;

    setBulkActionProgress({
      action,
      completed: 0,
      total: ids.length,
      startedAt,
      failed: 0,
      etaSeconds: null,
    });

    const response = await fetch("/api/executions/manual", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        emailIds: ids,
      }),
    });

    if (!response.ok || !response.body) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      throw new Error(body?.error ?? "Execution failed.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

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
        latestEvent = event;

        if (
          event.type === "started" ||
          event.type === "progress"
        ) {
          setBulkActionProgress({
            action,
            completed: event.processed,
            total: event.total,
            startedAt,
            failed: event.failed,
            etaSeconds: event.etaSeconds,
          });
        }
      }
    }

    if (buffer.trim()) {
      latestEvent = JSON.parse(buffer) as ExecutionLifecycleEvent;
    }

    setBulkActionProgress(null);

    if (!latestEvent) {
      throw new Error("Execution did not return a result.");
    }

    if (latestEvent.type === "failed") {
      onRemoveEmails?.(latestEvent.affectedIds);
      setSelectedIds((currentIds) =>
        currentIds.filter((id) => !latestEvent.affectedIds.includes(id))
      );

      return {
        success: false,
        message:
          action === "archive"
            ? `Archived ${latestEvent.affectedIds.length.toLocaleString()} email${
                latestEvent.affectedIds.length === 1 ? "" : "s"
              } \u2022 ${latestEvent.failed.toLocaleString()} failed`
            : action === "delete"
              ? `Deleted ${latestEvent.affectedIds.length.toLocaleString()} email${
                  latestEvent.affectedIds.length === 1 ? "" : "s"
                } \u2022 ${latestEvent.failed.toLocaleString()} failed`
              : `Exported ${latestEvent.affectedIds.length.toLocaleString()} email${
                  latestEvent.affectedIds.length === 1 ? "" : "s"
                } \u2022 ${latestEvent.failed.toLocaleString()} failed`,
      };
    }

    if (latestEvent.type !== "completed") {
      throw new Error("Execution ended before completion.");
    }

    if (action === "export" && latestEvent.fileBase64) {
      downloadBase64File(latestEvent.fileBase64, latestEvent.fileName ?? "emails-export.zip");
    }

    if (action === "archive" || action === "delete") {
      onRemoveEmails?.(latestEvent.affectedIds);
      setSelectedIds((currentIds) =>
        currentIds.filter((id) => !latestEvent.affectedIds.includes(id))
      );
    }

    const elapsedSeconds = latestEvent.durationMs / 1000;

    return {
      success: true,
      message:
        action === "archive"
          ? `Archived ${latestEvent.processed.toLocaleString()} email${
              latestEvent.processed === 1 ? "" : "s"
            } in ${elapsedSeconds.toFixed(1)}s`
          : action === "delete"
            ? `Deleted ${latestEvent.processed.toLocaleString()} email${
                latestEvent.processed === 1 ? "" : "s"
              } in ${elapsedSeconds.toFixed(1)}s`
            : `Exported ${latestEvent.processed.toLocaleString()} email${
                latestEvent.processed === 1 ? "" : "s"
              } in ${elapsedSeconds.toFixed(1)}s`,
    };
  }

  function handleDeleteSelected() {
    if (!hasSelection) {
      setMessage({
        success: false,
        message: "Select at least one email to delete.",
      });
      return;
    }

    const idsToDelete = [...selectedIds];

    startTransition(() => {
      void (async () => {
        try {
          const result = await executeManualAction(idsToDelete, "delete");

          setMessage(result);
        } catch (error) {
          setBulkActionProgress(null);
          setMessage({
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to delete selected emails.",
          });
        }
      })();
    });
  }

  function handleArchiveSelected() {
    if (!hasSelection) {
      setMessage({
        success: false,
        message: "Select at least one email to archive.",
      });
      return;
    }

    const idsToArchive = [...selectedIds];

    startTransition(() => {
      void (async () => {
        try {
          const result = await executeManualAction(idsToArchive, "archive");

          setMessage(result);
        } catch (error) {
          setBulkActionProgress(null);
          setMessage({
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to archive selected emails.",
          });
        }
      })();
    });
  }

  function handleExportSelected() {
    if (!hasSelection) {
      setMessage({
        success: false,
        message: "Select at least one email to export.",
      });
      return;
    }

    const idsToExport = [...selectedIds];

    startTransition(() => {
      void (async () => {
        try {
          const result = await executeManualAction(idsToExport, "export");

          setMessage(result);
        } catch (error) {
          setBulkActionProgress(null);
          setMessage({
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to export selected emails.",
          });
        }
      })();
    });
  }

  return (
    <div className="dark:text-[#F5F5F5]">
      {heading || description ? (
        <div className="border-b border-[rgba(0,0,0,0.08)] px-6 py-4 dark:border-[#3F3F46]">
          {heading ? (
            <h2 className="text-base font-semibold tracking-tight text-gray-900 dark:text-[#F5F5F5]">
              {heading}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-1 text-xs text-gray-600 dark:text-[#A1A1AA]">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-b border-[rgba(0,0,0,0.08)] bg-white px-6 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
        <div className="text-sm text-gray-700 dark:text-[#A1A1AA]">
          Selected:{" "}
          <span className="font-semibold text-gray-900 dark:text-[#F5F5F5]">
            {selectedCount}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          {onAnalyzeResults ? (
            <button
              type="button"
              onClick={onAnalyzeResults}
              disabled={emails.length === 0 || isExecuting}
              className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
                emails.length > 0
                  ? "border-[#60A5FA]/40 bg-black/[0.03] text-[#2563EB] hover:bg-[#60A5FA] hover:text-white dark:bg-white/[0.04] dark:text-[#A1A1AA] dark:hover:text-white"
                  : "border-[rgba(0,0,0,0.08)] bg-black/[0.03] text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#71717A]"
              }`}
            >
              Analyze Results
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={!hasSelection || isExecuting}
            className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
              hasSelection
                ? "border-[#EF4444]/40 bg-black/[0.03] text-[#DC2626] hover:bg-[#EF4444] hover:text-white dark:bg-white/[0.04] dark:text-[#A1A1AA] dark:hover:text-white"
                : "border-[rgba(0,0,0,0.08)] bg-black/[0.03] text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#71717A]"
            }`}
          >
            {isExecuting ? "Working..." : "Delete Selected"}
          </button>

          <button
            type="button"
            onClick={handleArchiveSelected}
            disabled={!hasSelection || isExecuting}
            className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
              hasSelection
                ? "border-[#A78BFA]/40 bg-black/[0.03] text-[#7C3AED] hover:bg-[#A78BFA] hover:text-white dark:bg-white/[0.04] dark:text-[#A1A1AA] dark:hover:text-white"
                : "border-[rgba(0,0,0,0.08)] bg-black/[0.03] text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#71717A]"
            }`}
          >
            {isExecuting ? "Working..." : "Archive Selected"}
          </button>

          {showExportSelected ? (
            <ExportSelectedButton
              selectedMessageIds={selectedIds}
              onExecute={handleExportSelected}
              disabled={isExecuting}
            />
          ) : null}
        </div>
      </div>

      {notification ? (
        <NotificationBanner notification={notification} />
      ) : null}

      {emails.length === 0 ? (
        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-[#A1A1AA]">
            No emails found in your inbox.
          </p>
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(0,0,0,0.08)] bg-white dark:border-[#3F3F46] dark:bg-[#232326]">
              <th className="w-12 px-6 py-3 text-left">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAllEmails}
                  aria-label="Select all emails"
                  className="h-3.5 w-3.5 appearance-none rounded-full border border-gray-300 bg-white transition checked:border-[#D97706] checked:bg-[#D97706] focus:ring-2 focus:ring-[#D97706]/30 dark:border-[#3F3F46] dark:bg-[#18181B] dark:checked:border-[#D97706] dark:checked:bg-[#D97706]"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-[#71717A]">
                From
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-[#71717A]">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-[#71717A]">
                Date
              </th>
              {onViewEmail ? (
                <th className="w-20 px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-[#71717A]">
                  Action
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {emails.map((email) => {
              const checked = selectedIds.includes(email.id);

              return (
                <tr
                  key={email.id}
                  className={`border-b border-[rgba(0,0,0,0.08)] transition dark:border-[#3F3F46] ${
                    checked
                      ? "border-[#D97706]/35 bg-[#D97706]/10 shadow-[inset_3px_0_0_#D97706] dark:border-[#D97706]/35 dark:bg-[#D97706]/[0.12]"
                      : "hover:bg-white dark:hover:bg-[#2A2A2E]"
                  }`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEmail(email.id)}
                      aria-label={`Select email from ${email.sender}`}
                      className="h-3.5 w-3.5 appearance-none rounded-full border border-gray-300 bg-white transition checked:border-[#D97706] checked:bg-[#D97706] focus:ring-2 focus:ring-[#D97706]/30 dark:border-[#3F3F46] dark:bg-[#18181B] dark:checked:border-[#D97706] dark:checked:bg-[#D97706]"
                    />
                  </td>
                  <td className="max-w-[240px] truncate px-6 py-4 text-sm font-medium text-[#D97706] dark:text-[#D97706]">
                    {email.sender}
                  </td>
                  <td className="max-w-[360px] truncate px-6 py-4 text-sm text-gray-900 dark:text-[#F5F5F5]">
                    {email.subject}
                  </td>
                  <td className="px-6 py-4 text-xs leading-5 text-gray-600 dark:text-[#A1A1AA]">
                    {email.date}
                  </td>
                  {onViewEmail ? (
                    <td className="px-6 py-4 text-sm">
                      <button
                        type="button"
                        onClick={() => onViewEmail(email.id)}
                        className="inline-flex h-8 items-center rounded-full border border-[rgba(0,0,0,0.08)] px-3 text-xs font-medium text-gray-700 transition hover:bg-[#F3F3F3] dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#18181B] dark:hover:text-[#F5F5F5]"
                      >
                        View
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {onLoadMore ? (
        <div className="border-t border-[rgba(0,0,0,0.08)] px-6 py-4 dark:border-[#3F3F46]">
          <button
            type="button"
            onClick={() => {
              void onLoadMore();
            }}
            disabled={!hasMore || isLoadingMore}
            className="inline-flex h-8 items-center rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3F3F46] dark:bg-[#232326] dark:text-[#F5F5F5] dark:hover:bg-[#2A2A2E]"
          >
            {isLoadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getLoadingLabel(action: BulkActionProgress["action"]): string {
  if (action === "delete") {
    return "Deleting";
  }

  if (action === "export") {
    return "Exporting";
  }

  return "Archiving";
}

function formatEta(input: {
  completed: number;
  total: number;
  etaSeconds: number | null;
}): string {
  if (input.completed <= 0) {
    return "ETA calculating";
  }

  if (input.etaSeconds === null) {
    return "ETA calculating";
  }

  return `ETA ${input.etaSeconds.toFixed(1)}s`;
}

function getProgressAccentClasses(action: BulkActionProgress["action"]): {
  container: string;
  track: string;
  bar: string;
  text: string;
} {
  if (action === "delete") {
    return {
      container:
        "border-red-200 bg-red-50 text-red-700 dark:border-[#5F3333] dark:bg-[#2D1F1F] dark:text-red-300",
      track: "bg-red-100 dark:bg-[#3A2424]",
      bar: "bg-[#EF4444]",
      text: "text-red-700 dark:text-red-300",
    };
  }

  if (action === "export") {
    return {
      container:
        "border-green-200 bg-green-50 text-green-700 dark:border-[#315341] dark:bg-[#1F2D26] dark:text-green-300",
      track: "bg-green-100 dark:bg-[#213729]",
      bar: "bg-[#22C55E]",
      text: "text-green-700 dark:text-green-300",
    };
  }

  return {
    container:
      "border-orange-200 bg-orange-50 text-[#D97706] dark:border-[#5A3A16] dark:bg-[#2F261B] dark:text-[#FBBF24]",
    track: "bg-orange-100 dark:bg-[#3A2D1C]",
    bar: "bg-[#D97706]",
    text: "text-[#D97706] dark:text-[#FBBF24]",
  };
}

function NotificationBanner({
  notification,
}: {
  notification: NotificationState;
}) {
  if (notification.type === "loading") {
    const percentage =
      notification.total > 0
        ? Math.min((notification.completed / notification.total) * 100, 100)
        : 0;
    const accent = getProgressAccentClasses(notification.action);

    return (
      <div className={`border-b px-6 py-3 text-sm ${accent.container}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 font-medium">
            {getLoadingLabel(notification.action)}{" "}
            {notification.total.toLocaleString()} Email
            {notification.total === 1 ? "" : "s"}
          </span>
          <div
            className={`h-2 min-w-24 flex-1 overflow-hidden rounded-full ${accent.track}`}
          >
            <div
              className={`h-full rounded-full ${accent.bar}`}
              style={{
                width: `${percentage}%`,
                transition: "width 300ms ease",
              }}
            />
          </div>
          <span className={`shrink-0 font-medium ${accent.text}`}>
            {Math.round(percentage)}%
          </span>
          <span className="shrink-0">
            {notification.completed.toLocaleString()}/
            {notification.total.toLocaleString()} processed
          </span>
          <span className="shrink-0">{formatEta(notification)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-b px-6 py-3 text-sm ${
        notification.type === "success"
          ? "border-green-200 bg-green-50 text-green-700 dark:border-[#315341] dark:bg-[#1F2D26] dark:text-green-300"
          : "border-red-200 bg-red-50 text-red-700 dark:border-[#5F3333] dark:bg-[#2D1F1F] dark:text-red-300"
      }`}
    >
      {notification.type === "success" ? "\u2713 " : "\u2715 "}
      {notification.message}
    </div>
  );
}
