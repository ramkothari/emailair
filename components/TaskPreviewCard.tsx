"use client";

import { useState, useTransition } from "react";
import { TaskImpactSummary } from "@/components/TaskImpactSummary";
import type {
  TaskPreviewDefinition,
  TaskRunResult,
} from "@/types/task-preview";

type TaskPreviewCardProps<TSearch> = {
  task: TaskPreviewDefinition<TSearch>;
  runTaskPreview: (
    task: TaskPreviewDefinition<TSearch>
  ) => Promise<TaskRunResult>;
  onCancel?: () => void;
};

function formatAction(action: TaskPreviewDefinition["action"]): string {
  switch (action) {
    case "delete":
      return "Delete";
    case "archive":
      return "Archive";
    case "download":
      return "Download";
    default:
      return "Unknown";
  }
}

export function TaskPreviewCard<TSearch>({
  task,
  runTaskPreview,
  onCancel,
}: TaskPreviewCardProps<TSearch>) {
  const [result, setResult] = useState<TaskRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRunTask() {
    setError(null);

    startTransition(async () => {
      try {
        const previewResult = await runTaskPreview(task);
        setResult(previewResult);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to generate task preview.";

        setError(message);
      }
    });
  }

  function handleCancel() {
    setResult(null);
    setError(null);
    onCancel?.();
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {task.title}
            </h2>

            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-700">Action:</span>{" "}
                {formatAction(task.action)}
              </p>

              {task.searchLabel ? (
                <p>
                  <span className="font-medium text-gray-700">Search:</span>{" "}
                  {task.searchLabel}
                </p>
              ) : null}
            </div>
          </div>

          {!result ? (
            <button
              type="button"
              onClick={handleRunTask}
              disabled={isPending}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Running Preview..." : "Run Task"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      ) : null}

      {result ? (
        <div className="space-y-5 p-5">
          <TaskImpactSummary result={result} />

          <div className="rounded-lg border border-gray-200">
            <div className="border-b bg-gray-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Search Results
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {result.foundCount} matching{" "}
                {result.foundCount === 1 ? "email" : "emails"} found.
              </p>
            </div>

            {result.emails.length === 0 ? (
              <div className="px-4 py-6">
                <p className="text-sm text-gray-600">
                  No emails matched this task search.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-white">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Sender
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Subject
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {result.emails.map((email) => (
                      <tr key={email.id} className="border-b last:border-b-0">
                        <td className="max-w-xs px-4 py-3 text-sm text-gray-700">
                          <div className="truncate" title={email.sender}>
                            {email.sender || "Unknown sender"}
                          </div>
                        </td>

                        <td className="max-w-xl px-4 py-3 text-sm text-gray-900">
                          <div className="font-medium">
                            {email.subject || "(No subject)"}
                          </div>

                          {email.snippet ? (
                            <div className="mt-1 line-clamp-2 text-xs text-gray-500">
                              {email.snippet}
                            </div>
                          ) : null}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {email.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end border-t pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5 py-4">
          <p className="text-sm text-gray-600">
            Run this task to preview matching emails and AI impact analysis.
            No Gmail action will be executed.
          </p>
        </div>
      )}
    </div>
  );
}
