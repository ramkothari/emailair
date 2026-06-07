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
const EXECUTION_BATCH_SIZE = 25;
const EXECUTION_BATCH_DELAY_MS = 350;
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
  const [executionProgress, setExecutionProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  const emailIds = useMemo(() => emails.map((email) => email.id), [emails]);
  const selectedCount = selectedIds.size;
  const hasEmails = emails.length > 0;
  const allSelected = hasEmails && selectedCount === emails.length;
  const riskLevel = analysisResult?.risk.riskLevel ?? null;

  const selectedEmailMetadata: EmailMetadata[] = useMemo(
    () =>
      Array.from(selectedIds)
        .map((id) => emails.find((email) => email.id === id))
        .filter((email): email is Email => Boolean(email))
        .map((email) => ({
          sender: email.sender || "Unknown sender",
          subject: email.subject || "(No subject)",
          snippet: email.snippet || "",
          date: email.date || "Unknown date",
        })),
    [emails, selectedIds]
  );

  useEffect(() => {
    setAnalysisResult(null);
  }, [selectedEmailMetadata]);

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
    setExecutionProgress({
      completed: 0,
      total: executionTarget.ids.length,
    });

    try {
      const batches = createBatches(executionTarget.ids, EXECUTION_BATCH_SIZE);
      const startedAt = Date.now();
      let succeeded = 0;
      let failed = 0;
      const failedIds: string[] = [];
      let completed = 0;
      let firstError: string | null = null;

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
        const batch = batches[batchIndex];
        const response = await executeBulkAction({
          action: executionTarget.action,
          emailIds: batch,
        });

        if (!response.ok) {
          failed += batch.length;
          failedIds.push(...batch);
          firstError ??= response.error;
        } else {
          succeeded += response.result.succeeded;
          failed += response.result.failed;
          failedIds.push(...response.result.failedIds);
        }

        completed += batch.length;
        setExecutionProgress({
          completed,
          total: executionTarget.ids.length,
        });

        if (batchIndex < batches.length - 1) {
          await sleep(EXECUTION_BATCH_DELAY_MS);
        }
      }

      const result: ExecuteActionResult = {
        success: failed === 0,
        total: executionTarget.ids.length,
        succeeded,
        failed,
        failedIds,
        durationMs: Date.now() - startedAt,
      };

      setResultTarget(executionTarget);
      setExecutionTarget(null);
      setExecutionResult(result);

      if (firstError && failed === executionTarget.ids.length) {
        setExecutionError(firstError);
      }

      if (result.succeeded === result.total) {
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
      setExecutionProgress(null);
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
      <div className="rounded-2xl border bg-white p-6">
        <p className="text-sm text-gray-600">Loading preview results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-medium text-red-700">Failed to load preview.</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!hasEmails) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <p className="text-sm text-gray-600">No matching emails found.</p>
      </div>
    );
  }

  const actionModalAction =
    executionTarget?.action ?? resultTarget?.action ?? "archive";

  return (
    <div className="rounded-2xl border bg-white">
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
            className="rounded-2xl border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Select All
          </button>

          <button
            type="button"
            onClick={clearSelection}
            disabled={isExecutingAction || selectedCount === 0}
            className="rounded-2xl border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Selection
          </button>

          <button
            type="button"
            onClick={() => requestExecution("archive", Array.from(selectedIds), riskLevel)}
            disabled={isExecutingAction || selectedCount === 0}
            className="rounded-2xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Archive Selected
          </button>

          <button
            type="button"
            onClick={() => requestExecution("delete", Array.from(selectedIds), riskLevel)}
            disabled={isExecutingAction || selectedCount === 0}
            className="rounded-2xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Move Selected To Trash
          </button>

          <ExportSelectedButton selectedMessageIds={Array.from(selectedIds)} />
        </div>
      </div>

      <AIAnalysisCard
        emails={selectedEmailMetadata.slice(0, AI_ANALYSIS_EMAIL_LIMIT)}
        onAnalysisComplete={setAnalysisResult}
      />

      {analysisResult ? (
        <AIActionCard
          analysis={analysisResult.analysis}
          risk={analysisResult.risk}
          summary={analysisResult.summary}
          totalEmailsFound={selectedCount}
          emailsAnalyzed={analysisResult.analyzedCount}
          analyzedAt={analysisResult.analyzedAt}
          isExecuting={isExecutingAction}
          onArchiveSearchResults={() =>
            requestExecution("archive", Array.from(selectedIds), riskLevel)
          }
          onMoveSearchResultsToTrash={() =>
            requestExecution("delete", Array.from(selectedIds), riskLevel)
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
                  className="h-3.5 w-3.5 appearance-none rounded-full border border-gray-300 bg-white transition checked:border-[#D97706] checked:bg-[#D97706] focus:ring-2 focus:ring-[#D97706]/30 disabled:cursor-not-allowed disabled:opacity-50 dark:checked:border-[#D97706] dark:checked:bg-[#D97706]"
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
                    isSelected
                      ? "border-[#D97706]/35 bg-[#D97706]/10 shadow-[inset_3px_0_0_#D97706]"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleEmailSelection(email.id)}
                      disabled={isExecutingAction}
                      aria-label={`Select email from ${email.sender}`}
                      className="h-3.5 w-3.5 appearance-none rounded-full border border-gray-300 bg-white transition checked:border-[#D97706] checked:bg-[#D97706] focus:ring-2 focus:ring-[#D97706]/30 disabled:cursor-not-allowed disabled:opacity-50 dark:checked:border-[#D97706] dark:checked:bg-[#D97706]"
                    />
                  </td>

                  <td className="max-w-xs px-4 py-3 text-sm font-medium text-[#D97706]">
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
                      className="inline-flex h-8 items-center rounded-full border border-[rgba(0,0,0,0.08)] px-3 text-xs font-medium text-gray-700 transition hover:bg-[#F3F3F3]"
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
        progressText={
          executionProgress
            ? `Completed ${executionProgress.completed.toLocaleString()} of ${executionProgress.total.toLocaleString()} emails.`
            : null
        }
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
