"use client";

export type ConfirmableTaskAction = "delete" | "archive" | "download";

type TaskConfirmationDialogProps = {
  open: boolean;
  taskName: string;
  action: ConfirmableTaskAction;
  foundCount: number;
  analyzedCount: number;
  riskLevel: "low" | "medium" | "high" | "unknown";
  warnings: string[];
  isExecuting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
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

function getConfirmButtonClass(action: ConfirmableTaskAction): string {
  if (action === "delete") {
    return "bg-red-600 hover:bg-red-700 focus:ring-red-500";
  }

  if (action === "archive") {
    return "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";
  }

  return "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500";
}

function getRiskClass(riskLevel: TaskConfirmationDialogProps["riskLevel"]) {
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

export function TaskConfirmationDialog({
  open,
  taskName,
  action,
  foundCount,
  analyzedCount,
  riskLevel,
  warnings,
  isExecuting,
  onCancel,
  onConfirm,
}: TaskConfirmationDialogProps) {
  if (!open) {
    return null;
  }

  const actionLabel = getActionLabel(action);
  const confirmLabel = `Confirm ${actionLabel}`;
  const isLargeExecution = foundCount > 500;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-confirmation-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="border-b px-6 py-4">
          <h2
            id="task-confirmation-title"
            className="text-lg font-semibold text-gray-900"
          >
            Confirm Task Execution
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Review the impact before running this task.
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Task Name
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {taskName}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Action
              </p>
              <p className="mt-1 text-base font-semibold text-gray-900">
                {actionLabel}
              </p>
            </div>

            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Found
              </p>
              <p className="mt-1 text-base font-semibold text-gray-900">
                {foundCount} {foundCount === 1 ? "Email" : "Emails"}
              </p>
            </div>

            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Analyzed
              </p>
              <p className="mt-1 text-base font-semibold text-gray-900">
                {analyzedCount} {analyzedCount === 1 ? "Email" : "Emails"}
              </p>
            </div>

            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Risk
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${getRiskClass(
                  riskLevel
                )}`}
              >
                {riskLevel}
              </span>
            </div>
          </div>

          {isLargeExecution ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-900">
                Large Execution Warning
              </p>
              <p className="mt-1 text-sm text-red-800">
                This task will affect {foundCount} emails. Please review the
                impact carefully before confirming.
              </p>
            </div>
          ) : null}

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm font-semibold text-yellow-900">
              Impact Summary
            </p>
            <p className="mt-1 text-sm text-yellow-800">
              This will {action}{" "}
              <span className="font-semibold">
                {foundCount} {foundCount === 1 ? "email" : "emails"}
              </span>
              . This action uses the existing production {action} handler.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900">Warnings</p>

            {warnings.length === 0 ? (
              <p className="mt-2 rounded-lg border bg-gray-50 p-3 text-sm text-gray-600">
                No warnings detected.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {warnings.map((warning, index) => (
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
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
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
            onClick={onConfirm}
            disabled={isExecuting}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${getConfirmButtonClass(
              action
            )}`}
          >
            {isExecuting ? "Executing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
