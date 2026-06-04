import type { CategoryStat } from "@/types/analytics";

type CategoryBreakdownProps = {
  categories: CategoryStat[];
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">
        Category Breakdown
      </h2>

      {categories.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">
          No category metadata available.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {categories.map((category) => (
            <div key={category.category}>
              <div className="flex justify-between gap-4 text-sm">
                <span className="font-medium text-gray-900">
                  {category.category}
                </span>
                <span className="text-gray-600">
                  {formatNumber(category.count)} ({category.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${Math.min(category.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
