"use client";

import { useState } from "react";
import { AIEmailBreakdown } from "@/components/AIEmailBreakdown";
import { AIRiskBadge } from "@/components/AIRiskBadge";
import { AIWarningsList } from "@/components/AIWarningsList";
import type {
  AnalysisResult,
  EmailMetadata,
  RiskResult,
  SummaryResult,
} from "@/lib/ai";

type AnalyzeSearchResponse = {
  analysis: AnalysisResult;
  risk: RiskResult;
  summary: SummaryResult;
  analyzedCount: number;
  totalProvided: number;
  analyzedAt: string;
  cached: boolean;
};

type AIAnalysisCardProps = {
  emails: EmailMetadata[];
};

function formatTimeAgo(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins === 1) return "1 minute ago";
  if (diffMins < 60) return `${diffMins} minutes ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function AIAnalysisSkeleton() {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-blue-900">
          Analyzing Results...
        </p>
        <p className="text-sm text-blue-800">Generating Summary...</p>
        <p className="text-sm text-blue-800">Detecting Risks...</p>

        <div className="mt-4 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-blue-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-blue-200" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-blue-200" />
        </div>
      </div>
    </div>
  );
}

export function AIAnalysisCard({ emails }: AIAnalysisCardProps) {
  const [result, setResult] = useState<AnalyzeSearchResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyzeResults() {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/ai/analyze-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails,
        }),
      });

      const data = (await response.json()) as
        | AnalyzeSearchResponse
        | { error?: string };

      if (!response.ok) {
        const errorMsg =
          "error" in data && data.error
            ? data.error
            : "Unable to analyze results. Please try again.";
        throw new Error(errorMsg);
      }

      setResult(data as AnalyzeSearchResponse);
    } catch (analysisError) {
      console.error("Analyze results failed:", analysisError);
      setError("Unable to analyze results. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (emails.length === 0) {
    return null;
  }

  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
          <p className="mt-1 text-sm text-gray-600">
            Analyze visible search results before archiving or deleting.
          </p>
        </div>

        <button
          type="button"
          onClick={analyzeResults}
          disabled={isAnalyzing}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAnalyzing ? "Analyzing..." : "Analyze Results"}
        </button>
      </div>

      {isAnalyzing ? (
        <div className="mt-5">
          <AIAnalysisSkeleton />
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm font-medium text-indigo-900">
              {result.summary.summary}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-indigo-700">
              <span>
                Analyzed:{" "}
                <span className="font-semibold">
                  {result.analyzedCount.toLocaleString()} of{" "}
                  {result.totalProvided.toLocaleString()} emails
                </span>
              </span>
              {result.totalProvided > result.analyzedCount && (
                <span className="text-indigo-600">
                  (First {result.analyzedCount} shown)
                </span>
              )}
              <span className="text-indigo-600">
                {result.cached ? "🔄 Cached " : ""}
                {formatTimeAgo(result.analyzedAt)}
              </span>
            </div>
          </div>

          <AIRiskBadge risk={result.risk} />

          <AIEmailBreakdown analysis={result.analysis} />

          <AIWarningsList risk={result.risk} />
        </div>
      ) : null}
    </section>
  );
}
