"use client";

import { useMemo, useState, useTransition } from "react";
import { loadInboxPageAction } from "@/app/actions/inbox-actions";
import { EmailTable } from "@/components/EmailTable";
import { EmailViewer } from "@/components/EmailViewer";
import { InboxAIAnalysisModal } from "@/components/InboxAIAnalysisModal";
import {
  InboxSearchHeader,
  type InboxSearchFormValues,
} from "@/components/InboxSearchHeader";
import type { Email, EmailActionResult } from "@/types/email";
import type { EmailFilter } from "@/types/filter";

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

type InboxWorkspaceProps = {
  initialEmails: Email[];
  initialNextPageToken?: string;
  loadError?: string | null;
  onPreview: (filter: EmailFilter) => Promise<FilterActionResult>;
  onArchive: (
    filter: EmailFilter,
    emailIds: string[]
  ) => Promise<FilterActionResult>;
  onDelete: (
    filter: EmailFilter,
    emailIds: string[]
  ) => Promise<FilterActionResult>;
  onDeleteSelected: (ids: string[]) => Promise<EmailActionResult>;
  onArchiveSelected: (ids: string[]) => Promise<EmailActionResult>;
};

type InboxMode = "latest" | "search";

export function InboxWorkspace({
  initialEmails,
  initialNextPageToken,
  loadError = null,
  onPreview,
  onDeleteSelected,
  onArchiveSelected,
}: InboxWorkspaceProps) {
  const [emails, setEmails] = useState(initialEmails);
  const [mode, setMode] = useState<InboxMode>("latest");
  const [nextPageToken, setNextPageToken] = useState(initialNextPageToken);
  const [totalMatches, setTotalMatches] = useState(initialEmails.length);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(loadError);
  const [viewingEmailId, setViewingEmailId] = useState<string | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isExecutingAiAction, setIsExecutingAiAction] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, startLoadMoreTransition] = useTransition();

  const emailMetadata = useMemo(
    () =>
      emails.map((email) => ({
        sender: email.sender || "Unknown sender",
        subject: email.subject || "(No subject)",
        snippet: email.snippet || "",
        date: email.date || "Unknown date",
      })),
    [emails]
  );

  function handleSearchResults(data: PreviewData, _filter: EmailFilter, nextMessage?: string) {
    setEmails(data.emails);
    setMode("search");
    setTotalMatches(data.totalMatches);
    setNextPageToken(undefined);
    setMessage(nextMessage ?? null);
    setError(null);
    setIsAiOpen(false);
  }

  function handleClearSearch() {
    setEmails(initialEmails);
    setMode("latest");
    setTotalMatches(initialEmails.length);
    setNextPageToken(initialNextPageToken);
    setMessage(null);
    setError(loadError);
    setIsAiOpen(false);
  }

  function buildFilterFromSearchValues(
    values: InboxSearchFormValues
  ): EmailFilter | null {
    const filter: EmailFilter = {};
    const trimmedQuery = values.query.trim();
    const trimmedSender = values.sender.trim();
    const trimmedSubject = values.subject.trim();
    const trimmedOlderThanDays = values.olderThanDays.trim();

    if (trimmedSender) {
      filter.sender = trimmedSender;
    }

    if (trimmedSubject || trimmedQuery) {
      filter.subject = trimmedSubject || trimmedQuery;
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

    if (values.hasAttachment) {
      filter.hasAttachment = true;
    }

    const hasAnyFilter =
      Boolean(filter.sender) ||
      Boolean(filter.subject) ||
      Boolean(filter.olderThanDays) ||
      Boolean(filter.hasAttachment);

    if (!hasAnyFilter) {
      setError("Add at least one search term or filter before searching.");
      return null;
    }

    return filter;
  }

  async function handleCompactSearch(values: InboxSearchFormValues) {
    setError(null);
    setMessage(null);

    const filter = buildFilterFromSearchValues(values);

    if (!filter) {
      return;
    }

    setIsSearching(true);

    try {
      const result = await onPreview(filter);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      handleSearchResults(result.data, filter, result.message);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleLoadMore() {
    if (!nextPageToken || mode !== "latest") {
      return;
    }

    startLoadMoreTransition(() => {
      void (async () => {
        const result = await loadInboxPageAction(nextPageToken);

        if (!result.ok) {
          setError(result.error);
          return;
        }

        setEmails((currentEmails) => [
          ...currentEmails,
          ...result.data.emails,
        ]);
        setTotalMatches((currentTotal) => currentTotal + result.data.emails.length);
        setNextPageToken(result.data.nextPageToken);
        setError(null);
      })();
    });
  }

  async function executeAiAction(action: "archive" | "delete") {
    const ids = emails.map((email) => email.id);

    if (ids.length === 0) {
      return;
    }

    setIsExecutingAiAction(true);

    try {
      const result =
        action === "archive"
          ? await onArchiveSelected(ids)
          : await onDeleteSelected(ids);

      setMessage(result.message);

      if (result.success) {
        setIsAiOpen(false);
      }
    } finally {
      setIsExecutingAiAction(false);
    }
  }

  const tableDescription =
    mode === "search"
      ? `Showing ${emails.length} search result${emails.length === 1 ? "" : "s"}.`
      : `Showing latest ${emails.length} inbox email${emails.length === 1 ? "" : "s"}.`;

  return (
    <>
      <InboxSearchHeader
        isSearching={isSearching}
        resultCount={emails.length}
        onSearch={handleCompactSearch}
        onReset={handleClearSearch}
      />

      {message ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-[#315341] dark:bg-[#1F2D26] dark:text-green-300">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-[#5F3333] dark:bg-[#2D1F1F] dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#F3F3F3] shadow-sm dark:border-[#3F3F46] dark:bg-[#232326] dark:shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
        <EmailTable
          emails={emails}
          onDeleteSelected={onDeleteSelected}
          onArchiveSelected={onArchiveSelected}
          heading="Inbox Emails"
          description={tableDescription}
          onViewEmail={setViewingEmailId}
          onAnalyzeResults={() => setIsAiOpen(true)}
          onLoadMore={mode === "latest" ? handleLoadMore : undefined}
          hasMore={Boolean(nextPageToken)}
          isLoadingMore={isLoadingMore}
          showExportSelected
        />
      </div>

      {viewingEmailId ? (
        <EmailViewer
          messageId={viewingEmailId}
          onClose={() => setViewingEmailId(null)}
        />
      ) : null}

      <InboxAIAnalysisModal
        open={isAiOpen}
        emails={emailMetadata.slice(0, 100)}
        totalEmailsFound={totalMatches}
        isExecuting={isExecutingAiAction}
        onClose={() => setIsAiOpen(false)}
        onArchiveResults={() => {
          void executeAiAction("archive");
        }}
        onMoveResultsToTrash={() => {
          void executeAiAction("delete");
        }}
      />
    </>
  );
}
