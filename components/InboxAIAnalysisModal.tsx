"use client";

import { useState } from "react";
import { AIActionCard } from "@/components/AIActionCard";
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

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30">
      <div className="ml-auto flex h-full w-full max-w-4xl flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              AI Analysis
            </h2>
            <p className="text-sm text-gray-500">
              Review summary, risk, warnings, and suggested actions.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AIAnalysisCard
            emails={emails}
            onAnalysisComplete={setAnalysisResult}
          />

          {analysisResult ? (
            <AIActionCard
              analysis={analysisResult.analysis}
              risk={analysisResult.risk}
              summary={analysisResult.summary}
              totalEmailsFound={totalEmailsFound}
              emailsAnalyzed={analysisResult.analyzedCount}
              analyzedAt={analysisResult.analyzedAt}
              isExecuting={isExecuting}
              onArchiveSearchResults={onArchiveResults}
              onMoveSearchResultsToTrash={onMoveResultsToTrash}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
