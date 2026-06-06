import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { InboxWorkspace } from "@/components/InboxWorkspace";
import { auth } from "@/lib/auth";
import { recordExecutionCommit } from "@/lib/commits/commit-service";
import { requireSessionUserId } from "@/lib/commits/session";
import {
  archiveEmails,
  deleteEmails,
  getRecentEmailsPage,
} from "@/lib/gmail";
import {
  previewFilterAction,
  archiveFilterAction,
  deleteFilterAction,
} from "@/app/actions/filter-actions";
import type { Email, EmailActionResult } from "@/types/email";

function getGmailErrorMessage(error: unknown): string {
  const maybeGoogleError = error as {
    code?: number;
    status?: number;
    message?: string;
    response?: {
      status?: number;
      data?: {
        error?: string;
        error_description?: string;
        message?: string;
      };
    };
  };

  const status =
    maybeGoogleError.code ||
    maybeGoogleError.status ||
    maybeGoogleError.response?.status;

  if (status === 401) {
    return "Google session expired. Please sign out and connect Gmail again.";
  }

  if (status === 403) {
    return "Missing Gmail permissions. Please reconnect Gmail and approve the updated permissions.";
  }

  return (
    maybeGoogleError.response?.data?.message ||
    maybeGoogleError.response?.data?.error_description ||
    maybeGoogleError.message ||
    "Gmail API request failed."
  );
}

export default async function DashboardInboxPage() {
  const session = await auth();

  if (!session?.accessToken) {
    redirect("/");
  }

  let emails: Email[] = [];
  let nextPageToken: string | undefined;
  let loadError: string | null = null;

  try {
    const inboxPage = await getRecentEmailsPage(session.accessToken, 50);
    emails = inboxPage.emails;
    nextPageToken = inboxPage.nextPageToken;
  } catch (error) {
    loadError = getGmailErrorMessage(error);
  }

  async function deleteSelectedEmails(
    ids: string[]
  ): Promise<EmailActionResult> {
    "use server";

    if (ids.length === 0) {
      return {
        success: false,
        message: "Select at least one email to delete.",
      };
    }

    const currentSession = await auth();

    if (!currentSession?.accessToken) {
      return {
        success: false,
        message: "Google session expired. Please sign in again.",
      };
    }

    try {
      const userId = requireSessionUserId(currentSession);

      await recordExecutionCommit({
        userId,
        accessToken: currentSession.accessToken,
        emailIds: ids,
        source: "manual",
        actionType: "delete",
        title: "Deleted Inbox Emails",
        metadata: {
          initiatedFrom: "dashboard-inbox",
        },
        execute: async () => {
          await deleteEmails(currentSession.accessToken as string, ids);

          return {
            success: true,
            emailsProcessed: ids.length,
            emailsSucceeded: ids.length,
            emailsFailed: 0,
          };
        },
      });

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/search");
      revalidatePath("/dashboard/inbox");

      return {
        success: true,
        message: `Moved ${ids.length} email${ids.length === 1 ? "" : "s"} to Trash.`,
      };
    } catch (error) {
      return {
        success: false,
        message: getGmailErrorMessage(error),
      };
    }
  }

  async function archiveSelectedEmails(
    ids: string[]
  ): Promise<EmailActionResult> {
    "use server";

    if (ids.length === 0) {
      return {
        success: false,
        message: "Select at least one email to archive.",
      };
    }

    const currentSession = await auth();

    if (!currentSession?.accessToken) {
      return {
        success: false,
        message: "Google session expired. Please sign in again.",
      };
    }

    try {
      const userId = requireSessionUserId(currentSession);

      await recordExecutionCommit({
        userId,
        accessToken: currentSession.accessToken,
        emailIds: ids,
        source: "manual",
        actionType: "archive",
        title: "Archived Inbox Emails",
        metadata: {
          initiatedFrom: "dashboard-inbox",
        },
        execute: async () => {
          await archiveEmails(currentSession.accessToken as string, ids);

          return {
            success: true,
            emailsProcessed: ids.length,
            emailsSucceeded: ids.length,
            emailsFailed: 0,
          };
        },
      });

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/search");
      revalidatePath("/dashboard/inbox");

      return {
        success: true,
        message: `Archived ${ids.length} email${ids.length === 1 ? "" : "s"}.`,
      };
    } catch (error) {
      return {
        success: false,
        message: getGmailErrorMessage(error),
      };
    }
  }

  return (
    <InboxWorkspace
      initialEmails={emails}
      initialNextPageToken={nextPageToken}
      loadError={loadError}
      onPreview={previewFilterAction}
      onArchive={archiveFilterAction}
      onDelete={deleteFilterAction}
      onDeleteSelected={deleteSelectedEmails}
      onArchiveSelected={archiveSelectedEmails}
    />
  );
}
