import type { ActionType } from "@/lib/executor/types";

export type ExecutionLifecycleEvent =
  | {
      type: "started";
      executionId: string;
      action: ActionType;
      total: number;
      processed: number;
      failed: number;
      percentage: number;
      durationMs: number;
      etaSeconds: number | null;
    }
  | {
      type: "progress";
      executionId: string;
      action: ActionType;
      total: number;
      processed: number;
      failed: number;
      percentage: number;
      durationMs: number;
      etaSeconds: number | null;
    }
  | {
      type: "completed";
      executionId: string;
      action: ActionType;
      total: number;
      processed: number;
      failed: number;
      percentage: number;
      durationMs: number;
      etaSeconds: number | null;
      affectedIds: string[];
      commitId: string | null;
      fileName?: string;
      fileBase64?: string;
    }
  | {
      type: "failed";
      executionId: string | null;
      action: ActionType;
      total: number;
      processed: number;
      failed: number;
      percentage: number;
      durationMs: number;
      etaSeconds: number | null;
      affectedIds: string[];
      error: string;
    };

