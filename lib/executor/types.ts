export type ActionType = "delete" | "archive" | "download";

export type ExecuteActionContext = {
  accessToken?: string;
};

export type ExecuteActionInput = {
  action: ActionType;
  emailIds: string[];
  context?: ExecuteActionContext;
};

export type ExecuteActionResult = {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  failedIds: string[];
  durationMs: number;
};

export type BatchExecutionResult = {
  succeededIds: string[];
  failedIds: string[];
};

export type BatchActionInput = {
  action: ActionType;
  emailIds: string[];
  context?: ExecuteActionContext;
};

export type BatchActionHandler = (
  input: BatchActionInput
) => Promise<BatchExecutionResult>;

export type ExecutorProgress = {
  action: ActionType;
  currentBatch: number;
  totalBatches: number;
  processedEmails: number;
  remainingEmails: number;
  percentageComplete: number;
  succeeded: number;
  failed: number;
  failedIds: string[];
};

export type ExecutorProgressHandler = (
  progress: ExecutorProgress
) => void | Promise<void>;

export type ExecuteActionOptions = {
  batchSize?: number;
  batchDelayMs?: number;
  retryAttempts?: number;
  retryBackoffMs?: number[];
  onProgress?: ExecutorProgressHandler;
};

export type RetryOptions = {
  attempts?: number;
  backoffMs?: number[];
};
