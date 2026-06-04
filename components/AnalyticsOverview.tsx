import type { InboxHealth } from "@/types/analytics";

type AnalyticsOverviewProps = {
  stats: InboxHealth;
  scannedEmailCount: number;
  maxAnalyzed: number;
  scanComplete: boolean;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function AnalyticsOverview({
  stats,
  scannedEmailCount,
  maxAnalyzed,
  scanComplete,
}: AnalyticsOverviewProps) {
  const cards = [
    {
      label: "Total Scanned",
      value: stats.totalScanned,
    },
    {
      label: "Unread Emails",
      value: stats.unreadEmails,
    },
    {
      label: "Read Emails",
      value: stats.readEmails,
    },
    {
      label: "Important Emails",
      value: stats.importantEmails,
    },
  ];

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">
          Inbox Health
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Scanned {formatNumber(scannedEmailCount)} of up to{" "}
          {formatNumber(maxAnalyzed)} inbox emails using Gmail metadata only.
          {scanComplete ? " Full scan complete." : " Scan limit reached."}
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

      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-600">Read Rate</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">
          {stats.readRate.toFixed(1)}%
        </p>
      </div>
    </section>
  );
}
