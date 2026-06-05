import type { CategoryStat } from "@/types/analytics";

type CategoryBreakdownProps = {
  categories: CategoryStat[];
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const accents = ["#60A5FA", "#34D399", "#A78BFA", "#FB7185", "#FBBF24"];

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-[#232326] dark:ring-[#3F3F46]">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
        Category Breakdown
      </h2>

      {categories.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600 dark:text-[#A1A1AA]">
          No category metadata available.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {categories.map((category, index) => (
            <div key={category.category}>
              <div className="flex justify-between gap-4 text-sm">
                <span className="font-medium text-gray-900 dark:text-[#F5F5F5]">
                  {category.category}
                </span>
                <span className="text-gray-600 dark:text-[#A1A1AA]">
                  {formatNumber(category.count)} ({category.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-[#18181B]">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.min(category.percentage, 100)}%`,
                    backgroundColor: accents[index % accents.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
