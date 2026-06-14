"use client";

import { useMemo, useState, useTransition } from "react";
import { Archive, Inbox, Trash } from "lucide-react";
import { loadInboxPageAction } from "@/app/actions/inbox-actions";
import {
  EmailTable,
  type EmailTableActionConfig,
} from "@/components/EmailTable";
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
  nextPageToken?: string;
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
  onPreview: (
    filter: EmailFilter,
    pageToken?: string
  ) => Promise<FilterActionResult>;
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
type MailboxTab = NonNullable<EmailFilter["mailbox"]>;

const mailboxTabs: Array<{
  value: MailboxTab;
  label: string;
  icon: typeof Inbox;
}> = [
  { value: "inbox", label: "Inbox", icon: Inbox },
  { value: "archive", label: "Archive", icon: Archive },
  { value: "trash", label: "Trash", icon: Trash },
];

const actionStyles = {
  archive:
    "border-[#A78BFA]/40 bg-black/[0.03] text-[#7C3AED] hover:bg-[#A78BFA] hover:text-white dark:bg-white/[0.04] dark:text-[#A1A1AA] dark:hover:text-white",
  delete:
    "border-[#EF4444]/40 bg-black/[0.03] text-[#DC2626] hover:bg-[#EF4444] hover:text-white dark:bg-white/[0.04] dark:text-[#A1A1AA] dark:hover:text-white",
  orange:
    "border-[#D97706]/40 bg-black/[0.03] text-[#D97706] hover:bg-[#D97706] hover:text-white dark:bg-white/[0.04] dark:text-[#A1A1AA] dark:hover:text-white",
};

function getMailboxActions(mailbox: MailboxTab): EmailTableActionConfig[] {
  if (mailbox === "archive") {
    return [
      {
        action: "restore_inbox",
        label: "Move To Inbox",
        emptySelectionMessage: "Select at least one email to move to Inbox.",
        failureMessage: "Failed to move selected emails to Inbox.",
        activeClassName: actionStyles.orange,
      },
      {
        action: "delete",
        label: "Move To Trash",
        emptySelectionMessage: "Select at least one email to move to Trash.",
        failureMessage: "Failed to move selected emails to Trash.",
        activeClassName: actionStyles.delete,
      },
    ];
  }

  if (mailbox === "trash") {
    return [
      {
        action: "restore_inbox",
        label: "Restore To Inbox",
        emptySelectionMessage: "Select at least one email to restore.",
        failureMessage: "Failed to restore selected emails.",
        activeClassName: actionStyles.orange,
      },
      {
        action: "delete_forever",
        label: "Delete Forever",
        emptySelectionMessage: "Select at least one email to delete forever.",
        failureMessage: "Failed to permanently delete selected emails.",
        activeClassName: actionStyles.delete,
      },
    ];
  }

  return [
    {
      action: "archive",
      label: "Archive",
      emptySelectionMessage: "Select at least one email to archive.",
      failureMessage: "Failed to archive selected emails.",
      activeClassName: actionStyles.archive,
    },
    {
      action: "delete",
      label: "Move To Trash",
      emptySelectionMessage: "Select at least one email to move to Trash.",
      failureMessage: "Failed to move selected emails to Trash.",
      activeClassName: actionStyles.delete,
    },
  ];
}

