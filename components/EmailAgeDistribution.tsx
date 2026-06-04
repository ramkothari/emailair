import type { EmailAgeBucket } from "@/types/analytics";

type EmailAgeDistributionProps = {
  buckets: EmailAgeBucket[];
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function EmailAgeDistribution({ buckets }: EmailAgeDistributionProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">
        Email Age Distribution
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {buckets.map((bucket) => (
          <div
            key={bucket.label}
            className="rounded-xl border border-gray-200 bg-gray-50 p-4"
          >
            <p className="text-sm font-medium text-gray-600">{bucket.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatNumber(bucket.count)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {bucket.percentage.toFixed(1)}%
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
