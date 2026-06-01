"use client";

import type { ActionType } from "@/lib/executor/types";

type ExecutionConfirmationModalProps = {
  open: boolean;
  action: Extract<ActionType, "archive" | "delete">;
  emailCount: number;
  riskLevel?: string | null;
  isExecuting?: boolean;
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
  onCancel,
  onConfirm,
}: ExecutionConfirmationModalProps) {
  if (!open) {
    return null;
  }

  const actionLabel = getActionLabel(action);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          Confirm {actionLabel}
        </h2>

        <div className="mt-4 space-y-3 text-sm text-gray-700">
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

          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-yellow-800">
            {getWarningMessage(action)}
          </div>
        </div>

        {isExecuting ? (
          <div className="mt-5 rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-medium">Executing...</p>
            <p className="mt-1">
              Please keep this page open while EmailAir processes your request.
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isExecuting}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isExecuting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExecuting ? "Executing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}