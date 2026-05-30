import type { OverviewStats } from "@/types/analytics";

type AnalyticsOverviewProps = {
  stats: OverviewStats;
  analyzedEmailCount: number;
  maxAnalyzed: number;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function AnalyticsOverview({
  stats,
  analyzedEmailCount,
  maxAnalyzed,
}: AnalyticsOverviewProps) {
  const cards = [
    {
      label: "Total Emails Analyzed",
      value: stats.totalEmails,
    },
    {
      label: "Unread Emails",
      value: stats.unreadEmails,
    },
    {
      label: "Emails With Attachments",
      value: stats.emailsWithAttachments,
    },
    {
      label: "Older Than 1 Year",
      value: stats.emailsOlderThanOneYear,
    },
  ];

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">
          Email Analytics
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Analyzing latest {formatNumber(analyzedEmailCount)} of up to{" "}
          {formatNumber(maxAnalyzed)} inbox emails.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-gray-50 p-4"
          >
            <p className="text-sm font-medium text-gray-600">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatNumber(card.value)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
