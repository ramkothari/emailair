import { createBatches, DEFAULT_BATCH_SIZE } from "./batch";
import { createProgressSnapshot } from "./progress";
import {
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_RETRY_BACKOFF_MS,
  retry,
} from "./retry";
import { executorHandlers } from "./handlers";
import type { CommitActionType } from "../commits/types";
import type {
  ActionType,
  BatchExecutionResult,
  ExecuteActionInput,
  ExecuteActionOptions,
  ExecuteActionResult,
  ExecutorProgress,
} from "./types";

const SUPPORTED_ACTIONS: ActionType[] = ["delete", "archive", "download"];
const DEFAULT_BATCH_DELAY_MS = 350;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isSupportedAction(action: string): action is ActionType {
  return SUPPORTED_ACTIONS.includes(action as ActionType);
}

function validateInput(input: ExecuteActionInput): void {
  if (!isSupportedAction(input.action)) {
    throw new Error(`Unsupported action: ${input.action}`);
  }

  if (!Array.isArray(input.emailIds)) {
    throw new Error("emailIds must be an array.");
  }

  if (input.emailIds.length === 0) {
    throw new Error("No email IDs provided.");
  }
}

function normalizeEmailIds(emailIds: string[]): string[] {
  return emailIds
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

async function emitProgress(
  progress: ExecutorProgress,
  onProgress?: ExecuteActionOptions["onProgress"]
): Promise<void> {
  if (!onProgress) {
    return;
  }

  await onProgress(progress);
}

function reconcileBatchResult(
  batchEmailIds: string[],
  result: BatchExecutionResult
): BatchExecutionResult {
  const batchIdSet = new Set(batchEmailIds);

  const succeededIds = result.succeededIds.filter((id) => batchIdSet.has(id));
  const failedIds = result.failedIds.filter((id) => batchIdSet.has(id));

  const reportedIds = new Set([...succeededIds, ...failedIds]);

  const unreportedIds = batchEmailIds.filter((id) => !reportedIds.has(id));

  return {
    succeededIds,
    failedIds: [...failedIds, ...unreportedIds],
  };
}

function mapExecutorActionToCommitAction(action: ActionType): CommitActionType {
  if (action === "archive") {
    return "archive";
  }

  if (action === "delete") {
    return "delete";
  }

  return "export";
}

async function executeActionInternal(
  input: ExecuteActionInput,
  options: ExecuteActionOptions = {}
): Promise<ExecuteActionResult> {
  validateInput(input);

  const startedAt = Date.now();

  const emailIds = normalizeEmailIds(input.emailIds);
  const total = emailIds.length;

  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const batchDelayMs = options.batchDelayMs ?? DEFAULT_BATCH_DELAY_MS;
  const retryAttempts = options.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS;
  const retryBackoffMs = options.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF_MS;

  const batches = createBatches(emailIds, batchSize);
  const totalBatches = batches.length;

  const handler = executorHandlers[input.action];

  let processedEmails = 0;
  let succeeded = 0;
  let failed = 0;
  const failedIds: string[] = [];

  await emitProgress(
    createProgressSnapshot({
      action: input.action,
      currentBatch: 0,
      totalBatches,
      totalEmails: total,
      processedEmails,
      succeeded,
      failed,
      failedIds,
    }),
    options.onProgress
  );

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const currentBatch = batchIndex + 1;

    try {
      const batchResult = await retry(
        () =>
          handler({
            action: input.action,
            emailIds: batch,
            context: input.context,
          }),
        {
          attempts: retryAttempts,
          backoffMs: retryBackoffMs,
        }
      );

      const reconciledResult = reconcileBatchResult(batch, batchResult);

      succeeded += reconciledResult.succeededIds.length;
      failed += reconciledResult.failedIds.length;
      failedIds.push(...reconciledResult.failedIds);
    } catch {
      failed += batch.length;
      failedIds.push(...batch);
    } finally {
      processedEmails += batch.length;

      await emitProgress(
        createProgressSnapshot({
          action: input.action,
          currentBatch,
          totalBatches,
          totalEmails: total,
          processedEmails,
          succeeded,
          failed,
          failedIds,
        }),
        options.onProgress
      );
    }

    if (batchIndex < batches.length - 1 && batchDelayMs > 0) {
      await sleep(batchDelayMs);
    }
  }

  const durationMs = Date.now() - startedAt;

  return {
    success: failed === 0,
    total,
    succeeded,
    failed,
    failedIds,
    durationMs,
  };
}

export async function executeAction(
  input: ExecuteActionInput,
  options: ExecuteActionOptions = {}
): Promise<ExecuteActionResult> {
  const { commit, ...executorInput } = input;

  if (!commit) {
    return executeActionInternal(executorInput, options);
  }

  const { recordExecutionCommit } = await import("../commits/commit-service");

  const recorded = await recordExecutionCommit({
    userId: commit.userId,
    accessToken: commit.accessToken,
    emailIds: input.emailIds,
    source: commit.source,
    actionType: commit.actionType ?? mapExecutorActionToCommitAction(input.action),
    title: commit.title,
    automationId: commit.automationId ?? null,
    metadata: {
      action: input.action,
      ...(commit.metadata ?? {}),
    },
    execute: async () => {
      const result = await executeActionInternal(executorInput, options);

      return {
        success: result.success,
        emailsProcessed: result.total,
        emailsSucceeded: result.succeeded,
        emailsFailed: result.failed,
        metadata: {
          executorResult: result,
        },
      };
    },
  });

  const result = recorded.result.metadata?.executorResult;

  if (!result || typeof result !== "object") {
    throw new Error("Executor result was not recorded correctly.");
  }

  return result as ExecuteActionResult;
}
