"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { AutomationRecord } from "@/lib/automations/types";

function formatCondition(conditionJson: AutomationRecord["conditionJson"]): string {
  if (!conditionJson) {
    return "Not configured";
  }

  if ("conditions" in conditionJson) {
    return conditionJson.conditions
      .map((condition) => formatCondition(condition))
      .join(" AND ");
  }

  const field = conditionJson.field.replaceAll("_", " ");

  if (conditionJson.field === "received_between") {
    return `${field}: ${conditionJson.value.from} to ${conditionJson.value.to}`;
  }

  return `${field}: ${String(conditionJson.value)}`;
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
    return `Run once - ${new Date(scheduleValue.runAt).toLocaleString()}`;
  }

  if (scheduleValue.type === "daily") {
    return `Daily - ${scheduleValue.time}`;
  }

  if (scheduleValue.type === "weekly") {
    return `Weekly - day ${scheduleValue.dayOfWeek} - ${scheduleValue.time}`;
  }

  if (scheduleValue.type === "monthly") {
    return `Monthly - day ${scheduleValue.dayOfMonth} - ${scheduleValue.time}`;
  }

  return `Every ${scheduleValue.every} ${scheduleValue.unit}`;
}

export function AutomationCard({
  automation,
}: {
  automation: AutomationRecord;
}) {
  const [isPending, startTransition] = useTransition();

  function runNow() {
    startTransition(async () => {
      const response = await fetch(`/api/automations/${automation.id}/run`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        alert(body?.error ?? "Failed to run automation.");
        return;
      }

      window.location.reload();
    });
  }

  function toggleEnabled() {
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
        alert(body?.error ?? "Failed to update automation.");
        return;
      }

      window.location.reload();
    });
  }

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
          {automation.enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
            If
          </p>
          <p className="mt-1 text-sm text-gray-900 dark:text-[#F5F5F5]">
            {formatCondition(automation.conditionJson)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
            Then
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
          {automation.nextRunAt ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-[#71717A]">
              Next run: {new Date(automation.nextRunAt).toLocaleString()}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runNow}
          disabled={isPending}
          className="inline-flex h-8 items-center rounded-full bg-gray-950 px-3 text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#F5F5F5] dark:text-[#18181B]"
        >
          Run Now
        </button>
        <button
          type="button"
          onClick={toggleEnabled}
          disabled={isPending}
          className="inline-flex h-8 items-center rounded-full border border-[rgba(0,0,0,0.08)] px-3 text-xs font-medium text-gray-700 transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E]"
        >
          {automation.enabled ? "Disable" : "Enable"}
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
