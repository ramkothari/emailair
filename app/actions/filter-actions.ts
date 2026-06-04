"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
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
  filter: EmailFilter
): Promise<FilterActionResult> {
  const currentSession = await auth();

  if (!currentSession?.accessToken) {
    return {
      ok: false,
      error: "You are not authenticated. Please reconnect Gmail.",
    };
  }

  try {
    const data = await searchEmails(currentSession.accessToken, filter, 50);

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
    await archiveEmails(currentSession.accessToken, emailIds);

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
    await deleteEmails(currentSession.accessToken, emailIds);

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
