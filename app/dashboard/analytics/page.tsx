import { redirect } from "next/navigation";
import { ActivityTrends } from "@/components/ActivityTrends";
import { AnalyticsOverview } from "@/components/AnalyticsOverview";
import { AnalyticsRefreshControls } from "@/components/AnalyticsRefreshControls";
import { AttachmentInsights } from "@/components/AttachmentInsights";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { EmailAgeDistribution } from "@/components/EmailAgeDistribution";
import { NewsletterInsights } from "@/components/NewsletterInsights";
import { SenderInsights } from "@/components/SenderInsights";
import { auth } from "@/lib/auth";
import { getEmailAnalytics } from "@/lib/analytics";

const DEFAULT_ANALYTICS_SCAN_LIMIT = 1_000;
const MAX_ANALYTICS_SCAN_LIMIT = 100_000;

function getAnalyticsScanLimit(): number {
  const configuredLimit = Number(process.env.ANALYTICS_EMAIL_LIMIT);

  if (!Number.isFinite(configuredLimit) || configuredLimit <= 0) {
    return DEFAULT_ANALYTICS_SCAN_LIMIT;
  }

  return Math.min(
    Math.floor(configuredLimit),
    MAX_ANALYTICS_SCAN_LIMIT
  );
}

type DashboardAnalyticsPageProps = {
  searchParams?: Promise<{
    refresh?: string;
  }>;
};

export default async function DashboardAnalyticsPage({
  searchParams,
}: DashboardAnalyticsPageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.accessToken) {
    redirect("/");
  }

  let analytics = null;
  let analyticsError: string | null = null;

  try {
    analytics = await getEmailAnalytics(
      session.accessToken,
      session.user?.email ?? "unknown-user",
      getAnalyticsScanLimit(),
      {
        forceRefresh: Boolean(params?.refresh),
      }
    );
  } catch (error) {
    analyticsError =
      error instanceof Error ? error.message : "Failed to load analytics.";
  }

  return (
    <section className="mb-8 space-y-6">
      {analyticsError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {analyticsError}
        </div>
      ) : analytics ? (
        <>
          <AnalyticsRefreshControls
            generatedAt={analytics.generatedAt}
            cached={analytics.cached}
          />

          <AnalyticsOverview
            stats={analytics.inboxHealth}
            scannedEmailCount={analytics.scannedEmailCount}
            maxAnalyzed={analytics.maxScanned}
            scanComplete={analytics.scanComplete}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryBreakdown categories={analytics.categoryBreakdown} />
            <AttachmentInsights stats={analytics.attachmentStats} />
          </div>

          <EmailAgeDistribution buckets={analytics.ageDistribution} />
          <SenderInsights insights={analytics.senderInsights} />
          <ActivityTrends trends={analytics.activityTrends} />
          <NewsletterInsights insights={analytics.newsletterInsights} />
        </>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Analytics unavailable. Reconnect Gmail if this continues.
        </div>
      )}
    </section>
  );
}
