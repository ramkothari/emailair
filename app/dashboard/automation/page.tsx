import Link from "next/link";
import { auth } from "@/lib/auth";
import { requireSessionUserId } from "@/lib/commits/session";
import { getUserAutomations } from "@/lib/automations/run-automation";
import { AutomationCard } from "./automation-card";
import { RecommendedAutomationCard } from "./recommended-automation-card";

export default async function DashboardAutomationPage() {
  const session = await auth();
  const userId = requireSessionUserId(session);
  const automationItems = await getUserAutomations(userId);
  const enabledCount = automationItems.filter((item) => item.enabled).length;
  const recommendedAutomations = [
    {
      name: "LinkedIn Cleanup",
      count: "412 emails found",
      description: "Archive or remove old LinkedIn notifications.",
      preset: "social",
    },
    {
      name: "Newsletter Cleanup",
      count: "842 emails found",
      description: "Remove newsletters and promotions automatically.",
      preset: "newsletters",
    },
    {
      name: "Receipt Organizer",
      count: "218 emails found",
      description: "Archive invoices, receipts and payment confirmations.",
      preset: "receipts",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-[#F5F5F5]">
            Automation
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-[#A1A1AA]">
            Keep your inbox clean automatically.
          </p>
        </div>

        <Link
          href="/dashboard/automation/new"
          className="inline-flex h-8 items-center rounded-full bg-gray-950 px-3 text-xs font-medium text-white transition hover:bg-gray-800 dark:bg-[#F5F5F5] dark:text-[#18181B]"
        >
          + New Automation
        </Link>
      </header>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-[#F5F5F5]">
            Recommended Automations
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {recommendedAutomations.map((automation) => (
            <RecommendedAutomationCard
              key={automation.name}
              automation={automation}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4 dark:border-[#3F3F46] dark:bg-[#232326]">
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Total Automations
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-[#F5F5F5]">
            {automationItems.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4 dark:border-[#3F3F46] dark:bg-[#232326]">
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">Enabled</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-[#F5F5F5]">
            {enabledCount}
          </p>
        </div>
        <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4 dark:border-[#3F3F46] dark:bg-[#232326]">
          <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
            Audit Trail
          </p>
          <Link
            href="/dashboard/commits"
            className="mt-2 inline-flex text-sm font-medium text-[#D97706]"
          >
            View Commits
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        {automationItems.length === 0 ? (
          <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-8 text-center dark:border-[#3F3F46] dark:bg-[#232326]">
            <h2 className="text-base font-semibold text-gray-900 dark:text-[#F5F5F5]">
              No automations yet
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-[#A1A1AA]">
              Choose what to clean, pick what should happen, preview the match,
              then create your automation.
            </p>
          </div>
        ) : (
          automationItems.map((automation) => (
            <AutomationCard key={automation.id} automation={automation} />
          ))
        )}
      </section>
    </div>
  );
}
