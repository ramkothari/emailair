import type { ActivityTrends as ActivityTrendsData } from "@/types/analytics";

type ActivityTrendsProps = {
  trends: ActivityTrendsData;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function maxCount(items: Array<{ count: number }>): number {
  return Math.max(...items.map((item) => item.count), 1);
}

export function ActivityTrends({ trends }: ActivityTrendsProps) {
  const maxMonthly = maxCount(trends.byMonth);
  const maxWeekday = maxCount(trends.byWeekday);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">Activity Trends</h2>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Monthly Volume
          </h3>
          <div className="mt-3 space-y-3">
            {trends.byMonth.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(item.count)}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-indigo-600"
                    style={{ width: `${(item.count / maxMonthly) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Weekday Volume
          </h3>
          <div className="mt-3 space-y-3">
            {trends.byWeekday.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(item.count)}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-green-600"
                    style={{ width: `${(item.count / maxWeekday) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
