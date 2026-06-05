import type { NewsletterInsights as NewsletterInsightsData } from "@/types/analytics";

type NewsletterInsightsProps = {
  insights: NewsletterInsightsData;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function NewsletterInsights({ insights }: NewsletterInsightsProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-[#232326] dark:ring-[#3F3F46]">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
        Newsletter Insights
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
          <p className="text-sm font-medium text-gray-600 dark:text-[#A1A1AA]">
            Newsletter Emails
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-[#F5F5F5]">
            {formatNumber(insights.newsletterEmails)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
          <p className="text-sm font-medium text-gray-600 dark:text-[#A1A1AA]">
            Newsletter Senders
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-[#F5F5F5]">
            {formatNumber(insights.newsletterSenders)}
          </p>
        </div>
      </div>

      {insights.topNewsletterSenders.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-[#3F3F46]">
            <thead>
              <tr>
                <th className="py-3 pr-4 text-left text-sm font-semibold text-gray-900 dark:text-[#A1A1AA]">
                  Sender
                </th>
                <th className="py-3 text-right text-sm font-semibold text-gray-900 dark:text-[#A1A1AA]">
                  Emails
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#3F3F46]">
              {insights.topNewsletterSenders.map((sender) => (
                <tr key={sender.sender}>
                  <td className="py-3 pr-4 text-sm text-gray-900 dark:text-[#F5F5F5]">
                    {sender.sender}
                  </td>
                  <td className="py-3 text-right text-sm font-medium text-gray-900 dark:text-[#F5F5F5]">
                    {formatNumber(sender.count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-600 dark:text-[#A1A1AA]">
          No newsletter metadata detected in the scanned inbox sample.
        </p>
      )}
    </section>
  );
}
