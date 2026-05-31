import type {
  CreateTaskInput,
  Task,
  TaskAction,
  TaskValidationResult,
} from "./task-types";

const VALID_TASK_ACTIONS: readonly TaskAction[] = [
  "delete",
  "archive",
  "download",
];

function isValidTaskAction(action: string): action is TaskAction {
  return VALID_TASK_ACTIONS.includes(action as TaskAction);
}

export function normalizeTaskName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

export function validateTaskInput(
  input: CreateTaskInput,
  existingTasks: Task[],
  ignoreTaskId?: string
): TaskValidationResult {
  const name = normalizeTaskName(input.name);
  const query = input.query.trim();
  const action = input.action;

  if (!name) {
    return {
      valid: false,
      error: "Task name is required.",
    };
  }

  if (name.length < 3) {
    return {
      valid: false,
      error: "Task name must be at least 3 characters.",
    };
  }

  if (name.length > 100) {
    return {
      valid: false,
      error: "Task name must be 100 characters or fewer.",
    };
  }

  if (!query) {
    return {
      valid: false,
      error: "Search query is required before saving a task.",
    };
  }

  if (!isValidTaskAction(action)) {
    return {
      valid: false,
      error: "Invalid task action.",
    };
  }

  const duplicateTask = existingTasks.find((task) => {
    if (ignoreTaskId && task.id === ignoreTaskId) {
      return false;
    }

    return task.name.toLowerCase() === name.toLowerCase();
  });

  if (duplicateTask) {
    return {
      valid: false,
      error: "A task with this name already exists.",
    };
  }

  return {
    valid: true,
    task: {
      name,
      query,
      action,
    },
  };
}

export function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const task = value as Record<string, unknown>;

  return (
    typeof task.id === "string" &&
    typeof task.name === "string" &&
    typeof task.query === "string" &&
    typeof task.action === "string" &&
    isValidTaskAction(task.action) &&
    typeof task.createdAt === "string" &&
    typeof task.updatedAt === "string"
  );
}
