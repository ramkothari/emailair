"use client";

import type { Task } from "@/lib/tasks/task-types";

type TaskCardProps = {
  task: Task;
  onRun?: (id: string) => void;
  onDelete?: (id: string) => void;
};

function formatTaskAction(action: Task["action"]): string {
  if (action === "delete") {
    return "Delete";
  }

  if (action === "archive") {
    return "Archive";
  }

  return "Download";
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function TaskCard({ task, onRun, onDelete }: TaskCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {task.name}
          </h3>

          <p className="mt-1 text-sm text-gray-600">
            Action:{" "}
            <span className="font-medium text-gray-900">
              {formatTaskAction(task.action)}
            </span>
          </p>

          <p className="mt-1 truncate text-sm text-gray-600">
            Query:{" "}
            <span className="font-medium text-gray-900">{task.query}</span>
          </p>

          <p className="mt-2 text-xs text-gray-500">
            Created: {formatDate(task.createdAt)}
          </p>
        </div>

        <div className="flex gap-2">
          {onRun ? (
            <button
              type="button"
              onClick={() => onRun(task.id)}
              className="inline-flex h-8 items-center rounded-full bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700"
            >
              Run
            </button>
          ) : null}

          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="inline-flex h-8 items-center rounded-full border border-gray-300 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
