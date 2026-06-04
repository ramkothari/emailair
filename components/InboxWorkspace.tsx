"use client";

import { useMemo, useState, useTransition } from "react";
import { loadInboxPageAction } from "@/app/actions/inbox-actions";
import { EmailTable } from "@/components/EmailTable";
import { EmailViewer } from "@/components/EmailViewer";
import { FilterBuilder } from "@/components/FilterBuilder";
import { InboxAIAnalysisModal } from "@/components/InboxAIAnalysisModal";
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
  onArchive,
  onDelete,
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
      <FilterBuilder
        onPreview={onPreview}
        onArchive={onArchive}
        onDelete={onDelete}
        renderPreview={false}
        onPreviewResult={handleSearchResults}
        onClearResults={handleClearSearch}
      />

      {message ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg bg-white shadow">
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
