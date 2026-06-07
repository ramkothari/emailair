"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  AutomationActionJson,
  AutomationCondition,
  AutomationConditionJson,
  AutomationPreviewResult,
  AutomationScheduleValue,
} from "@/lib/automations/types";

type ConditionField = AutomationCondition["field"];
type ScheduleType = AutomationScheduleValue["type"];

const conditionFields: Array<{ value: ConditionField; label: string }> = [
  { value: "sender", label: "Sender Contains" },
  { value: "subject", label: "Subject Contains" },
  { value: "unread", label: "Unread" },
  { value: "has_attachment", label: "Has Attachment" },
  { value: "category", label: "Category" },
  { value: "label", label: "Label Contains" },
  { value: "older_than_days", label: "Older Than Days" },
  { value: "received_between", label: "Received Between" },
  { value: "before_date", label: "Before Date" },
  { value: "after_date", label: "After Date" },
];

function buildCondition(input: {
  field: ConditionField;
  value: string;
  from: string;
  to: string;
  boolValue: boolean;
}): AutomationConditionJson {
  if (input.field === "unread") {
    return { field: "unread", operator: "is", value: input.boolValue };
  }

  if (input.field === "has_attachment") {
    return {
      field: "has_attachment",
      operator: "is",
      value: input.boolValue,
    };
  }

  if (input.field === "older_than_days") {
    return {
      field: "older_than_days",
      operator: "greater_than",
      value: Number(input.value),
    };
  }

  if (input.field === "received_between") {
    return {
      field: "received_between",
      operator: "between",
      value: {
        from: input.from,
        to: input.to,
      },
    };
  }

  if (input.field === "before_date") {
    return { field: "before_date", operator: "before", value: input.value };
  }

  if (input.field === "after_date") {
    return { field: "after_date", operator: "after", value: input.value };
  }

  if (input.field === "category") {
    return { field: "category", operator: "equals", value: input.value };
  }

  if (input.field === "label") {
    return { field: "label", operator: "contains", value: input.value };
  }

  if (input.field === "subject") {
    return { field: "subject", operator: "contains", value: input.value };
  }

  return { field: "sender", operator: "contains", value: input.value };
}

function buildSchedule(input: {
  type: ScheduleType;
  time: string;
  runAt: string;
  dayOfWeek: string;
  dayOfMonth: string;
  intervalEvery: string;
  intervalUnit: "minutes" | "hours" | "days";
}): AutomationScheduleValue {
  if (input.type === "once") {
    return {
      type: "once",
      runAt: new Date(input.runAt).toISOString(),
      timezone: "UTC",
    };
  }

  if (input.type === "daily") {
    return { type: "daily", time: input.time, timezone: "UTC" };
  }

  if (input.type === "weekly") {
    return {
      type: "weekly",
      dayOfWeek: Number(input.dayOfWeek),
      time: input.time,
      timezone: "UTC",
    };
  }

  if (input.type === "monthly") {
    return {
      type: "monthly",
      dayOfMonth: Number(input.dayOfMonth),
      time: input.time,
      timezone: "UTC",
    };
  }

  return {
    type: "interval",
    every: Number(input.intervalEvery),
    unit: input.intervalUnit,
  };
}

