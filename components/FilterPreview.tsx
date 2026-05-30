"use client";

import { useEffect, useMemo, useState } from "react";
import type { Email } from "@/types/email";

export type FilterPreviewEmail = Email & {
  id: string;
  sender: string;
  subject: string;
  date: string;
  snippet?: string;
};

type FilterPreviewProps = {
  totalMatches: number;
  emails: Email[];
  isLoading?: boolean;
  error?: string | null;
  onArchiveSelected: (ids: string[]) => Promise<void>;
  onDeleteSelected: (ids: string[]) => Promise<void>;
  onRefreshPreview: () => Promise<void>;
};

export function FilterPreview({
  totalMatches,
  emails,
  isLoading = false,
  error = null,
  onArchiveSelected,
  onDeleteSelected,
  onRefreshPreview,
}: FilterPreviewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmData, setDeleteConfirmData] = useState<{
    count: number;
  } | null>(null);

  const emailIds = useMemo(() => emails.map((email) => email.id), [emails]);

  const selectedCount = selectedIds.size;
  const hasEmails = emails.length > 0;
  const allSelected = hasEmails && selectedCount === emails.length;

  useEffect(() => {
    setSelectedIds((currentSelectedIds) => {
      const validIds = new Set(emailIds);
      const nextSelectedIds = new Set<string>();

      currentSelectedIds.forEach((id) => {
        if (validIds.has(id)) {
          nextSelectedIds.add(id);
        }
      });

      return nextSelectedIds;
    });
  }, [emailIds]);

  function toggleEmailSelection(emailId: string) {
    setActionError(null);
    setActionMessage(null);

    setSelectedIds((currentSelectedIds) => {
      const nextSelectedIds = new Set(currentSelectedIds);

      if (nextSelectedIds.has(emailId)) {
        nextSelectedIds.delete(emailId);
      } else {
        nextSelectedIds.add(emailId);
      }

      return nextSelectedIds;
    });
  }

  function selectAllEmails() {
    setActionError(null);
    setActionMessage(null);
    setSelectedIds(new Set(emailIds));
  }

  function clearSelection() {
    setActionError(null);
    setActionMessage(null);
    setSelectedIds(new Set());
  }

  async function handleArchiveSelected() {
    await runSelectedAction("archive");
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) {
      setActionError("Select at least one email.");
      return;
    }

    setDeleteConfirmData({ count: selectedIds.size });
  }

  async function confirmDelete() {
    setDeleteConfirmData(null);
    await runSelectedAction("delete");
  }

  function cancelDelete() {
    setDeleteConfirmData(null);
  }

  async function runSelectedAction(action: "archive" | "delete") {
    setActionError(null);
    setActionMessage(null);

    if (selectedIds.size === 0) {
      setActionError("Select at least one email.");
      return;
    }

    const ids = Array.from(selectedIds);

    try {
      setIsSubmitting(true);

      if (action === "archive") {
        await onArchiveSelected(ids);
        setActionMessage(
          ids.length === 1
            ? "Archived 1 selected email."
            : `Archived ${ids.length} selected emails.`
        );
      } else {
        await onDeleteSelected(ids);
        setActionMessage(
          ids.length === 1
            ? "Moved 1 selected email to Trash."
            : `Moved ${ids.length} selected emails to Trash.`
        );
      }

      setSelectedIds(new Set());
      await onRefreshPreview();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : action === "archive"
            ? "Failed to archive selected emails."
            : "Failed to delete selected emails.";

      setActionError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-600">Loading preview results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-medium text-red-700">Failed to load preview.</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!hasEmails) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-600">No matching emails found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">
            Found {emails.length} {emails.length === 1 ? "email" : "emails"}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Selected:{" "}
            <span className="font-semibold">
              {selectedCount} of {emails.length} previewed
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllEmails}
            disabled={isSubmitting || allSelected}
            className="rounded-md border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Select All
          </button>

          <button
            type="button"
            onClick={clearSelection}
            disabled={isSubmitting || selectedCount === 0}
            className="rounded-md border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Selection
          </button>

          <button
            type="button"
            onClick={handleArchiveSelected}
            disabled={isSubmitting || selectedCount === 0}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Archiving..." : "Archive Selected"}
          </button>

          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={isSubmitting || selectedCount === 0}
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Deleting..." : "Delete Selected"}
          </button>
        </div>
      </div>

      {actionError ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">{actionError}</p>
        </div>
      ) : null}

      {actionMessage ? (
        <div className="border-b border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-green-700">{actionMessage}</p>
        </div>
      ) : null}

      {deleteConfirmData ? (
        <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-3">
          <p className="text-sm font-medium text-yellow-800">
            Move {deleteConfirmData.count}{" "}
            {deleteConfirmData.count === 1 ? "email" : "emails"} to Trash?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmDelete}
              className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={cancelDelete}
              className="rounded-md border px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => {
                    if (allSelected) {
                      clearSelection();
                    } else {
                      selectAllEmails();
                    }
                  }}
                  disabled={isSubmitting}
                  aria-label="Select all preview emails"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Sender
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Subject
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Date
              </th>
            </tr>
          </thead>

          <tbody>
            {emails.map((email) => {
              const isSelected = selectedIds.has(email.id);

              return (
                <tr
                  key={email.id}
                  className={`border-b transition-colors ${
                    isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleEmailSelection(email.id)}
                      disabled={isSubmitting}
                      aria-label={`Select email from ${email.sender}`}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>

                  <td className="max-w-xs px-4 py-3 text-sm text-gray-900">
                    <div className="truncate" title={email.sender}>
                      {email.sender || "Unknown sender"}
                    </div>
                  </td>

                  <td className="max-w-md px-4 py-3 text-sm text-gray-900">
                    <div className="truncate" title={email.subject}>
                      {email.subject || "(No subject)"}
                    </div>
                    {email.snippet ? (
                      <div className="mt-1 truncate text-xs text-gray-500">
                        {email.snippet}
                      </div>
                    ) : null}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {email.date || "Unknown date"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
