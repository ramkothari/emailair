"use client";

import { useEffect, useState } from "react";
import {
  AIAnalysisCard,
  type AnalyzeSearchResponse,
} from "@/components/AIAnalysisCard";
import type { EmailMetadata } from "@/lib/ai";

type InboxAIAnalysisModalProps = {
  open: boolean;
  emails: EmailMetadata[];
  totalEmailsFound: number;
  isExecuting?: boolean;
  onClose: () => void;
  onArchiveResults: () => void;
  onMoveResultsToTrash: () => void;
};

export function InboxAIAnalysisModal({
  open,
  emails,
  totalEmailsFound,
  isExecuting = false,
  onClose,
  onArchiveResults,
  onMoveResultsToTrash,
}: InboxAIAnalysisModalProps) {
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzeSearchResponse | null>(null);

  useEffect(() => {
    setAnalysisResult(null);
  }, [emails]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="ml-auto flex h-full w-full max-w-4xl flex-col rounded-l-2xl bg-white shadow-xl dark:bg-[#232326]">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-[#3F3F46]">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
              AI Analysis
            </h2>
            <p className="text-sm text-gray-500 dark:text-[#A1A1AA]">
              Review summary, themes, patterns, risks, and suggested actions.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-full border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AIAnalysisCard
            emails={emails}
            onAnalysisComplete={setAnalysisResult}
            showHeader={false}
            renderResult={false}
            autoAnalyze
          />

          {analysisResult ? (
            <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-[#3F3F46] dark:bg-[#232326]">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
                <h3 className="text-sm font-semibold text-indigo-950 dark:text-[#F5F5F5]">
                  Summary
                </h3>
                <p className="mt-2 text-sm leading-6 text-indigo-900 dark:text-[#A1A1AA]">
                  {analysisResult.summary.summary}
                </p>
                <p className="mt-3 text-xs text-indigo-700 dark:text-[#71717A]">
                  Analyzed {analysisResult.analyzedCount.toLocaleString()} of{" "}
                  {analysisResult.totalProvided.toLocaleString()} visible emails.
                </p>
              </div>

              {analysisResult.analysis.themes.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
                    Themes
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysisResult.analysis.themes.map((theme) => (
                      <span
                        key={theme}
                        className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-[#202834] dark:text-[#A1C0E4]"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {analysisResult.analysis.patterns.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
                    Patterns
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {analysisResult.analysis.patterns.map((pattern) => (
                      <li key={pattern} className="text-sm text-gray-700 dark:text-[#A1A1AA]">
                        - {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
                    Risks & Concerns
                  </h3>
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200 dark:bg-[#1F2D26] dark:text-green-300 dark:ring-[#315341]">
                    Risk:{" "}
                    {analysisResult.risk.riskLevel.charAt(0).toUpperCase() +
                      analysisResult.risk.riskLevel.slice(1)}
                  </span>
                </div>

                {analysisResult.risk.concerns.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {analysisResult.risk.concerns.map((concern) => (
                      <li
                        key={concern}
                        className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-[#5F3333] dark:bg-[#2D1F1F] dark:text-red-300"
                      >
                        Warning: {concern}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-gray-600 dark:text-[#A1A1AA]">
                    No specific risks or concerns detected.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-[#3F3F46] dark:bg-[#202834]">
                <h3 className="text-sm font-semibold text-blue-950 dark:text-[#F5F5F5]">
                  Recommendation
                </h3>
                <p className="mt-2 text-sm leading-6 text-blue-900 dark:text-[#A1A1AA]">
                  {analysisResult.risk.recommendation}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onArchiveResults}
                  disabled={isExecuting || totalEmailsFound === 0}
                  className="inline-flex h-8 items-center rounded-full bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#F5F5F5] dark:text-[#18181B] dark:hover:bg-white"
                >
                  Archive Emails
                </button>

                <button
                  type="button"
                  onClick={onMoveResultsToTrash}
                  disabled={isExecuting || totalEmailsFound === 0}
                  className="inline-flex h-8 items-center rounded-full bg-red-600 px-3 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Move To Trash
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 items-center rounded-full border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
                >
                  Review Emails
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 items-center rounded-full border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
                >
                  Keep Results
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