export function AutomationForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [conditionField, setConditionField] = useState<ConditionField>("sender");
  const [conditionValue, setConditionValue] = useState("");
  const [conditionFrom, setConditionFrom] = useState("");
  const [conditionTo, setConditionTo] = useState("");
  const [conditionBool, setConditionBool] = useState(true);
  const [action, setAction] = useState<AutomationActionJson["type"]>("archive");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("once");
  const [time, setTime] = useState("09:00");
  const [runAt, setRunAt] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("0");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [intervalEvery, setIntervalEvery] = useState("6");
  const [intervalUnit, setIntervalUnit] =
    useState<"minutes" | "hours" | "days">("hours");
  const [preview, setPreview] = useState<AutomationPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function getPayload() {
    const conditionJson = buildCondition({
      field: conditionField,
      value: conditionValue,
      from: conditionFrom,
      to: conditionTo,
      boolValue: conditionBool,
    });
    const scheduleValue = buildSchedule({
      type: scheduleType,
      time,
      runAt,
      dayOfWeek,
      dayOfMonth,
      intervalEvery,
      intervalUnit,
    });

    return {
      name,
      description,
      conditionJson,
      actionJson: { type: action } satisfies AutomationActionJson,
      scheduleValue,
      enabled: true,
    };
  }

  function previewMatches() {
    setError(null);
    startTransition(async () => {
      try {
        const conditionJson = buildCondition({
          field: conditionField,
          value: conditionValue,
          from: conditionFrom,
          to: conditionTo,
          boolValue: conditionBool,
        });
        const response = await fetch("/api/automations/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conditionJson }),
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

  function saveAutomation() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/automations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(getPayload()),
        });
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        if (!response.ok) {
          throw new Error(body?.error ?? "Failed to save automation.");
        }

        router.push("/dashboard/automation");
        router.refresh();
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Failed to save automation."
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-[#F5F5F5]">
          New Automation
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-[#A1A1AA]">
          Preview matching emails before saving destructive Gmail rules.
        </p>
      </header>

      <section className="space-y-5 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5 dark:border-[#3F3F46] dark:bg-[#232326]">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
              Name
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
              Description
            </span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
              Condition
            </span>
            <select
              value={conditionField}
              onChange={(event) =>
                setConditionField(event.target.value as ConditionField)
              }
              className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
            >
              {conditionFields.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
          </label>

          {conditionField === "received_between" ? (
            <>
              <label className="block">
                <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                  From
                </span>
                <input
                  type="date"
                  value={conditionFrom}
                  onChange={(event) => setConditionFrom(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                  To
                </span>
                <input
                  type="date"
                  value={conditionTo}
                  onChange={(event) => setConditionTo(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
                />
              </label>
            </>
          ) : conditionField === "unread" || conditionField === "has_attachment" ? (
            <label className="block">
              <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                Value
              </span>
              <select
                value={conditionBool ? "true" : "false"}
                onChange={(event) => setConditionBool(event.target.value === "true")}
                className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </label>
          ) : (
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                Value
              </span>
              <input
                type={conditionField.includes("date") ? "date" : "text"}
                value={conditionValue}
                onChange={(event) => setConditionValue(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
              />
            </label>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
              Action
            </span>
            <select
              value={action}
              onChange={(event) =>
                setAction(event.target.value as AutomationActionJson["type"])
              }
              className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
            >
              <option value="archive">Archive</option>
              <option value="delete">Move To Trash</option>
              <option value="export">Export</option>
              <option value="mark_read">Mark Read</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
              Schedule
            </span>
            <select
              value={scheduleType}
              onChange={(event) =>
                setScheduleType(event.target.value as ScheduleType)
              }
              className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
            >
              <option value="once">Run Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="interval">Custom Interval</option>
            </select>
          </label>

          {scheduleType === "once" ? (
            <label className="block">
              <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                Run At
              </span>
              <input
                type="datetime-local"
                value={runAt}
                onChange={(event) => setRunAt(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
              />
            </label>
          ) : scheduleType === "interval" ? (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="1"
                value={intervalEvery}
                onChange={(event) => setIntervalEvery(event.target.value)}
                className="mt-6 h-10 rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
              />
              <select
                value={intervalUnit}
                onChange={(event) =>
                  setIntervalUnit(event.target.value as typeof intervalUnit)
                }
                className="mt-6 h-10 rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          ) : (
            <label className="block">
              <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                Time
              </span>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
              />
            </label>
          )}
        </div>

        {scheduleType === "weekly" ? (
          <input
            type="number"
            min="0"
            max="6"
            value={dayOfWeek}
            onChange={(event) => setDayOfWeek(event.target.value)}
            className="h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
            placeholder="Day of week, Sunday = 0"
          />
        ) : null}

        {scheduleType === "monthly" ? (
          <input
            type="number"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(event) => setDayOfMonth(event.target.value)}
            className="h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
            placeholder="Day of month"
          />
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-[#5F3333] dark:bg-[#2D1F1F] dark:text-red-300">
            {error}
          </p>
        ) : null}

        {preview ? (
          <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#F3F3F3] p-4 dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
            <p className="font-medium text-gray-900 dark:text-[#F5F5F5]">
              Found {preview.count.toLocaleString()}
              {preview.capped ? "+" : ""} matching emails
            </p>
            <p className="mt-1 text-xs text-gray-600 dark:text-[#A1A1AA]">
              Gmail query: {preview.query}
            </p>
            {preview.capped ? (
              <p className="mt-2 text-sm text-red-600 dark:text-red-300">
                Preview is capped at {preview.limit.toLocaleString()}. Narrow
                this rule before using destructive actions.
              </p>
            ) : null}
            {preview.breakdown.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm">
                {preview.breakdown.map((item) => (
                  <li key={item.label} className="flex justify-between">
                    <span>{item.label}</span>
                    <span>{item.count}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={previewMatches}
            disabled={isPending}
            className="inline-flex h-8 items-center rounded-full border border-[rgba(0,0,0,0.08)] px-3 text-xs font-medium text-gray-700 transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E]"
          >
            Preview Matches
          </button>
          <button
            type="button"
            onClick={saveAutomation}
            disabled={isPending}
            className="inline-flex h-8 items-center rounded-full bg-gray-950 px-3 text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#F5F5F5] dark:text-[#18181B]"
          >
            Save Automation
          </button>
        </div>
      </section>
    </div>
  );
}
