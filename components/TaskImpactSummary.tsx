"use client";

import type { TaskRunResult } from "@/types/task-preview";

type TaskImpactSummaryProps = {
  result: TaskRunResult;
};

function formatAction(action: TaskRunResult["action"]): string {
  switch (action) {
    case "delete":
      return "Delete";
    case "archive":
      return "Archive";
    case "download":
      return "Download";
    default:
      return "Unknown";
  }
}

function getRiskClassName(risk: string): string {
  switch (risk) {
    case "high":
      return "bg-red-50 text-red-700 ring-red-200";
    case "medium":
      return "bg-yellow-50 text-yellow-800 ring-yellow-200";
    case "low":
      return "bg-green-50 text-green-700 ring-green-200";
    default:
      return "bg-gray-50 text-gray-700 ring-gray-200";
  }
}

export function TaskImpactSummary({ result }: TaskImpactSummaryProps) {
  const showAnalysisSampleWarning = result.foundCount > result.analyzedCount;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Impact Summary
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Preview only. No Gmail action has been executed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-500">Action</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatAction(result.action)}
          </p>
        </div>

        <div className="rounded-lg border bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-500">Found</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {result.foundCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">total matches</p>
        </div>

        <div className="rounded-lg border bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-500">Analyzed</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {result.analyzedCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">for AI analysis</p>
        </div>

        <div className="rounded-lg border bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-500">
            Potentially Important
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {result.analysis.important}
          </p>
        </div>
      </div>

      {showAnalysisSampleWarning ? (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Note:</span> AI analysis ran on the
            first {result.analyzedCount} emails of {result.foundCount} total
            matches to keep costs predictable.
          </p>
        </div>
      ) : null}

      <div className="mt-5 rounded-lg border bg-gray-50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-gray-700">Risk</p>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ${getRiskClassName(
              result.risk.risk
            )}`}
          >
            {result.risk.risk.charAt(0).toUpperCase() + result.risk.risk.slice(1)}
          </span>
        </div>

        {result.risk.warnings.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700">
              Warnings ({result.risk.warnings.length})
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {result.risk.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-600">
            No specific warnings detected.
          </p>
        )}
      </div>

      <div className="mt-5 rounded-lg border bg-blue-50 p-4">
        <p className="text-sm font-medium text-blue-900">AI Summary</p>
        <p className="mt-2 text-sm text-blue-800">
          {result.summary.summary}
        </p>
      </div>
    </div>
  );
}
