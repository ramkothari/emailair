"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityTrends } from "@/components/ActivityTrends";
import { AnalyticsOverview } from "@/components/AnalyticsOverview";
import { AttachmentInsights } from "@/components/AttachmentInsights";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { EmailAgeDistribution } from "@/components/EmailAgeDistribution";
import { NewsletterInsights } from "@/components/NewsletterInsights";
import { SenderInsights } from "@/components/SenderInsights";
import type { EmailAnalytics } from "@/types/analytics";

type AnalyticsProgressiveDashboardProps = {
  limit: number;
  forceRefresh: boolean;
};

const BATCH_SIZES = [50, 100, 250, 500];

function getEmptyAttachmentStats() {
  return {
    emailsWithAttachments: 0,
    largestMessageSizeEstimate: 0,
    estimatedAttachmentMessageBytes: 0,
  };
}

function ProgressChecklist({ loading }: { loading: boolean }) {
  if (!loading) {
    return null;
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-[#232326] dark:ring-[#3F3F46]">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
          Analyzing inbox...
        </h2>
        <div className="h-2 overflow-hidden rounded-full bg-orange-100 dark:bg-[#3A2A1F]">
          <div className="h-full w-1/3 animate-[analytics-loading_1.2s_ease-in-out_infinite] rounded-full bg-[#F97316]" />
        </div>
      </div>

      <style jsx>{`
        @keyframes analytics-loading {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(320%);
          }
        }
      `}</style>
    </section>
  );
}

export function AnalyticsProgressiveDashboard({
  limit,
  forceRefresh,
}: AnalyticsProgressiveDashboardProps) {
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const cancelledRef = useRef(false);

  const refreshToken = useMemo(
    () => (forceRefresh || refreshNonce > 0 ? Date.now().toString() : ""),
    [forceRefresh, refreshNonce]
  );

  const loadAnalytics = useCallback(async () => {
    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    let index = 0;
    let done = false;

    while (!done) {
      const batchSize = BATCH_SIZES[index] ?? 500;
      const params = new URLSearchParams({
        limit: String(limit),
        batchSize: String(batchSize),
      });

      if (index === 0 && (forceRefresh || refreshNonce > 0)) {
        params.set("refresh", "1");
      }

      if (refreshToken) {
        params.set("request", refreshToken);
      }

      const response = await fetch(`/api/analytics?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to load analytics.");
      }

      const payload = (await response.json()) as {
        analytics: EmailAnalytics;
      };

      if (cancelledRef.current) {
        return;
      }

      setAnalytics(payload.analytics);

      if (payload.analytics.scanComplete) {
        done = true;
      }

      index += 1;
    }
  }, [forceRefresh, limit, refreshNonce, refreshToken]);

  useEffect(() => {
    loadAnalytics()
      .catch((loadError) => {
        if (!cancelledRef.current) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load analytics."
          );
        }
      })
      .finally(() => {
        if (!cancelledRef.current) {
          setLoading(false);
        }
      });

    return () => {
      cancelledRef.current = true;
    };
  }, [loadAnalytics]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-[#5F3333] dark:bg-[#2D1F1F] dark:text-[#FB7185]">
        {error}
      </div>
    );
  }

  return (
    <>
      <ProgressChecklist loading={loading} />

      {analytics ? (
        <>
          <AnalyticsOverview
            stats={analytics.inboxHealth}
            scannedEmailCount={analytics.scannedEmailCount}
            maxAnalyzed={analytics.maxScanned}
            scanComplete={analytics.scanComplete}
            onRefresh={() => setRefreshNonce((value) => value + 1)}
            refreshing={loading}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryBreakdown categories={analytics.categoryBreakdown} />
            <AttachmentInsights
              stats={
                analytics.progress.secondaryAnalyticsReady
                  ? analytics.attachmentStats
                  : getEmptyAttachmentStats()
              }
            />
          </div>

          <EmailAgeDistribution buckets={analytics.ageDistribution} />
          <SenderInsights insights={analytics.senderInsights} />
          <ActivityTrends trends={analytics.activityTrends} />
          <NewsletterInsights insights={analytics.newsletterInsights} />
        </>
      ) : null}
    </>
  );
}
