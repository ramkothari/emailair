import type { SenderInsights as SenderInsightsData } from "@/types/analytics";

type SenderInsightsProps = {
  insights: SenderInsightsData;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function SenderInsights({ insights }: SenderInsightsProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">Sender Insights</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-600">Unique Senders</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatNumber(insights.uniqueSenders)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-600">Repeat Senders</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatNumber(insights.repeatSenders)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-600">No-Reply Senders</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatNumber(insights.noReplySenders)}
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="py-3 pr-4 text-left text-sm font-semibold text-gray-900">
                Top Sender
              </th>
              <th className="py-3 text-right text-sm font-semibold text-gray-900">
                Emails
              </th>
              <th className="py-3 text-right text-sm font-semibold text-gray-900">
                Share
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {insights.topSenders.map((sender) => (
              <tr key={sender.sender}>
                <td className="py-3 pr-4 text-sm text-gray-900">
                  {sender.sender}
                </td>
                <td className="py-3 text-right text-sm font-medium text-gray-900">
                  {formatNumber(sender.count)}
                </td>
                <td className="py-3 text-right text-sm text-gray-600">
                  {sender.percentage.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
