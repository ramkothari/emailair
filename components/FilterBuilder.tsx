"use client";

import { useState, useTransition } from "react";
import type { Email } from "@/types/email";
import type { EmailFilter } from "@/types/filter";
import { FilterPreview } from "@/components/FilterPreview";

type PreviewData = {
  totalMatches: number;
  emails: Email[];
};

type FilterActionResult =
  | {
      ok: true;
      data: PreviewData;
      message?: string;
    }
  | {
      ok: false;
      error: string;
    };

type FilterBuilderProps = {
  onPreview: (filter: EmailFilter) => Promise<FilterActionResult>;
  onArchive: (
    filter: EmailFilter,
    emailIds: string[]
  ) => Promise<FilterActionResult>;
  onDelete: (
    filter: EmailFilter,
    emailIds: string[]
  ) => Promise<FilterActionResult>;
  renderPreview?: boolean;
  onPreviewResult?: (
    data: PreviewData,
    filter: EmailFilter,
    message?: string
  ) => void;
  onClearResults?: () => void;
};

export function FilterBuilder({
  onPreview,
  renderPreview = true,
  onPreviewResult,
  onClearResults,
}: FilterBuilderProps) {
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [olderThanDays, setOlderThanDays] = useState("");
  const [hasAttachment, setHasAttachment] = useState(false);

  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewFilter, setPreviewFilter] = useState<EmailFilter | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  function resetPreviewState() {
    setPreview(null);
    setPreviewFilter(null);
    setError(null);
    setMessage(null);
  }

  function buildFilterFromForm(): EmailFilter | null {
    const filter: EmailFilter = {};

    const trimmedSender = sender.trim();
    const trimmedSubject = subject.trim();
    const trimmedOlderThanDays = olderThanDays.trim();

    if (trimmedSender) {
      filter.sender = trimmedSender;
    }

    if (trimmedSubject) {
      filter.subject = trimmedSubject;
    }

    if (trimmedOlderThanDays) {
      const parsedDays = Number(trimmedOlderThanDays);

      if (
        !Number.isFinite(parsedDays) ||
        !Number.isInteger(parsedDays) ||
        parsedDays <= 0
      ) {
        setError("Older Than Days must be a positive whole number.");
        return null;
      }

      filter.olderThanDays = parsedDays;
    }

    if (hasAttachment) {
      filter.hasAttachment = true;
    }

    const hasAnyFilter =
      Boolean(filter.sender) ||
      Boolean(filter.subject) ||
      Boolean(filter.olderThanDays) ||
      Boolean(filter.hasAttachment);

    if (!hasAnyFilter) {
      setError("Add at least one filter before previewing.");
      return null;
    }

    return filter;
  }

  function handlePreview() {
    setError(null);
    setMessage(null);

    const filter = buildFilterFromForm();

    if (!filter) {
      return;
    }

    startTransition(async () => {
      const result = await onPreview(filter);

      if (!result.ok) {
        setPreview(null);
        setPreviewFilter(null);
        setError(result.error);
        return;
      }

      setPreview(result.data);
      setPreviewFilter(filter);
      setMessage(result.message ?? null);
      onPreviewResult?.(result.data, filter, result.message);
    });
  }

  async function handleRefreshPreview() {
    if (!previewFilter) {
      return;
    }

    const result = await onPreview(previewFilter);

    if (!result.ok) {
      setPreview(null);
      setError(result.error);
      return;
    }

    setPreview(result.data);
  }

  function handleClear() {
    setSender("");
    setSubject("");
    setOlderThanDays("");
    setHasAttachment(false);
    resetPreviewState();
    onClearResults?.();
  }

  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Filter Builder</h2>
        <p className="mt-1 text-sm text-gray-500">
          Search Gmail using simple filters, preview matches, then manually
          archive or move previewed emails to Trash.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="sender"
            className="block text-sm font-medium text-gray-700"
          >
            Sender (Email or Name)
          </label>
          <input
            id="sender"
            type="text"
            value={sender}
            onChange={(event) => {
              setSender(event.target.value);
              resetPreviewState();
            }}
            placeholder="linkedin, amazon.com, john@example.com"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Gmail will search sender addresses and display names
          </p>
        </div>

        <div>
          <label
            htmlFor="subject"
            className="block text-sm font-medium text-gray-700"
          >
            Subject Contains
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              resetPreviewState();
            }}
            placeholder="invoice, receipt, password"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="olderThanDays"
            className="block text-sm font-medium text-gray-700"
          >
            Older Than Days
          </label>
          <input
            id="olderThanDays"
            type="number"
            min="1"
            step="1"
            value={olderThanDays}
            onChange={(event) => {
              setOlderThanDays(event.target.value);
              resetPreviewState();
            }}
            placeholder="30"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={hasAttachment}
              onChange={(event) => {
                setHasAttachment(event.target.checked);
                resetPreviewState();
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            Has Attachment
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Working..." : "Preview"}
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={isPending}
          className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Clear
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      {renderPreview && preview ? (
        <FilterPreview
          totalMatches={preview.totalMatches}
          emails={preview.emails}
          isLoading={isPending}
          error={error}
          onRefreshPreview={handleRefreshPreview}
        />
      ) : null}
    </section>
  );
}
