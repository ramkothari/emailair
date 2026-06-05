"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExportSelectedButton } from "@/components/ExportSelectedButton";
import type { Email, EmailActionResult } from "@/types/email";

const BULK_ACTION_BATCH_SIZE = 25;
const BULK_ACTION_BATCH_DELAY_MS = 350;

type EmailTableProps = {
  emails: Email[];
  onDeleteSelected: (ids: string[]) => Promise<EmailActionResult>;
  onArchiveSelected: (ids: string[]) => Promise<EmailActionResult>;
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
  completed: number;
  total: number;
};

function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }

  return batches;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function EmailTable({
  emails,
  onDeleteSelected,
  onArchiveSelected,
  heading,
  description,
  onViewEmail,
  onAnalyzeResults,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  showExportSelected = false,
}: EmailTableProps) {
  const router = useRouter();
  const selectAllRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<EmailActionResult | null>(null);
  const [bulkActionProgress, setBulkActionProgress] =
    useState<BulkActionProgress | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCount = selectedIds.length;
  const allSelected = emails.length > 0 && selectedCount === emails.length;
  const hasSelection = selectedCount > 0;

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

  async function executeSelectedInBatches(
    ids: string[],
    action: "archive" | "delete"
  ): Promise<EmailActionResult> {
    const batches = createBatches(ids, BULK_ACTION_BATCH_SIZE);
    const failedMessages: string[] = [];
    let completed = 0;

    setBulkActionProgress({
      completed,
      total: ids.length,
    });

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batch = batches[batchIndex];
      const result =
        action === "archive"
          ? await onArchiveSelected(batch)
          : await onDeleteSelected(batch);

      completed += batch.length;
      setBulkActionProgress({
        completed,
        total: ids.length,
      });

      if (!result.success) {
        failedMessages.push(result.message);
      }

      if (batchIndex < batches.length - 1) {
        await sleep(BULK_ACTION_BATCH_DELAY_MS);
      }
    }

    setBulkActionProgress(null);

    if (failedMessages.length > 0) {
      return {
        success: false,
        message: failedMessages[0],
      };
    }

    return {
      success: true,
      message:
        action === "archive"
          ? `Archived ${ids.length} email${ids.length === 1 ? "" : "s"}.`
          : `Moved ${ids.length} email${ids.length === 1 ? "" : "s"} to Trash.`,
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
        const result = await executeSelectedInBatches(idsToDelete, "delete");

        setMessage(result);

        if (result.success) {
          setSelectedIds([]);
          router.refresh();
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
        const result = await executeSelectedInBatches(idsToArchive, "archive");

        setMessage(result);

        if (result.success) {
          setSelectedIds([]);
          router.refresh();
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
              disabled={emails.length === 0}
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
            disabled={!hasSelection || isPending}
            className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
              hasSelection
                ? "border-[#EF4444]/40 bg-black/[0.03] text-[#DC2626] hover:bg-[#EF4444] hover:text-white dark:bg-white/[0.04] dark:text-[#A1A1AA] dark:hover:text-white"
                : "border-[rgba(0,0,0,0.08)] bg-black/[0.03] text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#71717A]"
            }`}
          >
            {isPending ? "Working..." : "Delete Selected"}
          </button>

          <button
            type="button"
            onClick={handleArchiveSelected}
            disabled={!hasSelection || isPending}
            className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
              hasSelection
                ? "border-[#A78BFA]/40 bg-black/[0.03] text-[#7C3AED] hover:bg-[#A78BFA] hover:text-white dark:bg-white/[0.04] dark:text-[#A1A1AA] dark:hover:text-white"
                : "border-[rgba(0,0,0,0.08)] bg-black/[0.03] text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#71717A]"
            }`}
          >
            {isPending ? "Working..." : "Archive Selected"}
          </button>

          {showExportSelected ? (
            <ExportSelectedButton selectedMessageIds={selectedIds} />
          ) : null}
        </div>
      </div>

      {message ? (
        <div
          className={`border-b px-6 py-3 text-sm ${
            message.success
              ? "border-green-200 bg-green-50 text-green-700 dark:border-[#315341] dark:bg-[#1F2D26] dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-[#5F3333] dark:bg-[#2D1F1F] dark:text-red-300"
          }`}
        >
          {message.message}
        </div>
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
                  className="h-3.5 w-3.5 appearance-none rounded-full border border-gray-300 bg-white transition checked:border-[#D97706] checked:bg-[#D97706] focus:ring-2 focus:ring-[#D97706]/30 dark:border-[#3F3F46] dark:bg-[#18181B]"
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
                      className="h-3.5 w-3.5 appearance-none rounded-full border border-gray-300 bg-white transition checked:border-[#D97706] checked:bg-[#D97706] focus:ring-2 focus:ring-[#D97706]/30 dark:border-[#3F3F46] dark:bg-[#18181B]"
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
                        className="rounded-xl border border-[rgba(0,0,0,0.08)] px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-[#F3F3F3] dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#18181B] dark:hover:text-[#F5F5F5]"
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
            className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3F3F46] dark:bg-[#232326] dark:text-[#F5F5F5] dark:hover:bg-[#2A2A2E]"
          >
            {isLoadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      ) : null}

      {bulkActionProgress ? (
        <div className="border-b bg-blue-50 px-6 py-3 text-sm text-blue-700 dark:border-[#3F3F46] dark:bg-[#202834] dark:text-[#A1C0E4]">
          Completed {bulkActionProgress.completed.toLocaleString()} of{" "}
          {bulkActionProgress.total.toLocaleString()} emails.
        </div>
      ) : null}
    </div>
  );
}
