"use client";

import { useEffect, useMemo, useState } from "react";
import { executeBulkAction } from "@/app/actions/execution-actions";
import { AIActionCard } from "@/components/AIActionCard";
import { AIAnalysisCard } from "@/components/AIAnalysisCard";
import { EmailViewer } from "@/components/EmailViewer";
import { ExecutionConfirmationModal } from "@/components/ExecutionConfirmationModal";
import { ExecutionResultModal } from "@/components/ExecutionResultModal";
import { ExportSelectedButton } from "@/components/ExportSelectedButton";
import type { AnalyzeSearchResponse } from "@/components/AIAnalysisCard";
import type { EmailMetadata } from "@/lib/ai";
import type { ActionType, ExecuteActionResult } from "@/lib/executor/types";
import type { Email } from "@/types/email";

const AI_ANALYSIS_EMAIL_LIMIT = 100;
const EXECUTION_LIMIT = 100;
const EXECUTION_LIMIT_MESSAGE =
  "Archive and Move To Trash support up to 100 emails per execution. Please narrow your search or select fewer emails.";

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
  onRefreshPreview: () => Promise<void>;
};

type SupportedExecutionAction = Extract<ActionType, "archive" | "delete">;

type ExecutionTarget = {
  action: SupportedExecutionAction;
  ids: string[];
  riskLevel?: string | null;
};

