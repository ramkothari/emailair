"use client";

import type { ActionType } from "@/lib/executor/types";

type ExecutionConfirmationModalProps = {
  open: boolean;
  action: Extract<ActionType, "archive" | "delete">;
  emailCount: number;
  riskLevel?: string | null;
  isExecuting?: boolean;
  progressText?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

function getActionLabel(action: Extract<ActionType, "archive" | "delete">) {
  if (action === "archive") {
    return "Archive";
  }

  return "Move To Trash";
}

function getWarningMessage(action: Extract<ActionType, "archive" | "delete">) {
  if (action === "archive") {
    return "These emails will be removed from your inbox but remain available in Gmail Archive.";
  }

  return "These emails will be moved to Gmail Trash. You may recover them from Trash until Gmail permanently removes them.";
}

export function ExecutionConfirmationModal({
  open,
  action,
  emailCount,
  riskLevel,
  isExecuting = false,
  progressText = null,
  onCancel,
  onConfirm,
}: ExecutionConfirmationModalProps) {
  if (!open) {
    return null;
  }

  const actionLabel = getActionLabel(action);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-[#3F3F46] dark:bg-[#232326]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
          Confirm {actionLabel}
        </h2>

        <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-[#A1A1AA]">
          <div className="flex justify-between gap-4">
            <span className="font-medium">Action</span>
            <span>{actionLabel}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="font-medium">Email Count</span>
            <span>{emailCount}</span>
          </div>

          {riskLevel ? (
            <div className="flex justify-between gap-4">
              <span className="font-medium">Risk Level</span>
              <span>{riskLevel}</span>
            </div>
          ) : null}

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3 text-yellow-800 dark:border-[#5B4C25] dark:bg-[#2D291F] dark:text-yellow-300">
            {getWarningMessage(action)}
          </div>
        </div>

        {isExecuting ? (
          <div className="mt-5 rounded-2xl border bg-gray-50 p-3 text-sm text-gray-700 dark:border-[#3F3F46] dark:bg-[#2A2A2E] dark:text-[#A1A1AA]">
            <p className="font-medium dark:text-[#F5F5F5]">Executing...</p>
            <p className="mt-1">
              {progressText ??
                "Please keep this page open while EmailAir processes your request."}
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isExecuting}
            className="inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isExecuting}
            className="inline-flex h-8 items-center rounded-full bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#F5F5F5] dark:text-[#18181B] dark:hover:bg-white"
          >
            {isExecuting ? "Executing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
