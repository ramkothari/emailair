export const TASK_STORAGE_KEY = "email-cleaner-tasks";

export type TaskAction = "delete" | "archive" | "download";

export type Task = {
  id: string;
  name: string;
  query: string;
  action: TaskAction;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskInput = {
  name: string;
  query: string;
  action: TaskAction;
};

export type UpdateTaskInput = Partial<CreateTaskInput>;

export type TaskValidationResult =
  | {
      valid: true;
      task: CreateTaskInput;
    }
  | {
      valid: false;
      error: string;
    };
