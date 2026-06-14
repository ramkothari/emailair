"use client";

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

export function AIActionCard({
  summary,
  totalEmailsFound,
  emailsAnalyzed,
  isExecuting = false,
  onArchiveSearchResults,
  onMoveSearchResultsToTrash,
}: AIActionCardProps) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm dark:border-[#3F3F46] dark:bg-[#232326]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-[#F5F5F5]">
            Bulk Action Summary
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-[#A1A1AA]">
            {summary.summary}
          </p>
        </div>
        <div className="rounded-2xl bg-[#F8F8F8] px-3 py-2 text-sm dark:bg-[#2A2A2E]">
          <span className="font-semibold text-gray-900 dark:text-[#F5F5F5]">
            {totalEmailsFound.toLocaleString()}
          </span>{" "}
          <span className="text-gray-600 dark:text-[#A1A1AA]">
            emails selected
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-[#71717A]">
        Analyzed {emailsAnalyzed.toLocaleString()} visible emails. Protected
        emails can be managed from the Email Summary panel.
      </p>

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
      </div>
    </section>
  );
}
