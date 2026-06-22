import type { CleanupCandidate } from "@/types/analytics";

type CleanupCandidatesProps = {
  candidates: CleanupCandidate[];
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function getRecommendationClassName(recommendation: string): string {
  if (recommendation.toLowerCase().includes("delete")) {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (recommendation.toLowerCase().includes("archive")) {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

export function CleanupCandidates({ candidates }: CleanupCandidatesProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">
        Inbox Opportunities
      </h2>

      {candidates.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">
          No strong inbox opportunities found in the latest analyzed emails.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {candidates.map((candidate) => (
            <article
              key={`${candidate.title}-${candidate.recommendation}`}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <h3 className="text-sm font-semibold text-gray-900">
                {candidate.title}
              </h3>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatNumber(candidate.count)} emails
              </p>

              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Recommendation
                </p>

                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getRecommendationClassName(
                    candidate.recommendation
                  )}`}
                >
                  {candidate.recommendation}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
