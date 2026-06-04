import type { NewsletterInsights as NewsletterInsightsData } from "@/types/analytics";

type NewsletterInsightsProps = {
  insights: NewsletterInsightsData;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function NewsletterInsights({ insights }: NewsletterInsightsProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">
        Newsletter Insights
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-600">
            Newsletter Emails
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatNumber(insights.newsletterEmails)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-600">
            Newsletter Senders
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatNumber(insights.newsletterSenders)}
          </p>
        </div>
      </div>

      {insights.topNewsletterSenders.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="py-3 pr-4 text-left text-sm font-semibold text-gray-900">
                  Sender
                </th>
                <th className="py-3 text-right text-sm font-semibold text-gray-900">
                  Emails
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {insights.topNewsletterSenders.map((sender) => (
                <tr key={sender.sender}>
                  <td className="py-3 pr-4 text-sm text-gray-900">
                    {sender.sender}
                  </td>
                  <td className="py-3 text-right text-sm font-medium text-gray-900">
                    {formatNumber(sender.count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-600">
          No newsletter metadata detected in the scanned inbox sample.
        </p>
      )}
    </section>
  );
}
