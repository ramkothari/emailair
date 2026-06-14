"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { recordExecutionCommit } from "@/lib/commits/commit-service";
import { requireSessionUserId } from "@/lib/commits/session";
import {
  archiveEmails,
  deleteEmails,
  searchEmails,
} from "@/lib/gmail";
import type { Email } from "@/types/email";
import type { EmailFilter } from "@/types/filter";

export type FilterActionResult =
  | {
      ok: true;
      data: {
        totalMatches: number;
        emails: Email[];
        nextPageToken?: string;
      };
      message?: string;
    }
  | {
      ok: false;
      error: string;
    };

function getGmailErrorMessage(error: unknown): string {
  const possibleGoogleError = error as {
    code?: number;
    response?: {
      status?: number;
      data?: {
        error?: {
          message?: string;
        };
      };
    };
    message?: string;
  };

  const status =
    possibleGoogleError.response?.status ?? possibleGoogleError.code;

  if (status === 401) {
    return "Google access token expired. Sign out and connect Gmail again.";
  }

  if (status === 403) {
    return "Missing Gmail permissions. Reconnect your Google account and grant Gmail access.";
  }

  return (
    possibleGoogleError.response?.data?.error?.message ??
    possibleGoogleError.message ??
    "Gmail API request failed."
  );
}

export async function previewFilterAction(
  filter: EmailFilter,
  pageToken?: string
): Promise<FilterActionResult> {
  const currentSession = await auth();

  if (!currentSession?.accessToken) {
    return {
      ok: false,
      error: "You are not authenticated. Please reconnect Gmail.",
    };
  }

  try {
    const data = await searchEmails(
      currentSession.accessToken,
      filter,
      50,
      pageToken
    );

    return {
      ok: true,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error: getGmailErrorMessage(error),
    };
  }
}

export async function archiveFilterAction(
  filter: EmailFilter,
  emailIds: string[]
): Promise<FilterActionResult> {
  const currentSession = await auth();

  if (!currentSession?.accessToken) {
    return {
      ok: false,
      error: "You are not authenticated. Please reconnect Gmail.",
    };
  }

  if (emailIds.length === 0) {
    return {
      ok: false,
      error: "No emails selected for archive.",
    };
  }

  try {
    const userId = requireSessionUserId(currentSession);

    await recordExecutionCommit({
      userId,
      accessToken: currentSession.accessToken,
      emailIds,
      source: "manual",
      actionType: "archive",
      title: "Archived Filter Results",
      metadata: {
        initiatedFrom: "filter-actions",
        filter,
      },
      execute: async () => {
        await archiveEmails(currentSession.accessToken as string, emailIds);

        return {
          success: true,
          emailsProcessed: emailIds.length,
          emailsSucceeded: emailIds.length,
          emailsFailed: 0,
        };
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/search");
    revalidatePath("/dashboard/inbox");

    const data = await searchEmails(currentSession.accessToken, filter, 50);

    return {
      ok: true,
      data,
      message: `Archived ${emailIds.length} emails. Results refreshed.`,
    };
  } catch (error) {
    return {
      ok: false,
      error: getGmailErrorMessage(error),
    };
  }
}

export async function deleteFilterAction(
  filter: EmailFilter,
  emailIds: string[]
): Promise<FilterActionResult> {
  const currentSession = await auth();

  if (!currentSession?.accessToken) {
    return {
      ok: false,
      error: "You are not authenticated. Please reconnect Gmail.",
    };
  }

  if (emailIds.length === 0) {
    return {
      ok: false,
      error: "No emails selected for delete.",
    };
  }

  try {
    const userId = requireSessionUserId(currentSession);

    await recordExecutionCommit({
      userId,
      accessToken: currentSession.accessToken,
      emailIds,
      source: "manual",
      actionType: "delete",
      title: "Deleted Filter Results",
      metadata: {
        initiatedFrom: "filter-actions",
        filter,
      },
      execute: async () => {
        await deleteEmails(currentSession.accessToken as string, emailIds);

        return {
          success: true,
          emailsProcessed: emailIds.length,
          emailsSucceeded: emailIds.length,
          emailsFailed: 0,
        };
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/search");
    revalidatePath("/dashboard/inbox");

    const data = await searchEmails(currentSession.accessToken, filter, 50);

    return {
      ok: true,
      data,
      message: `Moved ${emailIds.length} emails to Trash. Results refreshed.`,
    };
  } catch (error) {
    return {
      ok: false,
      error: getGmailErrorMessage(error),
    };
  }
}
