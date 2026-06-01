import type { ActionType, ExecutorProgress } from "./types";

type CreateProgressInput = {
  action: ActionType;
  currentBatch: number;
  totalBatches: number;
  totalEmails: number;
  processedEmails: number;
  succeeded: number;
  failed: number;
  failedIds: string[];
};

function calculatePercentageComplete(
  processedEmails: number,
  totalEmails: number
): number {
  if (totalEmails <= 0) {
    return 100;
  }

  return Math.min(100, Math.round((processedEmails / totalEmails) * 100));
}

export function createProgressSnapshot({
  action,
  currentBatch,
  totalBatches,
  totalEmails,
  processedEmails,
  succeeded,
  failed,
  failedIds,
}: CreateProgressInput): ExecutorProgress {
  return {
    action,
    currentBatch,
    totalBatches,
    processedEmails,
    remainingEmails: Math.max(totalEmails - processedEmails, 0),
    percentageComplete: calculatePercentageComplete(
      processedEmails,
      totalEmails
    ),
    succeeded,
    failed,
    failedIds,
  };
}
