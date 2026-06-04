"use server";

import { auth } from "@/lib/auth";
import { getRecentEmailsPage } from "@/lib/gmail";
import type { Email } from "@/types/email";

export type InboxPageResult =
  | {
      ok: true;
      data: {
        emails: Email[];
        nextPageToken?: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to load inbox emails.";
}

export async function loadInboxPageAction(
  pageToken?: string
): Promise<InboxPageResult> {
  const session = await auth();

  if (!session?.accessToken) {
    return {
      ok: false,
      error: "You are not authenticated. Please reconnect Gmail.",
    };
  }

  try {
    const data = await getRecentEmailsPage(session.accessToken, 50, pageToken);

    return {
      ok: true,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error),
    };
  }
}
