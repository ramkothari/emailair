"use server";

import { auth } from "@/lib/auth";
import { executeAction } from "@/lib/executor/executor";
import type { ActionType, ExecuteActionResult } from "@/lib/executor/types";

type SupportedBulkAction = Extract<ActionType, "archive" | "delete">;

export type ExecuteBulkActionInput = {
  action: SupportedBulkAction;
  emailIds: string[];
};

export type ExecuteBulkActionResponse =
  | {
      ok: true;
      result: ExecuteActionResult;
    }
  | {
      ok: false;
      error: string;
    };

const ACTION_LIMITS: Record<ActionType, number> = {
  archive: 100,
  delete: 100,
  download: 50,
};

const LIMIT_MESSAGE =
  "Archive and Move To Trash support up to 100 emails per execution. Please narrow your search or select fewer emails.";

function normalizeEmailIds(emailIds: string[]): string[] {
  return Array.from(
    new Set(
      emailIds
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Execution failed. Please try again.";
}

export async function executeBulkAction(
  input: ExecuteBulkActionInput
): Promise<ExecuteBulkActionResponse> {
  const emailIds = normalizeEmailIds(input.emailIds);

  if (emailIds.length === 0) {
    return {
      ok: false,
      error: "Select at least one email to continue.",
    };
  }

  const limit = ACTION_LIMITS[input.action];

  if (emailIds.length > limit) {
    return {
      ok: false,
      error: LIMIT_MESSAGE,
    };
  }

  const session = await auth();

  if (!session?.accessToken) {
    return {
      ok: false,
      error: "You are not authenticated. Please reconnect Gmail.",
    };
  }

  try {
    const result = await executeAction({
      action: input.action,
      emailIds,
      context: {
        accessToken: session.accessToken,
      },
    });

    return {
      ok: true,
      result,
    };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error),
    };
  }
}