function getMailboxHeading(mailbox: MailboxTab): string {
  if (mailbox === "archive") {
    return "Archive Emails";
  }

  if (mailbox === "trash") {
    return "Trash Emails";
  }

  return "Inbox Emails";
}

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
  const [activeMailbox, setActiveMailbox] = useState<MailboxTab>("inbox");
  const [nextPageToken, setNextPageToken] = useState(initialNextPageToken);
  const [totalMatches, setTotalMatches] = useState(initialEmails.length);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(loadError);
  const [viewingEmailId, setViewingEmailId] = useState<string | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiSelectedIds, setAiSelectedIds] = useState<string[]>([]);
  const [isExecutingAiAction, setIsExecutingAiAction] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearchFilter, setActiveSearchFilter] =
    useState<EmailFilter | null>(null);
  const [isLoadingMore, startLoadMoreTransition] = useTransition();

  const selectedEmailMetadata = useMemo(
    () =>
      aiSelectedIds
        .map((id) => emails.find((email) => email.id === id))
        .filter((email): email is Email => Boolean(email))
        .map((email) => ({
          id: email.id,
          sender: email.sender || "Unknown sender",
          subject: email.subject || "(No subject)",
          snippet: email.snippet || "",
          date: email.date || "Unknown date",
        })),
    [aiSelectedIds, emails]
  );
  const aiEmailsForAnalysis = useMemo(
    () => selectedEmailMetadata.slice(0, 100),
    [selectedEmailMetadata]
  );

  const mailboxActions = useMemo(
    () => getMailboxActions(activeMailbox),
    [activeMailbox]
  );

  function handleSearchResults(data: PreviewData, _filter: EmailFilter, nextMessage?: string) {
    setEmails(data.emails);
    setMode("search");
    setTotalMatches(data.totalMatches);
    setNextPageToken(data.nextPageToken);
    setMessage(nextMessage ?? null);
    setError(null);
    setIsAiOpen(false);
    setAiSelectedIds([]);
  }

  async function handleClearSearch() {
    setMode("latest");
    setMessage(null);
    setError(null);
    setIsAiOpen(false);
    setAiSelectedIds([]);
    setActiveSearchFilter(null);
    setIsSearching(true);

    try {
      const result = await loadInboxPageAction(undefined, activeMailbox);

      if (!result.ok) {
        setEmails(initialEmails);
        setTotalMatches(initialEmails.length);
        setNextPageToken(initialNextPageToken);
        setError(result.error);
        return;
      }

      setEmails(result.data.emails);
      setTotalMatches(result.data.emails.length);
      setNextPageToken(result.data.nextPageToken);
    } finally {
      setIsSearching(false);
    }
  }

  function buildFilterFromSearchValues(
    values: InboxSearchFormValues
  ): EmailFilter | null {
    const filter: EmailFilter = {
      mailbox: activeMailbox,
    };
    const trimmedQuery = values.query.trim();
    const trimmedSender = values.sender.trim();
    const trimmedSubject = values.subject.trim();
    const trimmedOlderThanDays = values.olderThanDays.trim();

    if (trimmedSender) {
      filter.sender = trimmedSender;
    }

    if (trimmedQuery) {
      filter.query = trimmedQuery;
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

    if (values.hasAttachment) {
      filter.hasAttachment = true;
    }

    const hasAnyFilter =
      Boolean(filter.sender) ||
      Boolean(filter.query) ||
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

      setActiveSearchFilter(filter);
      handleSearchResults(result.data, filter, result.message);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleMailboxChange(nextMailbox: MailboxTab) {
    if (nextMailbox === activeMailbox && mode === "latest") {
      return;
    }

    setActiveMailbox(nextMailbox);
    setMode("latest");
    setMessage(null);
    setError(null);
    setIsAiOpen(false);
    setAiSelectedIds([]);
    setActiveSearchFilter(null);
    setIsSearching(true);

    try {
      const result = await loadInboxPageAction(undefined, nextMailbox);

      if (!result.ok) {
        setEmails([]);
        setTotalMatches(0);
        setNextPageToken(undefined);
        setError(result.error);
        return;
      }

      setEmails(result.data.emails);
      setTotalMatches(result.data.emails.length);
      setNextPageToken(result.data.nextPageToken);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleLoadMore() {
    if (!nextPageToken) {
      return;
    }

    if (mode === "search" && !activeSearchFilter) {
      return;
    }

    startLoadMoreTransition(() => {
      void (async () => {
        if (mode === "search" && activeSearchFilter) {
          const result = await onPreview(activeSearchFilter, nextPageToken);

          if (!result.ok) {
            setError(result.error);
            return;
          }

          setEmails((currentEmails) => [
            ...currentEmails,
            ...result.data.emails,
          ]);
          setTotalMatches(result.data.totalMatches);
          setNextPageToken(result.data.nextPageToken);
          setError(null);
          return;
        }

        const result = await loadInboxPageAction(nextPageToken, activeMailbox);

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

  async function executeAiAction(
    action: "archive" | "delete",
    includedIds?: string[]
  ) {
    const ids = (includedIds ?? aiSelectedIds).filter((id) =>
      emails.some((email) => email.id === id)
    );

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
        setAiSelectedIds([]);
      }
    } finally {
      setIsExecutingAiAction(false);
    }
  }

  const tableDescription =
    mode === "search"
      ? `Showing ${emails.length.toLocaleString()} of ${totalMatches.toLocaleString()} matching email${totalMatches === 1 ? "" : "s"}.`
      : `Showing latest ${emails.length} ${activeMailbox} email${emails.length === 1 ? "" : "s"}.`;

  return (
    <>
      <InboxSearchHeader
        isSearching={isSearching}
        isSearchActive={mode === "search"}
        resultCount={mode === "search" ? totalMatches : emails.length}
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

      <div className="flex items-center justify-center gap-3">
        {mailboxTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMailbox === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                void handleMailboxChange(tab.value);
              }}
              aria-label={tab.label}
              title={tab.label}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition hover:cursor-pointer ${
                isActive
                  ? "border-[#D97706]/60 bg-[#D97706]/10 text-[#D97706] shadow-[0_0_18px_rgba(217,119,6,0.28)] dark:border-[#D97706]/60 dark:bg-[#D97706]/[0.14] dark:text-[#FBBF24] dark:shadow-[0_0_22px_rgba(217,119,6,0.24)]"
                  : "border-[rgba(0,0,0,0.08)] bg-white text-gray-600 hover:border-[#D97706]/35 hover:text-[#D97706] hover:shadow-[0_0_14px_rgba(217,119,6,0.16)] dark:border-[#3F3F46] dark:bg-[#232326] dark:text-[#A1A1AA] dark:hover:border-[#D97706]/40 dark:hover:text-[#FBBF24]"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#F3F3F3] shadow-sm dark:border-[#3F3F46] dark:bg-[#232326] dark:shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
        <EmailTable
          emails={emails}
          onDeleteSelected={onDeleteSelected}
          onArchiveSelected={onArchiveSelected}
          actions={mailboxActions}
          onRemoveEmails={(ids) => {
            setEmails((currentEmails) =>
              currentEmails.filter((email) => !ids.includes(email.id))
            );
            setTotalMatches((currentTotal) =>
              Math.max(currentTotal - ids.length, 0)
            );
          }}
          heading={getMailboxHeading(activeMailbox)}
          description={tableDescription}
          onViewEmail={setViewingEmailId}
          onLoadMore={handleLoadMore}
          hasMore={Boolean(nextPageToken)}
          isLoadingMore={isLoadingMore}
          showExportSelected
          onAnalyzeResults={(ids) => {
            setAiSelectedIds(ids);
            setIsAiOpen(true);
          }}
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
        emails={aiEmailsForAnalysis}
        totalEmailsFound={selectedEmailMetadata.length}
        isExecuting={isExecutingAiAction}
        onClose={() => setIsAiOpen(false)}
        onArchiveResults={(includedIds) => {
          void executeAiAction("archive", includedIds);
        }}
        onMoveResultsToTrash={(includedIds) => {
          void executeAiAction("delete", includedIds);
        }}
      />
    </>
  );
}
