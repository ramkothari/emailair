import {
  TASK_STORAGE_KEY,
  type CreateTaskInput,
  type Task,
  type UpdateTaskInput,
} from "./task-types";
import { isTask, validateTaskInput } from "./task-validator";

function ensureBrowserStorage(): Storage {
  if (typeof window === "undefined") {
    throw new Error("Task storage is only available in the browser.");
  }

  return window.localStorage;
}

function createTaskId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `task_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function writeTasks(tasks: Task[]): void {
  const storage = ensureBrowserStorage();
  storage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
}

export function getTasks(): Task[] {
  try {
    const storage = ensureBrowserStorage();
    const rawTasks = storage.getItem(TASK_STORAGE_KEY);

    if (!rawTasks) {
      return [];
    }

    const parsedTasks = JSON.parse(rawTasks) as unknown;

    if (!Array.isArray(parsedTasks)) {
      return [];
    }

    return parsedTasks.filter(isTask);
  } catch {
    return [];
  }
}

export function saveTask(input: CreateTaskInput): Task {
  const existingTasks = getTasks();
  const validation = validateTaskInput(input, existingTasks);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const now = new Date().toISOString();

  const task: Task = {
    id: createTaskId(),
    name: validation.task.name,
    query: validation.task.query,
    action: validation.task.action,
    createdAt: now,
    updatedAt: now,
  };

  try {
    writeTasks([task, ...existingTasks]);
    return task;
  } catch {
    throw new Error("Unable to save task. Please check your browser storage.");
  }
}

export function deleteTask(id: string): void {
  const existingTasks = getTasks();
  const nextTasks = existingTasks.filter((task) => task.id !== id);

  try {
    writeTasks(nextTasks);
  } catch {
    throw new Error("Unable to delete task. Please check your browser storage.");
  }
}

export function updateTask(id: string, input: UpdateTaskInput): Task {
  const existingTasks = getTasks();
  const currentTask = existingTasks.find((task) => task.id === id);

  if (!currentTask) {
    throw new Error("Task not found.");
  }

  const mergedInput: CreateTaskInput = {
    name: input.name ?? currentTask.name,
    query: input.query ?? currentTask.query,
    action: input.action ?? currentTask.action,
  };

  const validation = validateTaskInput(mergedInput, existingTasks, id);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const updatedTask: Task = {
    ...currentTask,
    name: validation.task.name,
    query: validation.task.query,
    action: validation.task.action,
    updatedAt: new Date().toISOString(),
  };

  const nextTasks = existingTasks.map((task) =>
    task.id === id ? updatedTask : task
  );

  try {
    writeTasks(nextTasks);
    return updatedTask;
  } catch {
    throw new Error("Unable to update task. Please check your browser storage.");
  }
}
