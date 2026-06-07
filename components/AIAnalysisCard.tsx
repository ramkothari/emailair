"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { AIEmailBreakdown } from "@/components/AIEmailBreakdown";
import { AIRiskBadge } from "@/components/AIRiskBadge";
import { AIWarningsList } from "@/components/AIWarningsList";
import type { EmailMetadata } from "@/lib/ai";
import type {
  AnalysisResult,
  RiskResult,
  SummaryResult,
} from "@/lib/ai";

export type AnalyzeSearchResponse = {
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
  onAnalysisComplete?: (result: AnalyzeSearchResponse) => void;
  showHeader?: boolean;
  renderResult?: boolean;
  autoAnalyze?: boolean;
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
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-blue-900 dark:text-[#F5F5F5]">
          Analyzing Selected Emails...
        </p>
        <p className="text-sm text-blue-800 dark:text-[#A1A1AA]">Generating Summary...</p>
        <p className="text-sm text-blue-800 dark:text-[#A1A1AA]">Detecting Risks...</p>

        <div className="mt-4 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-blue-200 dark:bg-[#3F3F46]" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-blue-200 dark:bg-[#3F3F46]" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-blue-200 dark:bg-[#3F3F46]" />
        </div>
      </div>
    </div>
  );
}

export function AIAnalysisCard({
  emails,
  onAnalysisComplete,
  showHeader = true,
  renderResult = true,
  autoAnalyze = false,
}: AIAnalysisCardProps) {
  const [result, setResult] = useState<AnalyzeSearchResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRequestInFlightRef = useRef(false);
  const lastAutoAnalysisSignatureRef = useRef<string | null>(null);

  const analysisSignature = useMemo(() => {
    return emails
      .map((email) =>
        [email.sender, email.subject, email.snippet ?? "", email.date].join("::")
      )
      .join("||");
  }, [emails]);

  async function analyzeResults() {
    if (isRequestInFlightRef.current) {
      return;
    }

    isRequestInFlightRef.current = true;
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

      const typedResult = data as AnalyzeSearchResponse;
      setResult(typedResult);
      onAnalysisComplete?.(typedResult);
    } catch (analysisError) {
      console.error("Analyze results failed:", analysisError);
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Unable to analyze results. Please try again."
      );
    } finally {
      isRequestInFlightRef.current = false;
      setIsAnalyzing(false);
    }
  }

  useEffect(() => {
    if (analysisSignature.length === 0) return;
    if (!autoAnalyze) {
      setResult(null);
      setError(null);
      lastAutoAnalysisSignatureRef.current = null;
      return;
    }

    if (lastAutoAnalysisSignatureRef.current === analysisSignature) {
      return;
    }

    lastAutoAnalysisSignatureRef.current = analysisSignature;

    // Auto-trigger analysis when the provided email metadata changes.
    // This reuses the component's existing analyzeResults() function and state.
    analyzeResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisSignature, autoAnalyze]);

  if (emails.length === 0 && !showHeader) {
    return null;
  }

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-[#3F3F46] dark:bg-[#232326]">
      {showHeader ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">AI Analysis</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-[#A1A1AA]">
              Analyze selected emails before archiving or deleting.
            </p>
          </div>

          <button
            type="button"
            onClick={analyzeResults}
            disabled={isAnalyzing || emails.length === 0}
            className="inline-flex h-8 items-center rounded-full bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#F5F5F5] dark:text-[#18181B] dark:hover:bg-white"
          >
            {isAnalyzing
              ? "Analyzing..."
              : result
                ? `Refresh Selected (${emails.length})`
                : `Analyze Selected (${emails.length})`}
          </button>
        </div>
      ) : null}

      {isAnalyzing ? (
        <div className="mt-5">
          <AIAnalysisSkeleton />
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-[#5F3333] dark:bg-[#2D1F1F]">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          <div className="mt-3">
            <button
              type="button"
              onClick={analyzeResults}
              className="inline-flex h-8 items-center rounded-full bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-700"
            >
              Retry Analysis
            </button>
          </div>
        </div>
      ) : null}

      {result && renderResult ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
            <p className="text-sm font-medium text-indigo-900 dark:text-[#F5F5F5]">
              {result.summary.summary}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-indigo-700 dark:text-[#A1A1AA]">
              <span>
                Analyzed:{" "}
                <span className="font-semibold">
                  {result.analyzedCount.toLocaleString()} of{" "}
                  {result.totalProvided.toLocaleString()} emails
                </span>
              </span>
              {result.totalProvided > result.analyzedCount && (
                <span className="text-indigo-600 dark:text-[#71717A]">
                  (First {result.analyzedCount} shown)
                </span>
              )}
              <span className="text-indigo-600 dark:text-[#71717A]">
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
