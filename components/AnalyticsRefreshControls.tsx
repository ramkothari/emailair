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
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{generatedLabel}</p>
          <p className="mt-1 text-sm text-gray-600">
            {cached
              ? "Served from in-memory cache. Gmail was not scanned again."
              : "Freshly generated from Gmail metadata."}
          </p>
        </div>

        <button
          type="button"
          onClick={refreshAnalytics}
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Refreshing..." : "Refresh Analytics"}
        </button>
      </div>

      {isPending ? (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-blue-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
          </div>
          <p className="mt-2 text-xs text-blue-700">
            Refreshing metadata scan...
          </p>
        </div>
      ) : null}
    </section>
  );
}
