"use client";

import { useMemo, useRef, useState } from "react";
import {
  TaskConfirmationDialog,
  type ConfirmableTaskAction,
} from "@/components/TaskConfirmationDialog";
import {
  TaskExecutionResult,
  type TaskExecutionResultData,
} from "@/components/TaskExecutionResult";

export type TaskPreviewEmail = {
  id: string;
  sender: string;
  subject: string;
  snippet?: string;
  date: string;
};

export type TaskPreviewAnalysis = {
  summary: string;
  riskLevel: "low" | "medium" | "high" | "unknown";
  warnings: string[];
  analyzedCount: number;
};

export type TaskExecuteHandlerResult = {
  success: boolean;
  message?: string;
};

export type TaskPreviewCardProps = {
  taskName: string;
  action: string;
  emails: TaskPreviewEmail[];
  analysis: TaskPreviewAnalysis;
  hasGoogleSession?: boolean;
  onCancel: () => void;
  onExecuteAction: (input: {
    action: ConfirmableTaskAction;
    ids: string[];
    taskName: string;
  }) => Promise<TaskExecuteHandlerResult | void>;
  onExecutionSuccess?: (input: {
    action: ConfirmableTaskAction;
    ids: string[];
  }) => void | Promise<void>;
};

const VALID_ACTIONS: readonly ConfirmableTaskAction[] = [
  "delete",
  "archive",
  "download",
];

function isValidAction(action: string): action is ConfirmableTaskAction {
  return VALID_ACTIONS.includes(action as ConfirmableTaskAction);
}

function getActionLabel(action: ConfirmableTaskAction): string {
  if (action === "delete") {
    return "Delete";
  }

  if (action === "archive") {
    return "Archive";
  }

  return "Download";
}

function getExecutingLabel(action: ConfirmableTaskAction): string {
  if (action === "delete") {
    return "Deleting Emails...";
  }

  if (action === "archive") {
    return "Archiving Emails...";
  }

  return "Preparing Download...";
}

function getRiskClass(riskLevel: TaskPreviewAnalysis["riskLevel"]): string {
  if (riskLevel === "high") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (riskLevel === "medium") {
    return "bg-yellow-50 text-yellow-800 ring-yellow-200";
  }

  if (riskLevel === "low") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  return "bg-gray-50 text-gray-700 ring-gray-200";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Task execution failed.";
}

function writeLocalExecutionLog(input: {
  taskName: string;
  action: ConfirmableTaskAction;
  affectedCount: number;
  executedAt: string;
}): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const key = "gmail-hygiene-task-execution-log";
    const existingRaw = window.localStorage.getItem(key);
    const existing = existingRaw
      ? (JSON.parse(existingRaw) as unknown)
      : [];

    const logs = Array.isArray(existing) ? existing : [];

    logs.unshift(input);

    window.localStorage.setItem(key, JSON.stringify(logs.slice(0, 50)));
  } catch {
    // Optional analytics only. Never block execution result rendering.
  }
}

