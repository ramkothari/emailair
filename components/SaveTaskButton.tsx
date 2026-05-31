"use client";

import { useEffect, useState } from "react";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { RunTaskModal } from "@/components/RunTaskModal";
import { TaskCard } from "@/components/TaskCard";
import { deleteTask, getTasks } from "@/lib/tasks/task-storage";
import type { Task, TaskAction } from "@/lib/tasks/task-types";

type SaveTaskButtonProps = {
  query: string;
  currentAction?: TaskAction;
  onRunTask?: (task: Task) => Promise<void>;
};

export function SaveTaskButton({
  query,
  currentAction = "archive",
  onRunTask,
}: SaveTaskButtonProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    setTasks(getTasks());
  }, []);

  function handleTaskCreated(task: Task) {
    setTasks((currentTasks) => [task, ...currentTasks]);
    setStorageError(null);
  }

  function handleDeleteTask(id: string) {
    try {
      deleteTask(id);
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
      setStorageError(null);
    } catch (error) {
      setStorageError(
        error instanceof Error ? error.message : "Unable to delete task."
      );
    }
  }

  function handleRunTask(task: Task) {
    setSelectedTask(task);
    setRunModalOpen(true);
  }

  async function handleExecuteTask(action: TaskAction) {
    if (!selectedTask || !onRunTask) {
      throw new Error("Cannot execute task without run handler");
    }

    await onRunTask(selectedTask);
  }

  const hasQuery = query.trim().length > 0;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Reusable Tasks
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Save searches and actions for quick execution later.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Tasks are saved in your browser. Each run requires your confirmation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          disabled={!hasQuery}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save As Task
        </button>
      </div>

      {!hasQuery ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Run a search before saving a task.
        </div>
      ) : null}

      {storageError ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {storageError}
        </div>
      ) : null}

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-gray-900">Saved Tasks</h3>

        {tasks.length === 0 ? (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
            No saved tasks yet.
          </div>
        ) : (
          <div className="mt-3 grid gap-3">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onRun={() => handleRunTask(task)}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </div>

      <CreateTaskModal
        open={createModalOpen}
        query={query}
        initialAction={currentAction}
        onClose={() => setCreateModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />

      <RunTaskModal
        open={runModalOpen}
        task={selectedTask}
        onClose={() => {
          setRunModalOpen(false);
          setSelectedTask(null);
        }}
        onExecute={handleExecuteTask}
      />
    </section>
  );
}
