"use client";

import type { ActionType, ExecuteActionResult } from "@/lib/executor/types";

type ExecutionResultModalProps = {
  open: boolean;
  action: Extract<ActionType, "archive" | "delete">;
  result: ExecuteActionResult | null;
  error?: string | null;
  onClose: () => void;
  onRetry: () => void;
};

function getActionLabel(action: Extract<ActionType, "archive" | "delete">) {
  if (action === "archive") {
    return "Archive";
  }

  return "Move To Trash";
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function ExecutionResultModal({
  open,
  action,
  result,
  error,
  onClose,
  onRetry,
}: ExecutionResultModalProps) {
  if (!open) {
    return null;
  }

  const hasFailedIds = Boolean(result?.failedIds.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          {getActionLabel(action)} Result
        </h2>

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-gray-500">Processed</p>
                <p className="mt-1 text-lg font-semibold">{result.total}</p>
              </div>

              <div className="rounded-md border p-3">
                <p className="text-xs text-gray-500">Succeeded</p>
                <p className="mt-1 text-lg font-semibold text-green-700">
                  {result.succeeded}
                </p>
              </div>

              <div className="rounded-md border p-3">
                <p className="text-xs text-gray-500">Failed</p>
                <p className="mt-1 text-lg font-semibold text-red-700">
                  {result.failed}
                </p>
              </div>

              <div className="rounded-md border p-3">
                <p className="text-xs text-gray-500">Duration</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatDuration(result.durationMs)}
                </p>
              </div>
            </div>

            {hasFailedIds ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="font-medium text-red-800">Failed IDs</p>
                <ul className="mt-2 max-h-36 list-disc overflow-auto pl-5 text-xs text-red-700">
                  {result.failedIds.map((id) => (
                    <li key={id}>{id}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-green-700">
                Execution completed successfully.
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>

          {hasFailedIds ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}