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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-[#3F3F46] dark:bg-[#232326]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
          {getActionLabel(action)} Result
        </h2>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-[#5F3333] dark:bg-[#2D1F1F] dark:text-red-300">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-[#A1A1AA]">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border p-3 dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
                <p className="text-xs text-gray-500 dark:text-[#71717A]">Processed</p>
                <p className="mt-1 text-lg font-semibold dark:text-[#F5F5F5]">{result.total}</p>
              </div>

              <div className="rounded-2xl border p-3 dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
                <p className="text-xs text-gray-500 dark:text-[#71717A]">Succeeded</p>
                <p className="mt-1 text-lg font-semibold text-green-700">
                  {result.succeeded}
                </p>
              </div>

              <div className="rounded-2xl border p-3 dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
                <p className="text-xs text-gray-500 dark:text-[#71717A]">Failed</p>
                <p className="mt-1 text-lg font-semibold text-red-700">
                  {result.failed}
                </p>
              </div>

              <div className="rounded-2xl border p-3 dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
                <p className="text-xs text-gray-500 dark:text-[#71717A]">Duration</p>
                <p className="mt-1 text-lg font-semibold dark:text-[#F5F5F5]">
                  {formatDuration(result.durationMs)}
                </p>
              </div>
            </div>

            {hasFailedIds ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 dark:border-[#5F3333] dark:bg-[#2D1F1F]">
                <p className="font-medium text-red-800 dark:text-red-300">Failed IDs</p>
                <ul className="mt-2 max-h-36 list-disc overflow-auto pl-5 text-xs text-red-700 dark:text-red-300">
                  {result.failedIds.map((id) => (
                    <li key={id}>{id}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-green-700 dark:border-[#315341] dark:bg-[#1F2D26] dark:text-green-300">
                Execution completed successfully.
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
          >
            Close
          </button>

          {hasFailedIds ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-8 items-center rounded-full bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 dark:bg-[#F5F5F5] dark:text-[#18181B] dark:hover:bg-white"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
