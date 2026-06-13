"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type {
  AutomationConditionJson,
  AutomationPreviewResult,
} from "@/lib/automations/types";

type RecommendedAutomation = {
  name: string;
  count: string;
  description: string;
  preset: string;
};

function conditionForPreset(preset: string): AutomationConditionJson {
  if (preset === "social") {
    return { field: "category", operator: "equals", value: "social" };
  }

  if (preset === "receipts") {
    return { field: "subject", operator: "contains", value: "receipt" };
  }

  return { field: "category", operator: "equals", value: "promotions" };
}

export function RecommendedAutomationCard({
  automation,
}: {
  automation: RecommendedAutomation;
}) {
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<AutomationPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function previewAutomation() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/automations/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conditionJson: conditionForPreset(automation.preset),
          }),
        });
        const body = (await response.json()) as
          | AutomationPreviewResult
          | { error?: string };

        if (!response.ok) {
          throw new Error("error" in body ? body.error : "Preview failed.");
        }

        setPreview(body as AutomationPreviewResult);
      } catch (nextError) {
        setError(
          nextError instanceof Error ? nextError.message : "Preview failed."
        );
      }
    });
  }

  return (
    <article className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5 shadow-sm dark:border-[#3F3F46] dark:bg-[#232326]">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
        {automation.name}
      </h3>
      <p className="mt-1 text-sm font-medium text-[#D97706]">
        {preview
          ? `${preview.totalMatches.toLocaleString()} emails found`
          : automation.count}
      </p>
      <p className="mt-3 min-h-10 text-sm text-gray-600 dark:text-[#A1A1AA]">
        {automation.description}
      </p>

      {preview ? (
        <div className="mt-4 rounded-xl bg-[#F8F8F8] p-3 dark:bg-[#2A2A2E]">
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
            Preview
          </p>
          <ul className="mt-2 space-y-2 text-xs text-gray-700 dark:text-[#D4D4D8]">
            {preview.samples.slice(0, 3).map((sample) => (
              <li key={`${sample.sender}-${sample.subject}`}>
                <span className="block font-medium">{sample.sender}</span>
                <span className="block truncate text-gray-500 dark:text-[#A1A1AA]">
                  {sample.subject}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-xs text-red-600 dark:text-red-300">{error}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={previewAutomation}
          disabled={isPending}
          className="inline-flex h-8 items-center rounded-full border border-[rgba(0,0,0,0.08)] px-3 text-xs font-medium text-gray-700 transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E]"
        >
          Preview
        </button>
        <Link
          href={`/dashboard/automation/new?preset=${automation.preset}`}
          className="inline-flex h-8 items-center rounded-full bg-gray-950 px-3 text-xs font-medium text-white transition hover:bg-gray-800 dark:bg-[#F5F5F5] dark:text-[#18181B]"
        >
          Create
        </Link>
      </div>
    </article>
  );
}