export function TaskPreviewCard({
  taskName,
  action,
  emails,
  analysis,
  hasGoogleSession = true,
  onCancel,
  onExecuteAction,
  onExecutionSuccess,
}: TaskPreviewCardProps) {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] =
    useState<TaskExecutionResultData | null>(null);

  const executionInProgressRef = useRef(false);

  const emailIds = useMemo(
    () => emails.map((email) => email.id).filter(Boolean),
    [emails]
  );

  const validAction = isValidAction(action) ? action : null;

  async function executeTask(): Promise<void> {
    if (executionInProgressRef.current) {
      return;
    }

    if (!validAction) {
      setExecutionResult({
        status: "error",
        taskName,
        action: "delete",
        affectedCount: 0,
        executionTimeMs: 0,
        completedAt: new Date().toISOString(),
        error: `Invalid task action: ${action}`,
      });
      setIsConfirmationOpen(false);
      return;
    }

    if (!hasGoogleSession) {
      setExecutionResult({
        status: "error",
        taskName,
        action: validAction,
        affectedCount: 0,
        executionTimeMs: 0,
        completedAt: new Date().toISOString(),
        error: "Google session expired. Please sign in again.",
      });
      setIsConfirmationOpen(false);
      return;
    }

    if (emailIds.length === 0) {
      setExecutionResult({
        status: "error",
        taskName,
        action: validAction,
        affectedCount: 0,
        executionTimeMs: 0,
        completedAt: new Date().toISOString(),
        error: "No matching emails are available for this task.",
      });
      setIsConfirmationOpen(false);
      return;
    }

    executionInProgressRef.current = true;
    setIsExecuting(true);
    setExecutionResult(null);

    const startedAt = performance.now();

    try {
      const handlerResult = await onExecuteAction({
        action: validAction,
        ids: emailIds,
        taskName,
      });

      if (handlerResult && !handlerResult.success) {
        throw new Error(handlerResult.message || "Existing handler failed.");
      }

      const completedAt = new Date().toISOString();
      const executionTimeMs = performance.now() - startedAt;

      writeLocalExecutionLog({
        taskName,
        action: validAction,
        affectedCount: emailIds.length,
        executedAt: completedAt,
      });

      setExecutionResult({
        status: "success",
        taskName,
        action: validAction,
        affectedCount: emailIds.length,
        executionTimeMs,
        completedAt,
        message:
          handlerResult?.message ||
          `${getActionLabel(validAction)} completed successfully.`,
      });

      setIsConfirmationOpen(false);

      await onExecutionSuccess?.({
        action: validAction,
        ids: emailIds,
      });
    } catch (error) {
      setExecutionResult({
        status: "error",
        taskName,
        action: validAction,
        affectedCount: emailIds.length,
        executionTimeMs: performance.now() - startedAt,
        completedAt: new Date().toISOString(),
        error: getErrorMessage(error),
      });

      setIsConfirmationOpen(false);
    } finally {
      setIsExecuting(false);
      executionInProgressRef.current = false;
    }
  }

  const canConfirm = Boolean(validAction) && emailIds.length > 0 && !isExecuting;

  return (
    <div className="space-y-5 rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{taskName}</h2>
          <p className="mt-1 text-sm text-gray-600">
            Task preview generated. No action has been executed.
          </p>
        </div>

        {validAction ? (
          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
            Action: {getActionLabel(validAction)}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
            Invalid action
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Matching Emails
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {emails.length}
          </p>
        </div>

        <div className="rounded-lg border bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Analyzed Sample
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {analysis.analyzedCount}
          </p>
        </div>

        <div className="rounded-lg border bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Risk Level
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${getRiskClass(
              analysis.riskLevel
            )}`}
          >
            {analysis.riskLevel}
          </span>
        </div>
      </div>

      <div className="rounded-lg border bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-900">AI Summary</h3>
        <p className="mt-2 text-sm leading-6 text-gray-700">
          {analysis.summary}
        </p>
      </div>

      <div className="rounded-lg border bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-900">Warnings</h3>

        {analysis.warnings.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No warnings detected.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {analysis.warnings.map((warning, index) => (
              <li
                key={`${warning}-${index}`}
                className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800"
              >
                {warning}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <h3 className="text-sm font-semibold text-yellow-900">
          Impact Summary
        </h3>
        <p className="mt-2 text-sm text-yellow-800">
          {validAction ? (
            <>
              Confirming this task will {validAction}{" "}
              <span className="font-semibold">
                {emailIds.length}{" "}
                {emailIds.length === 1 ? "matching email" : "matching emails"}
              </span>
              . Execution is disabled until you explicitly confirm.
            </>
          ) : (
            "This task cannot be executed because its action is invalid."
          )}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="border-b bg-gray-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Matching Emails
          </h3>
        </div>

        {emails.length === 0 ? (
          <p className="p-4 text-sm text-gray-600">
            No matching emails found for this task.
          </p>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Sender
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {emails.map((email) => (
                  <tr key={email.id} className="border-b last:border-b-0">
                    <td className="max-w-xs px-4 py-3 text-gray-700">
                      <div className="truncate" title={email.sender}>
                        {email.sender || "Unknown sender"}
                      </div>
                    </td>
                    <td className="max-w-md px-4 py-3 text-gray-900">
                      <div className="truncate" title={email.subject}>
                        {email.subject || "(No subject)"}
                      </div>
                      {email.snippet ? (
                        <div
                          className="mt-1 truncate text-xs text-gray-500"
                          title={email.snippet}
                        >
                          {email.snippet}
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {email.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {executionResult ? (
        <TaskExecutionResult
          result={executionResult}
          isRetrying={isExecuting}
          onClose={() => setExecutionResult(null)}
          onRetry={
            executionResult.status === "error" && validAction
              ? () => {
                  void executeTask();
                }
              : undefined
          }
        />
      ) : null}

      {isExecuting && validAction ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">
            Executing Task...
          </p>
          <p className="mt-1 text-sm text-blue-700">
            {getExecutingLabel(validAction)}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isExecuting}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => setIsConfirmationOpen(true)}
          disabled={!canConfirm}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {validAction
            ? `Confirm ${getActionLabel(validAction)}`
            : "Cannot Execute"}
        </button>
      </div>

      {validAction ? (
        <TaskConfirmationDialog
          open={isConfirmationOpen}
          taskName={taskName}
          action={validAction}
          foundCount={emailIds.length}
          analyzedCount={analysis.analyzedCount}
          riskLevel={analysis.riskLevel}
          warnings={analysis.warnings}
          isExecuting={isExecuting}
          onCancel={() => {
            if (!isExecuting) {
              setIsConfirmationOpen(false);
            }
          }}
          onConfirm={() => {
            void executeTask();
          }}
        />
      ) : null}
    </div>
  );
}
