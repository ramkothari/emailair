"use client";

import { useMemo } from "react";
import type { AnalysisResult, RiskResult, SummaryResult } from "@/lib/ai";

type AIActionCardProps = {
  analysis: AnalysisResult;
  risk: RiskResult;
  summary: SummaryResult;
  totalEmailsFound: number;
  emailsAnalyzed: number;
  analyzedAt: string;
  isExecuting?: boolean;
  onArchiveSearchResults?: () => void;
  onMoveSearchResultsToTrash?: () => void;
};

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return isoString;
    }
    return date.toLocaleString();
  } catch {
    return isoString;
  }
}

function getRiskBadgeClasses(riskLevel: string): string {
  switch (riskLevel.toLowerCase()) {
    case "high":
      return "bg-red-50 text-red-700 ring-red-200";
    case "medium":
      return "bg-yellow-50 text-yellow-700 ring-yellow-200";
    case "low":
      return "bg-green-50 text-green-700 ring-green-200";
    default:
      return "bg-gray-50 text-gray-700 ring-gray-200";
  }
}

export function AIActionCard({
  analysis,
  risk,
  summary,
  totalEmailsFound,
  emailsAnalyzed,
  analyzedAt,
  isExecuting = false,
  onArchiveSearchResults,
  onMoveSearchResultsToTrash,
}: AIActionCardProps) {
  const riskColor = useMemo(
    () => getRiskBadgeClasses(risk.riskLevel),
    [risk.riskLevel]
  );

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Recommended Actions
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Decision layer only. Execution is not enabled yet.
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${riskColor}`}
        >
          Risk: {risk.riskLevel.charAt(0).toUpperCase() + risk.riskLevel.slice(1)}
        </span>
      </div>

      {/* Metrics Grid */}
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-gray-50 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Selected Emails
          </dt>
          <dd className="mt-1 text-lg font-semibold text-gray-900">
            {totalEmailsFound}
          </dd>
        </div>

        <div className="rounded-2xl bg-gray-50 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Emails Analyzed
          </dt>
          <dd className="mt-1 text-lg font-semibold text-gray-900">
            {emailsAnalyzed}
          </dd>
        </div>

        <div className="rounded-2xl bg-gray-50 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Risk Score
          </dt>
          <dd className="mt-1 text-lg font-semibold text-gray-900">
            {risk.riskScore.toFixed(2)}
          </dd>
        </div>

        <div className="rounded-2xl bg-gray-50 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Analysis Time
          </dt>
          <dd className="mt-1 text-sm font-medium text-gray-900">
            {formatTimestamp(analyzedAt)}
          </dd>
        </div>
      </dl>

      {/* Analysis Insights */}
      <div className="mt-4 space-y-3">
        {/* Themes */}
        {analysis.themes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900">Themes</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {analysis.themes.map((theme) => (
                <span
                  key={theme}
                  className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Patterns */}
        {analysis.patterns.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900">Patterns</h4>
            <ul className="mt-2 space-y-1">
              {analysis.patterns.map((pattern) => (
                <li key={pattern} className="text-sm text-gray-700">
                  • {pattern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concerns */}
        {risk.concerns.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900">Risk Concerns</h4>
            <ul className="mt-2 space-y-1">
              {risk.concerns.map((concern) => (
                <li key={concern} className="text-sm text-red-700">
                  ⚠ {concern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendation */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
          <h4 className="text-sm font-medium text-blue-900">Recommendation</h4>
          <p className="mt-1 text-sm text-blue-800">{risk.recommendation}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onArchiveSearchResults}
          disabled={isExecuting || totalEmailsFound === 0 || !onArchiveSearchResults}
          className="inline-flex h-8 items-center rounded-full bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Archive Selected
        </button>

        <button
          type="button"
          onClick={onMoveSearchResultsToTrash}
          disabled={isExecuting || totalEmailsFound === 0 || !onMoveSearchResultsToTrash}
          className="inline-flex h-8 items-center rounded-full bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Move Selected To Trash
        </button>

        <button
          type="button"
          disabled
          title="Download execution is deferred."
          className="inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium text-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Download Selected
        </button>
      </div>
    </section>
  );
}
