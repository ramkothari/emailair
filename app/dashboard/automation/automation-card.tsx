"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type {
  AutomationCondition,
  AutomationConditionJson,
  AutomationPreviewResult,
  AutomationRecord,
} from "@/lib/automations/types";

type RunResult = {
  emailsMatched: number;
  emailsProcessed: number;
};

function flattenConditions(
  conditionJson: AutomationConditionJson | null
): AutomationCondition[] {
  if (!conditionJson) {
    return [];
  }

  if ("conditions" in conditionJson) {
    return conditionJson.conditions;
  }

  return [conditionJson];
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatEmails(conditionJson: AutomationRecord["conditionJson"]): string {
  const conditions = flattenConditions(conditionJson);
  const primary = conditions.find(
    (condition) => condition.field !== "received_between"
  );

  if (!primary) return "Matching emails";

  if (primary.field === "category" && primary.value === "promotions") {
    return "Newsletters & Promotions";
  }

  if (primary.field === "category" && primary.value === "social") {
    return "Social Updates";
  }

  if (primary.field === "subject" && /receipt|invoice/i.test(primary.value)) {
    return "Receipts & Invoices";
  }

  if (primary.field === "subject" && /job/i.test(primary.value)) {
    return "Job Alerts";
  }

  if (primary.field === "has_attachment" && primary.value) {
    return "Important Documents";
  }

  if (primary.field === "sender") {
    return `Emails from ${primary.value}`;
  }

  if (primary.field === "subject") {
    return `Emails about ${primary.value}`;
  }

  if (primary.field === "label") {
    return `${primary.value} emails`;
  }

  return "Custom matching emails";
}

function formatDateRange(
  conditionJson: AutomationRecord["conditionJson"]
): string {
  const dateCondition = flattenConditions(conditionJson).find(
    (condition) => condition.field === "received_between"
  );

  if (!dateCondition || dateCondition.field !== "received_between") {
    return "All matching emails";
  }

  return `${formatDate(dateCondition.value.from)} to ${formatDate(
    dateCondition.value.to
  )}`;
}

function formatAction(actionJson: AutomationRecord["actionJson"]): string {
  if (!actionJson) {
    return "Not configured";
  }

  if (actionJson.type === "delete") {
    return "Move To Trash";
  }

  if (actionJson.type === "mark_read") {
    return "Mark Read";
  }

  return actionJson.type.replaceAll("_", " ");
}

function formatSchedule(scheduleValue: AutomationRecord["scheduleValue"]): string {
  if (!scheduleValue) {
    return "Not scheduled";
  }

  if (scheduleValue.type === "once") {
    return `Run once on ${new Date(scheduleValue.runAt).toLocaleString()}`;
  }

  if (scheduleValue.type === "daily") {
    return `Every day at ${scheduleValue.time}`;
  }

  if (scheduleValue.type === "weekly") {
    const day = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][scheduleValue.dayOfWeek];
    return `Every ${day} at ${scheduleValue.time}`;
  }

  if (scheduleValue.type === "monthly") {
    return `Every month on day ${scheduleValue.dayOfMonth} at ${scheduleValue.time}`;
  }

  return `Every ${scheduleValue.every} ${scheduleValue.unit}`;
}

function formatNextRun(nextRunAt: string | null) {
  if (!nextRunAt) return "Not scheduled";

  return new Date(nextRunAt).toLocaleString();
}

