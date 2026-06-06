"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";

type AnalyticsRefreshControlsProps = {
  generatedAt: string;
  cached: boolean;
};

function formatGeneratedAge(generatedAt: string): string {
  const generatedTime = new Date(generatedAt).getTime();

  if (!Number.isFinite(generatedTime)) {
    return "Analytics generated recently";
  }

  const ageMs = Date.now() - generatedTime;
  const ageMinutes = Math.max(0, Math.floor(ageMs / 60000));

  if (ageMinutes < 1) {
    return "Analytics generated just now";
  }

  if (ageMinutes === 1) {
    return "Analytics generated 1 minute ago";
  }

  return `Analytics generated ${ageMinutes} minutes ago`;
}

export function AnalyticsRefreshControls({
  generatedAt,
  cached,
}: AnalyticsRefreshControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const generatedLabel = useMemo(
    () => formatGeneratedAge(generatedAt),
    [generatedAt]
  );

  function refreshAnalytics() {
    startTransition(() => {
      router.push(`/dashboard/analytics?refresh=${Date.now()}`);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-[#232326] dark:ring-[#3F3F46]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-[#F5F5F5]">{generatedLabel}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-[#A1A1AA]">
            {cached
              ? "Served from in-memory cache. Gmail was not scanned again."
              : "Freshly generated from Gmail metadata."}
          </p>
        </div>

        <button
          type="button"
          onClick={refreshAnalytics}
          disabled={isPending}
          className="inline-flex h-8 items-center rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-3 text-xs font-medium text-gray-800 hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#F5F5F5] dark:hover:bg-white/[0.08]"
        >
          {isPending ? "Refreshing..." : "Refresh Analytics"}
        </button>
      </div>

      {isPending ? (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-[#18181B]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#60A5FA]" />
          </div>
          <p className="mt-2 text-xs text-gray-600 dark:text-[#A1A1AA]">
            Refreshing metadata scan...
          </p>
        </div>
      ) : null}
    </section>
  );
}
