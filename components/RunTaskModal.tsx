"use client";

import { useEffect, useState } from "react";
import { AIAnalysisCard } from "@/components/AIAnalysisCard";
import type { Task } from "@/lib/tasks/task-types";
import type { Email } from "@/types/email";

type RunTaskModalProps = {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onExecute: (action: Task["action"]) => Promise<void>;
};

function formatActionLabel(action: Task["action"]): string {
  if (action === "delete") return "Delete";
  if (action === "archive") return "Archive";
  return "Download";
}

export function RunTaskModal({
  open,
  task,
  onClose,
  onExecute,
}: RunTaskModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setIsExecuting(false);
    }
  }, [open]);

  if (!open || !task) {
    return null;
  }

  async function handleConfirm() {
    if (!task) {
      return;
    }

    setError(null);
    setIsExecuting(true);

    try {
      await onExecute(task.action);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to execute task."
      );
    } finally {
      setIsExecuting(false);
    }
  }

  const actionLabel = formatActionLabel(task.action);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-task-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4 sticky top-0 bg-white">
          <h2 id="run-task-title" className="text-lg font-semibold text-gray-900">
            Run Task: {task.name}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Action: <span className="font-medium">{actionLabel}</span>
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Query: <span className="font-medium text-gray-900">{task.query}</span>
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            <strong>Review carefully:</strong> This will {actionLabel.toLowerCase()} all matching emails after you confirm.
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm font-medium text-gray-900">
              About to {actionLabel.toLowerCase()}:
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              [Results will appear after search]
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Emails matching this query will be shown after execution begins.
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <strong>AI Analysis:</strong> Results will be analyzed before you confirm the final action.
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="inline-flex h-8 items-center rounded-full border border-gray-300 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isExecuting}
            className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-medium text-white ${
              task.action === "delete"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isExecuting ? `Executing ${actionLabel}...` : `Confirm ${actionLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
