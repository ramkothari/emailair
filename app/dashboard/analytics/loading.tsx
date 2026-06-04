function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
      <div className="mt-3 h-8 w-20 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

function SkeletonSection({ cards = 4 }: { cards?: number }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </section>
  );
}

export default function AnalyticsLoading() {
  return (
    <section className="mb-8 space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-4 w-52 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200" />
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
        </div>
      </section>

      <SkeletonSection />
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonSection cards={3} />
        <SkeletonSection cards={3} />
      </div>
      <SkeletonSection cards={5} />
    </section>
  );
}
