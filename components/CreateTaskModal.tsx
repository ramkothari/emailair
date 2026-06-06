"use client";

import { useEffect, useState } from "react";
import { saveTask } from "@/lib/tasks/task-storage";
import type { Task, TaskAction } from "@/lib/tasks/task-types";

type CreateTaskModalProps = {
  open: boolean;
  query: string;
  initialAction?: TaskAction;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
};

const TASK_ACTION_OPTIONS: Array<{
  value: TaskAction;
  label: string;
}> = [
  {
    value: "delete",
    label: "Delete",
  },
  {
    value: "archive",
    label: "Archive",
  },
  {
    value: "download",
    label: "Download",
  },
];

export function CreateTaskModal({
  open,
  query,
  initialAction = "archive",
  onClose,
  onTaskCreated,
}: CreateTaskModalProps) {
  const [taskName, setTaskName] = useState("");
  const [action, setAction] = useState<TaskAction>(initialAction);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTaskName("");
      setAction(initialAction);
      setError(null);
      setIsSaving(false);
    }
  }, [open, initialAction]);

  if (!open) {
    return null;
  }

  function handleSave() {
    setError(null);
    setIsSaving(true);

    try {
      const createdTask = saveTask({
        name: taskName,
        query,
        action,
      });

      onTaskCreated(createdTask);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save task."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 id="create-task-title" className="text-lg font-semibold text-gray-900">
            Save As Task
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Save this search and action for reuse later.
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label
              htmlFor="task-name"
              className="block text-sm font-medium text-gray-700"
            >
              Task Name
            </label>

            <input
              id="task-name"
              type="text"
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
              placeholder="Amazon Promotions Cleanup"
              maxLength={120}
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Required. 3–100 characters. Must be unique.
            </p>
          </div>

          <div>
            <label
              htmlFor="task-query"
              className="block text-sm font-medium text-gray-700"
            >
              Search Query
            </label>

            <input
              id="task-query"
              type="text"
              value={query}
              readOnly
              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
            />
          </div>

          <div>
            <label
              htmlFor="task-action"
              className="block text-sm font-medium text-gray-700"
            >
              Action
            </label>

            <select
              id="task-action"
              value={action}
              onChange={(event) => setAction(event.target.value as TaskAction)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {TASK_ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            You can run this task later from your task library. Each run will show a preview and require your confirmation before executing.
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-8 items-center rounded-full border border-gray-300 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex h-8 items-center rounded-full bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
