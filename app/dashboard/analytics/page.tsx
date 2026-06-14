import { redirect } from "next/navigation";
import { AnalyticsProgressiveDashboard } from "@/components/AnalyticsProgressiveDashboard";
import { auth } from "@/lib/auth";

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

  return (
    <section className="mb-8 space-y-6">
      <AnalyticsProgressiveDashboard
        limit={getAnalyticsScanLimit()}
        forceRefresh={Boolean(params?.refresh)}
      />
    </section>
  );
}
