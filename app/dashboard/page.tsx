import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EmailTable } from "@/components/EmailTable";
import { FilterBuilder } from "@/components/FilterBuilder";
import { auth, signOut } from "@/lib/auth";
import {
  archiveEmails,
  deleteEmails,
  getRecentEmails,
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

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.accessToken) {
    redirect("/");
  }

  let emails: Email[] = [];
  let loadError: string | null = null;

  try {
    emails = await getRecentEmails(session.accessToken, 20);
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
      await deleteEmails(currentSession.accessToken, ids);
      revalidatePath("/dashboard");

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
      await archiveEmails(currentSession.accessToken, ids);
      revalidatePath("/dashboard");

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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gmail Hygiene
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {session.user?.email}
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({
                redirectTo: "/",
              });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <FilterBuilder
          onPreview={previewFilterAction}
          onArchive={archiveFilterAction}
          onDelete={deleteFilterAction}
        />

        <div className="rounded-lg bg-white shadow">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Inbox Emails
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Select emails to manually delete or archive them.
            </p>
          </div>

          {loadError ? (
            <div className="p-6 text-sm text-red-600">
              Failed to load emails: {loadError}
            </div>
          ) : (
            <EmailTable
              emails={emails}
              onDeleteSelected={deleteSelectedEmails}
              onArchiveSelected={archiveSelectedEmails}
            />
          )}
        </div>
      </main>
    </div>
  );
}
