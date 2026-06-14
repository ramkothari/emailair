"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
        <p className="text-sm text-blue-800 dark:text-[#A1A1AA]">Summarizing inbox...</p>
        <p className="text-sm text-blue-800 dark:text-[#A1A1AA]">Finding protected emails...</p>

        <div className="mt-4 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-blue-200 dark:bg-[#3F3F46]" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-blue-200 dark:bg-[#3F3F46]" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-blue-200 dark:bg-[#3F3F46]" />
        </div>
      </div>
    </div>
  );
}

function cleanSender(sender: string) {
  const name = sender.split("<")[0]?.trim().replace(/^"|"$/g, "");
  const email = sender.match(/<([^>]+)>/)?.[1] ?? sender;
  const domain = email.includes("@") ? email.split("@").pop() : null;

  return name || domain || sender || "Unknown sender";
}

function inferCategory(email: EmailMetadata) {
  const text = `${email.sender} ${email.subject} ${email.snippet}`.toLowerCase();

  if (text.includes("github")) return "GitHub Notifications";
  if (text.includes("product hunt")) return "Product Updates";
  if (text.includes("openai") || text.includes("ai ")) return "AI Newsletters";
  if (text.includes("payment") || text.includes("invoice") || text.includes("receipt")) {
    return "Payment Notifications";
  }
  if (text.includes("digest") || text.includes("newsletter")) return "News Digests";
  if (text.includes("linkedin")) return "LinkedIn Updates";
  return "Routine Updates";
}

function isProtectedEmail(email: EmailMetadata) {
  const text = `${email.sender} ${email.subject} ${email.snippet}`.toLowerCase();
  const protectedTerms = [
    "payment",
    "failed",
    "invoice",
    "receipt",
    "bill",
    "interview",
    "contract",
    "legal",
    "tax",
    "security",
    "recovery",
    "suspension",
    "domain renewal",
    "bank",
  ];
  const routineTerms = ["newsletter", "digest", "promotion", "marketing", "github issue"];

  return (
    protectedTerms.some((term) => text.includes(term)) &&
    !routineTerms.some((term) => text.includes(term))
  );
}

function getSenderBreakdown(emails: EmailMetadata[]) {
  const counts = new Map<string, number>();

  emails.forEach((email) => {
    const sender = cleanSender(email.sender);
    counts.set(sender, (counts.get(sender) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([sender, count]) => ({ sender, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
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
  const categories = useMemo(
    () => Array.from(new Set(emails.map(inferCategory))).slice(0, 8),
    [emails]
  );
  const senderBreakdown = useMemo(() => getSenderBreakdown(emails), [emails]);
  const protectedEmails = useMemo(
    () => emails.filter(isProtectedEmail).slice(0, 5),
    [emails]
  );

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

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
              Email Categories
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full bg-[#F3F3F3] px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-[#2A2A2E] dark:text-[#D4D4D8]"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
              Senders
            </h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {senderBreakdown.map((sender) => (
                <div
                  key={sender.sender}
                  className="flex justify-between rounded-xl border border-[rgba(0,0,0,0.08)] px-3 py-2 text-sm dark:border-[#3F3F46]"
                >
                  <span className="truncate text-gray-800 dark:text-[#D4D4D8]">
                    {sender.sender}
                  </span>
                  <span className="ml-3 font-semibold text-[#D97706]">
                    {sender.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
              Protected Emails
            </h4>
            {protectedEmails.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {protectedEmails.map((email) => (
                  <li
                    key={`${email.sender}-${email.subject}`}
                    className="rounded-2xl border border-[#D97706]/40 bg-[#D97706]/10 px-3 py-2 text-sm"
                  >
                    <span className="block font-medium text-gray-900 dark:text-[#F5F5F5]">
                      {email.subject}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-[#A1A1AA]">
                      {cleanSender(email.sender)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-600 dark:text-[#A1A1AA]">
                No payment failures, invoices, contracts, legal notices, tax
                documents, or security alerts detected.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