function normalizeExecutionIds(ids: string[]): string[] {
  return Array.from(
    new Set(
      ids
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  );
}

export function FilterPreview({
  totalMatches,
  emails,
  isLoading = false,
  error = null,
  onRefreshPreview,
}: FilterPreviewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewingEmailId, setViewingEmailId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeSearchResponse | null>(null);
  const [executionTarget, setExecutionTarget] = useState<ExecutionTarget | null>(null);
  const [resultTarget, setResultTarget] = useState<ExecutionTarget | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecuteActionResult | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  const emailIds = useMemo(() => emails.map((email) => email.id), [emails]);
  const searchResultEmailIds = useMemo(
    () => Array.from(new Set(emails.map((email) => email.id))),
    [emails]
  );
  const selectedCount = selectedIds.size;
  const hasEmails = emails.length > 0;
  const allSelected = hasEmails && selectedCount === emails.length;
  const riskLevel = analysisResult?.risk.riskLevel ?? null;

  const emailMetadata: EmailMetadata[] = useMemo(
    () =>
      emails.map((email) => ({
        sender: email.sender || "Unknown sender",
        subject: email.subject || "(No subject)",
        snippet: email.snippet || "",
        date: email.date || "Unknown date",
      })),
    [emails]
  );

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
    setSelectedIds(new Set(emailIds));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function requestExecution(
    action: SupportedExecutionAction,
    ids: string[],
    targetRiskLevel?: string | null
  ) {
    const normalizedIds = normalizeExecutionIds(ids);

    setExecutionError(null);

    if (normalizedIds.length === 0) {
      setExecutionError("Select at least one email to continue.");
      setExecutionResult(null);
      setResultTarget({ action, ids: [], riskLevel: targetRiskLevel });
      return;
    }

    if (normalizedIds.length > EXECUTION_LIMIT) {
      setExecutionError(EXECUTION_LIMIT_MESSAGE);
      setExecutionResult(null);
      setResultTarget({ action, ids: normalizedIds, riskLevel: targetRiskLevel });
      return;
    }

    setExecutionTarget({
      action,
      ids: normalizedIds,
      riskLevel: targetRiskLevel,
    });
  }

  async function confirmExecution() {
    if (!executionTarget) {
      return;
    }

    setIsExecutingAction(true);
    setExecutionError(null);

    try {
      const response = await executeBulkAction({
        action: executionTarget.action,
        emailIds: executionTarget.ids,
      });

      setResultTarget(executionTarget);
      setExecutionTarget(null);

      if (!response.ok) {
        setExecutionResult(null);
        setExecutionError(response.error);
        return;
      }

      setExecutionResult(response.result);

      if (response.result.succeeded === response.result.total) {
        setSelectedIds(new Set());
        await onRefreshPreview();
      }
    } catch (error) {
      setResultTarget(executionTarget);
      setExecutionTarget(null);
      setExecutionResult(null);
      setExecutionError(
        error instanceof Error
          ? error.message
          : "Execution failed. Please try again."
      );
    } finally {
      setIsExecutingAction(false);
    }
  }

  function retryFailedExecution() {
    if (!resultTarget || !executionResult?.failedIds.length) {
      return;
    }

    setExecutionResult(null);
    setExecutionError(null);
    setResultTarget(null);
    setExecutionTarget({
      action: resultTarget.action,
      ids: executionResult.failedIds,
      riskLevel: resultTarget.riskLevel,
    });
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

  const actionModalAction =
    executionTarget?.action ?? resultTarget?.action ?? "archive";

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">
            Found {emails.length} {emails.length === 1 ? "email" : "emails"}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Selected: {selectedCount} of {emails.length} previewed
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllEmails}
            disabled={isExecutingAction || allSelected}
            className="rounded-md border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Select All
          </button>

          <button
            type="button"
            onClick={clearSelection}
            disabled={isExecutingAction || selectedCount === 0}
            className="rounded-md border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Selection
          </button>

          <button
            type="button"
            onClick={() => requestExecution("archive", Array.from(selectedIds), riskLevel)}
            disabled={isExecutingAction || selectedCount === 0}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Archive Selected
          </button>

          <button
            type="button"
            onClick={() => requestExecution("delete", Array.from(selectedIds), riskLevel)}
            disabled={isExecutingAction || selectedCount === 0}
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Move Selected To Trash
          </button>

          <ExportSelectedButton selectedMessageIds={Array.from(selectedIds)} />
        </div>
      </div>

      <AIAnalysisCard
        emails={emailMetadata.slice(0, AI_ANALYSIS_EMAIL_LIMIT)}
        onAnalysisComplete={setAnalysisResult}
      />

      {analysisResult ? (
        <AIActionCard
          analysis={analysisResult.analysis}
          risk={analysisResult.risk}
          summary={analysisResult.summary}
          totalEmailsFound={totalMatches}
          emailsAnalyzed={analysisResult.analyzedCount}
          analyzedAt={analysisResult.analyzedAt}
          isExecuting={isExecutingAction}
          onArchiveSearchResults={() =>
            requestExecution("archive", searchResultEmailIds, riskLevel)
          }
          onMoveSearchResultsToTrash={() =>
            requestExecution("delete", searchResultEmailIds, riskLevel)
          }
        />
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
                  disabled={isExecutingAction}
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
              <th className="w-20 px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Action
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
                      disabled={isExecutingAction}
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

                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => setViewingEmailId(email.id)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewingEmailId ? (
        <EmailViewer
          messageId={viewingEmailId}
          onClose={() => setViewingEmailId(null)}
        />
      ) : null}

      <ExecutionConfirmationModal
        open={Boolean(executionTarget)}
        action={executionTarget?.action ?? "archive"}
        emailCount={executionTarget?.ids.length ?? 0}
        riskLevel={executionTarget?.riskLevel}
        isExecuting={isExecutingAction}
        onCancel={() => {
          if (!isExecutingAction) {
            setExecutionTarget(null);
          }
        }}
        onConfirm={confirmExecution}
      />

      <ExecutionResultModal
        open={Boolean(resultTarget) || Boolean(executionError)}
        action={actionModalAction}
        result={executionResult}
        error={executionError}
        onClose={() => {
          setResultTarget(null);
          setExecutionResult(null);
          setExecutionError(null);
        }}
        onRetry={retryFailedExecution}
      />
    </div>
  );
}