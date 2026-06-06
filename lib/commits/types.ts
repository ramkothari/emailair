export type CommitSource = "manual" | "automation" | "ai_agent" | "system";

export type CommitStatus = "pending" | "running" | "completed" | "failed";

export type CommitActionType =
  | "archive"
  | "delete"
  | "export"
  | "unsubscribe"
  | "ai_cleanup";

export type CommitAffectedEmail = {
  emailId: string;
  sender: string;
  subject: string;
};

export type CommitItem = {
  id: string;
  commitId: string;
  emailId: string;
  sender: string;
  subject: string;
};

export type Commit = {
  id: string;
  userId: string;
  executionId: string;
  source: CommitSource;
  actionType: CommitActionType;
  title: string;
  emailCount: number;
  status: CommitStatus;
  durationMs: number;
  createdAt: string;
  automationId: string | null;
  metadata: Record<string, unknown>;
  items: CommitItem[];
};

export type CommitGroup = {
  label: string;
  commits: Commit[];
};

export type GetCommitsOptions = {
  limit?: number;
  cursor?: string;
};

export type GetCommitsResult = {
  commits: Commit[];
  nextCursor: string | null;
};

export type ExecutionRecordResult = {
  success: boolean;
  emailsProcessed?: number;
  emailsSucceeded?: number;
  emailsFailed?: number;
  metadata?: Record<string, unknown>;
};

export type RecordExecutionCommitInput<
  TExecutionResult extends ExecutionRecordResult,
> = {
  userId: string;
  accessToken: string;
  emailIds: string[];
  source: CommitSource;
  actionType: CommitActionType;
  title: string;
  automationId?: string | null;
  metadata?: Record<string, unknown>;
  onExecutionStarted?: (executionId: string) => void | Promise<void>;
  execute: (executionId: string) => Promise<TExecutionResult>;
};

export type RecordExecutionCommitResult<
  TExecutionResult extends ExecutionRecordResult,
> = {
  executionId: string;
  commitId: string | null;
  result: TExecutionResult;
};