export function AutomationCard({
  automation,
}: {
  automation: AutomationRecord;
}) {
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<AutomationPreviewResult | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPreview() {
    if (!automation.conditionJson) {
      throw new Error("Automation is missing email matching settings.");
    }

    const response = await fetch("/api/automations/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conditionJson: automation.conditionJson }),
    });
    const body = (await response.json()) as
      | AutomationPreviewResult
      | { error?: string };

    if (!response.ok) {
      throw new Error("error" in body ? body.error : "Preview failed.");
    }

    setPreview(body as AutomationPreviewResult);
    return body as AutomationPreviewResult;
  }

  function previewAutomation() {
    setError(null);
    startTransition(async () => {
      try {
        await loadPreview();
      } catch (nextError) {
        setError(
          nextError instanceof Error ? nextError.message : "Preview failed."
        );
      }
    });
  }

  function runNow() {
    setError(null);
    startTransition(async () => {
      let currentPreview = preview;
      try {
        currentPreview = await loadPreview();
      } catch {
        currentPreview = null;
      }

      const response = await fetch(`/api/automations/${automation.id}/run`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? "Failed to run automation.");
        return;
      }

      const body = (await response.json()) as {
        result?: RunResult;
      };

      if (body.result) {
        setRunResult(body.result);
      }

      if (!currentPreview) {
        window.location.reload();
      }
    });
  }

  function toggleEnabled() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/automations/${automation.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: !automation.enabled,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? "Failed to update automation.");
        return;
      }

      window.location.reload();
    });
  }

  function deleteAutomation() {
    if (!window.confirm(`Delete "${automation.name}"?`)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/automations/${automation.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? "Failed to delete automation.");
        return;
      }

      window.location.reload();
    });
  }

  const totalMatchingEmails =
    preview?.totalMatches ?? preview?.count ?? runResult?.emailsMatched ?? null;
  const processedEmails = runResult?.emailsProcessed ?? null;
  const remainingEmails =
    totalMatchingEmails !== null && processedEmails !== null
      ? Math.max(totalMatchingEmails - processedEmails, 0)
      : null;

  return (
    <article className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5 shadow-sm dark:border-[#3F3F46] dark:bg-[#232326]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-[#F5F5F5]">
            {automation.name}
          </h2>
          {automation.description ? (
            <p className="mt-1 text-sm text-gray-600 dark:text-[#A1A1AA]">
              {automation.description}
            </p>
          ) : null}
        </div>

        <span className="w-fit rounded-full border border-[rgba(0,0,0,0.08)] px-3 py-1 text-xs text-gray-700 dark:border-[#3F3F46] dark:text-[#A1A1AA]">
          {automation.enabled ? "Active" : "Disabled"}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
            Emails
          </p>
          <p className="mt-1 text-sm text-gray-900 dark:text-[#F5F5F5]">
            {formatEmails(automation.conditionJson)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
            Date Range
          </p>
          <p className="mt-1 text-sm text-gray-900 dark:text-[#F5F5F5]">
            {formatDateRange(automation.conditionJson)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
            Action
          </p>
          <p className="mt-1 text-sm capitalize text-gray-900 dark:text-[#F5F5F5]">
            {formatAction(automation.actionJson)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
            Schedule
          </p>
          <p className="mt-1 text-sm text-gray-900 dark:text-[#F5F5F5]">
            {formatSchedule(automation.scheduleValue)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
            Next Run
          </p>
          <p className="mt-1 text-sm text-gray-900 dark:text-[#F5F5F5]">
            {formatNextRun(automation.nextRunAt)}
          </p>
        </div>
      </div>

      {preview || runResult ? (
        <div className="mt-5 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#F8F8F8] p-4 dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
                Total Matching Emails
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
                {totalMatchingEmails?.toLocaleString() ?? "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
                Processed Emails
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
                {processedEmails !== null
                  ? `${processedEmails.toLocaleString()} processed this run`
                  : "Not run yet"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
                Remaining Emails
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
                {remainingEmails !== null
                  ? `${remainingEmails.toLocaleString()} remaining`
                  : "Preview first"}
              </p>
            </div>
          </div>

          {preview?.samples.length ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
                Preview
              </p>
              <ul className="mt-2 grid gap-2 md:grid-cols-2">
                {preview.samples.slice(0, 4).map((sample) => (
                  <li
                    key={`${sample.sender}-${sample.subject}`}
                    className="rounded-xl bg-white px-3 py-2 text-xs dark:bg-[#232326]"
                  >
                    <span className="block font-medium text-gray-800 dark:text-[#F5F5F5]">
                      {sample.sender}
                    </span>
                    <span className="block truncate text-gray-500 dark:text-[#A1A1AA]">
                      {sample.subject}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-[#5F3333] dark:bg-[#2D1F1F] dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={previewAutomation}
          disabled={isPending}
          className="inline-flex h-8 items-center rounded-full border border-[rgba(0,0,0,0.08)] px-3 text-xs font-medium text-gray-700 transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E]"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={runNow}
          disabled={isPending}
          className="inline-flex h-8 items-center rounded-full bg-gray-950 px-3 text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#F5F5F5] dark:text-[#18181B]"
        >
          Run Now
        </button>
        <Link
          href={`/dashboard/automation/${automation.id}/edit`}
          className="inline-flex h-8 items-center rounded-full border border-[rgba(0,0,0,0.08)] px-3 text-xs font-medium text-gray-700 transition hover:bg-[#F3F3F3] dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E]"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={toggleEnabled}
          disabled={isPending}
          className="inline-flex h-8 items-center rounded-full border border-[rgba(0,0,0,0.08)] px-3 text-xs font-medium text-gray-700 transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E]"
        >
          {automation.enabled ? "Disable" : "Enable"}
        </button>
        <button
          type="button"
          onClick={deleteAutomation}
          disabled={isPending}
          className="inline-flex h-8 items-center rounded-full border border-red-200 px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#5F3333] dark:text-red-300 dark:hover:bg-[#2D1F1F]"
        >
          Delete
        </button>
        <Link
          href="/dashboard/commits"
          className="inline-flex h-8 items-center rounded-full border border-[rgba(0,0,0,0.08)] px-3 text-xs font-medium text-gray-700 transition hover:bg-[#F3F3F3] dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E]"
        >
          View Commits
        </Link>
      </div>
    </article>
  );
}
