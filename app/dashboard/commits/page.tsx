import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCommits, groupByDate } from "@/lib/commits/commit-service";
import { getSessionUserId } from "@/lib/commits/session";
import { CommitGroup } from "@/components/CommitGroup";

export default async function DashboardCommitsPage() {
  const session = await auth();
  const userId = getSessionUserId(session);

  if (!userId) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-[#F5F5F5]">
          Commits
        </h1>
        <p className="text-sm text-gray-600 dark:text-[#A1A1AA]">
          Sign in to view your commit history.
        </p>
      </section>
    );
  }

  const { commits } = await getCommits(userId, { limit: 50 });
  const groups = groupByDate(commits);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-[#F5F5F5]">
          Commits
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-[#A1A1AA]">
          Track manual actions and automation executions.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 text-center shadow-sm dark:border-[#3F3F46] dark:bg-[#232326]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
            No commits yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600 dark:text-[#A1A1AA]">
            Completed email actions and automation runs will appear here.
          </p>

          <Link
            href="/dashboard/inbox"
            className="mt-4 inline-flex h-8 items-center rounded-full bg-gray-900 px-3 text-xs font-medium text-white hover:bg-gray-800 dark:bg-[#F5F5F5] dark:text-[#18181B] dark:hover:bg-white"
          >
            Back to Inbox
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <CommitGroup
              key={group.label}
              label={group.label}
              commits={group.commits}
            />
          ))}
        </div>
      )}
    </section>
  );
}
