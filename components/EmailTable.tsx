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
    <div>
      {heading || description ? (
        <div className="border-b px-6 py-4">
          {heading ? (
            <h2 className="text-lg font-semibold text-gray-900">
              {heading}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-b bg-gray-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-700">
          Selected:{" "}
          <span className="font-semibold text-gray-900">
            {selectedCount}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {onAnalyzeResults ? (
            <button
              type="button"
              onClick={onAnalyzeResults}
              disabled={emails.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              Analyze Results
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={!hasSelection || isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {isPending ? "Working..." : "Delete Selected"}
          </button>

          <button
            type="button"
            onClick={handleArchiveSelected}
            disabled={!hasSelection || isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
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
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.message}
        </div>
      ) : null}

      {emails.length === 0 ? (
        <div className="p-6">
          <p className="text-sm text-gray-600">
            No emails found in your inbox.
          </p>
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-white">
              <th className="w-12 px-6 py-3 text-left">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAllEmails}
                  aria-label="Select all emails"
                  className="h-4 w-4 rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                From
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Date
              </th>
              {onViewEmail ? (
                <th className="w-20 px-6 py-3 text-left text-sm font-semibold text-gray-900">
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
                  className="border-b hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEmail(email.id)}
                      aria-label={`Select email from ${email.sender}`}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {email.sender}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {email.subject}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {email.date}
                  </td>
                  {onViewEmail ? (
                    <td className="px-6 py-4 text-sm">
                      <button
                        type="button"
                        onClick={() => onViewEmail(email.id)}
                        className="font-medium text-blue-600 hover:text-blue-700"
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
        <div className="border-t px-6 py-4">
          <button
            type="button"
            onClick={() => {
              void onLoadMore();
            }}
            disabled={!hasMore || isLoadingMore}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      ) : null}

      {bulkActionProgress ? (
        <div className="border-b bg-blue-50 px-6 py-3 text-sm text-blue-700">
          Completed {bulkActionProgress.completed.toLocaleString()} of{" "}
          {bulkActionProgress.total.toLocaleString()} emails.
        </div>
      ) : null}
    </div>
  );
}
