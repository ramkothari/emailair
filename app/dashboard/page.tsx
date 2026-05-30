import { EmailTable } from "@/components/EmailTable";
import { LogoutButton } from "@/components/LogoutButton";
import { auth } from "@/lib/auth";
import { getRecentEmails } from "@/lib/gmail";
import type { Email } from "@/types/email";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/");
  }

  if (!session.accessToken) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <LogoutButton />
          </div>

          <p className="mt-2 text-sm text-gray-600">
            Signed in as {session.user.email}
          </p>

          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Gmail access token is missing. Please sign out and connect Gmail
            again.
          </div>
        </div>
      </main>
    );
  }

  let emails: Email[] = [];
  let errorMessage: string | null = null;

  try {
    emails = await getRecentEmails(session.accessToken, 20);
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Failed to load Gmail emails.";
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

            <p className="mt-2 text-sm text-gray-600">
              Signed in as {session.user.email}
            </p>
          </div>
          <LogoutButton />
        </div>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Emails
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Showing your latest 20 Gmail inbox messages.
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : (
            <EmailTable emails={emails} />
          )}
        </section>
      </div>
    </main>
  );
}
