"use client";

import type { ConfirmableTaskAction } from "@/components/TaskConfirmationDialog";

export type TaskExecutionStatus = "success" | "error";

export type TaskExecutionResultData = {
  status: TaskExecutionStatus;
  taskName: string;
  action: ConfirmableTaskAction;
  affectedCount: number;
  executionTimeMs: number;
  completedAt: string;
  message?: string;
  error?: string;
};

type TaskExecutionResultProps = {
  result: TaskExecutionResultData;
  onClose: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
};

function getActionLabel(action: ConfirmableTaskAction): string {
  if (action === "delete") {
    return "Delete";
  }

  if (action === "archive") {
    return "Archive";
  }

  return "Download";
}

function formatExecutionTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }

  return `${(ms / 1000).toFixed(2)} sec`;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function TaskExecutionResult({
  result,
  onClose,
  onRetry,
  isRetrying = false,
}: TaskExecutionResultProps) {
  const isSuccess = result.status === "success";

  return (
    <div
      className={`rounded-2xl border p-5 ${
        isSuccess
          ? "border-green-200 bg-green-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3
            className={`text-lg font-semibold ${
              isSuccess ? "text-green-900" : "text-red-900"
            }`}
          >
            {isSuccess ? "Task Completed" : "Task Failed"}
          </h3>

          <p
            className={`mt-1 text-sm ${
              isSuccess ? "text-green-700" : "text-red-700"
            }`}
          >
            {result.taskName}
          </p>
        </div>

        <div className="flex gap-2">
          {!isSuccess && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="inline-flex h-8 items-center rounded-full bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRetrying ? "Retrying..." : "Retry"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            disabled={isRetrying}
            className="inline-flex h-8 items-center rounded-full border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Action
          </dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {getActionLabel(result.action)}
          </dd>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Affected
          </dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {result.affectedCount}{" "}
            {result.affectedCount === 1 ? "Email" : "Emails"}
          </dd>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Execution Time
          </dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {formatExecutionTime(result.executionTimeMs)}
          </dd>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Completed
          </dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {formatTimestamp(result.completedAt)}
          </dd>
        </div>
      </dl>

      {result.message ? (
        <p
          className={`mt-4 rounded-2xl bg-white p-4 text-sm ${
            isSuccess ? "text-green-800" : "text-red-800"
          }`}
        >
          {result.message}
        </p>
      ) : null}

      {result.error ? (
        <div className="mt-4 rounded-2xl bg-white p-4">
          <p className="text-sm font-semibold text-red-900">Reason:</p>
          <p className="mt-1 text-sm text-red-800">{result.error}</p>
        </div>
      ) : null}
    </div>
  );
}
