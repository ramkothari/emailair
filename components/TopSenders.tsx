import type { SenderStat } from "@/types/analytics";

type TopSendersProps = {
  senders: SenderStat[];
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function TopSenders({ senders }: TopSendersProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">Top 10 Senders</h2>

      {senders.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">
          No sender data available.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
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
              {senders.map((sender) => (
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
      )}
    </section>
  );
}
