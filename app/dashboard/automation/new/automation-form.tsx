"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type {
  AutomationActionJson,
  AutomationCondition,
  AutomationConditionJson,
  AutomationPreviewResult,
  AutomationRecord,
  AutomationScheduleValue,
} from "@/lib/automations/types";

type EmailType =
  | "newsletters"
  | "social"
  | "receipts"
  | "jobs"
  | "documents"
  | "custom";
type ActionType = Extract<
  AutomationActionJson["type"],
  "archive" | "delete" | "mark_read"
>;
type DateMode = "all" | "range";
type WizardStep = 1 | 2 | 3 | 4 | 5;
type ScheduleType = Extract<
  AutomationScheduleValue["type"],
  "once" | "daily" | "weekly" | "monthly"
>;
type CustomField = AutomationCondition["field"];

const emailTypes: Array<{
  value: EmailType;
  label: string;
  description: string;
  defaultName: string;
  examples: string[];
  condition: AutomationCondition;
}> = [
  {
    value: "newsletters",
    label: "Newsletters & Promotions",
    description: "Daily updates, digest emails, launches, and promotions.",
    defaultName: "Newsletter Cleanup",
    examples: [
      "Product Hunt",
      "Medium",
      "LinkedIn Updates",
      "Quora Digest",
      "Daily Newsletters",
    ],
    condition: { field: "category", operator: "equals", value: "promotions" },
  },
  {
    value: "social",
    label: "Social Updates",
    description: "Notifications and activity updates from social platforms.",
    defaultName: "Social Updates Cleanup",
    examples: ["LinkedIn", "Facebook", "Instagram", "Quora", "X Updates"],
    condition: { field: "category", operator: "equals", value: "social" },
  },
  {
    value: "receipts",
    label: "Receipts & Invoices",
    description: "Payment confirmations, invoices, receipts, and statements.",
    defaultName: "Receipt Organizer",
    examples: ["Stripe", "Amazon", "Uber", "Razorpay", "Payment Receipts"],
    condition: { field: "subject", operator: "contains", value: "receipt" },
  },
  {
    value: "jobs",
    label: "Job Alerts",
    description: "Recruiting messages, job alerts, and hiring updates.",
    defaultName: "Job Alert Cleanup",
    examples: ["LinkedIn Jobs", "Indeed", "Naukri", "AngelList", "Job Alerts"],
    condition: { field: "subject", operator: "contains", value: "job" },
  },
  {
    value: "documents",
    label: "Important Documents",
    description: "Emails with attached documents that should be organized.",
    defaultName: "Document Organizer",
    examples: ["PDFs", "Statements", "Contracts", "Forms", "Attachments"],
    condition: { field: "has_attachment", operator: "is", value: true },
  },
  {
    value: "custom",
    label: "Custom Rule",
    description: "Advanced option for sender, subject, label, or date logic.",
    defaultName: "Custom Automation",
    examples: ["Sender Contains", "Subject Contains", "Label Contains"],
    condition: { field: "sender", operator: "contains", value: "" },
  },
];

const customFields: Array<{ value: CustomField; label: string }> = [
  { value: "sender", label: "Sender Contains" },
  { value: "subject", label: "Subject Contains" },
  { value: "label", label: "Label Contains" },
  { value: "category", label: "Category" },
  { value: "unread", label: "Unread" },
  { value: "has_attachment", label: "Has Attachment" },
  { value: "older_than_days", label: "Older Than Days" },
  { value: "received_between", label: "Date Range" },
];

const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getPreset(value: string | null): EmailType {
  return emailTypes.some((option) => option.value === value)
    ? (value as EmailType)
    : "newsletters";
}

function selectedEmailType(emailType: EmailType) {
  return emailTypes.find((option) => option.value === emailType) ?? emailTypes[0];
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function flattenConditions(
  conditionJson: AutomationConditionJson | null | undefined
): AutomationCondition[] {
  if (!conditionJson) return [];
  return "conditions" in conditionJson ? conditionJson.conditions : [conditionJson];
}

function dateConditionFrom(
  conditionJson: AutomationConditionJson | null | undefined
) {
  return flattenConditions(conditionJson).find(
    (condition) => condition.field === "received_between"
  );
}

function primaryConditionFrom(
  conditionJson: AutomationConditionJson | null | undefined
) {
  return flattenConditions(conditionJson).find(
    (condition) => condition.field !== "received_between"
  );
}

function emailTypeFrom(conditionJson: AutomationConditionJson | null | undefined): EmailType {
  const primary = primaryConditionFrom(conditionJson);

  if (!primary) return "newsletters";
  if (primary.field === "category" && primary.value === "promotions") return "newsletters";
  if (primary.field === "category" && primary.value === "social") return "social";
  if (primary.field === "subject" && /receipt|invoice/i.test(primary.value)) return "receipts";
  if (primary.field === "subject" && /job/i.test(primary.value)) return "jobs";
  if (primary.field === "has_attachment" && primary.value) return "documents";

  return "custom";
}

function actionFrom(actionJson: AutomationActionJson | null | undefined): ActionType {
  if (
    actionJson?.type === "archive" ||
    actionJson?.type === "delete" ||
    actionJson?.type === "mark_read"
  ) {
    return actionJson.type;
  }

  return "archive";
}

function scheduleTypeFrom(
  scheduleValue: AutomationScheduleValue | null | undefined
): ScheduleType {
  if (
    scheduleValue?.type === "once" ||
    scheduleValue?.type === "daily" ||
    scheduleValue?.type === "weekly" ||
    scheduleValue?.type === "monthly"
  ) {
    return scheduleValue.type;
  }

  return "daily";
}

function customFieldFrom(conditionJson: AutomationConditionJson | null | undefined): CustomField {
  const primary = primaryConditionFrom(conditionJson);

  return primary?.field ?? "sender";
}

function customValueFrom(conditionJson: AutomationConditionJson | null | undefined): string {
  const primary = primaryConditionFrom(conditionJson);

  if (!primary) return "";
  if (primary.field === "unread" || primary.field === "has_attachment") return "";

  return String(primary.value);
}

function customBoolFrom(conditionJson: AutomationConditionJson | null | undefined): boolean {
  const primary = primaryConditionFrom(conditionJson);

  if (primary?.field === "unread" || primary?.field === "has_attachment") {
    return primary.value;
  }

  return true;
}

function runDateFrom(scheduleValue: AutomationScheduleValue | null | undefined): string {
  if (scheduleValue?.type !== "once") return todayInputValue();

  return new Date(scheduleValue.runAt).toISOString().slice(0, 10);
}

function timeFrom(scheduleValue: AutomationScheduleValue | null | undefined): string {
  if (!scheduleValue) return "09:00";
  if (scheduleValue.type === "once") {
    return new Date(scheduleValue.runAt).toISOString().slice(11, 16);
  }
  if ("time" in scheduleValue) return scheduleValue.time;

  return "09:00";
}

function buildCustomCondition(input: {
  field: CustomField;
  value: string;
  from: string;
  to: string;
  boolValue: boolean;
}): AutomationCondition {
  if (input.field === "unread") {
    return { field: "unread", operator: "is", value: input.boolValue };
  }

  if (input.field === "has_attachment") {
    return { field: "has_attachment", operator: "is", value: input.boolValue };
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
      value: { from: input.from, to: input.to },
    };
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

function buildCondition(input: {
  emailType: EmailType;
  dateMode: DateMode;
  from: string;
  to: string;
  customField: CustomField;
  customValue: string;
  customBool: boolean;
}): AutomationConditionJson {
  const preset = selectedEmailType(input.emailType);
  const baseCondition =
    input.emailType === "custom"
      ? buildCustomCondition({
          field: input.customField,
          value: input.customValue,
          from: input.from,
          to: input.to,
          boolValue: input.customBool,
        })
      : preset.condition;

  if (input.dateMode === "range" && input.customField !== "received_between") {
    return {
      operator: "and",
      conditions: [
        baseCondition,
        {
          field: "received_between",
          operator: "between",
          value: { from: input.from, to: input.to },
        },
      ],
    };
  }

  return baseCondition;
}

function buildSchedule(input: {
  type: ScheduleType;
  time: string;
  runDate: string;
  dayOfWeek: string;
  dayOfMonth: string;
}): AutomationScheduleValue {
  if (input.type === "once") {
    return {
      type: "once",
      runAt: new Date(`${input.runDate}T${input.time}`).toISOString(),
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

  return {
    type: "monthly",
    dayOfMonth: Number(input.dayOfMonth),
    time: input.time,
    timezone: "UTC",
  };
}

function formatAction(action: ActionType) {
  if (action === "delete") return "Move To Trash";
  if (action === "mark_read") return "Mark as Read";
  return "Archive";
}

function formatDate(value: string) {
  if (!value) return "Not selected";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSchedule(input: {
  type: ScheduleType;
  time: string;
  runDate: string;
  dayOfWeek: string;
  dayOfMonth: string;
}) {
  if (input.type === "once") {
    return `Run once on ${formatDate(input.runDate)} at ${input.time}`;
  }

  if (input.type === "daily") {
    return `Every day at ${input.time}`;
  }

  if (input.type === "weekly") {
    return `Every ${weekDays[Number(input.dayOfWeek)]} at ${input.time}`;
  }

  return `Every month on day ${input.dayOfMonth} at ${input.time}`;
}

function topSenders(preview: AutomationPreviewResult | null) {
  if (!preview || preview.breakdown.length === 0) {
    return [
      { label: "Product Hunt", count: 221 },
      { label: "Medium", count: 184 },
      { label: "LinkedIn", count: 143 },
      { label: "Quora", count: 126 },
    ];
  }

  return preview.breakdown.slice(0, 4);
}

export function AutomationForm({
  automation,
}: {
  automation?: AutomationRecord;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const initialEmailType = automation
    ? emailTypeFrom(automation.conditionJson)
    : getPreset(searchParams.get("preset"));
  const initialDateCondition = automation
    ? dateConditionFrom(automation.conditionJson)
    : null;
  const [step, setStep] = useState<WizardStep>(1);
  const [emailType, setEmailType] = useState<EmailType>(initialEmailType);
  const [name, setName] = useState(
    automation?.name ?? selectedEmailType(initialEmailType).defaultName
  );
  const [action, setAction] = useState<ActionType>(
    actionFrom(automation?.actionJson)
  );
  const [dateMode, setDateMode] = useState<DateMode>(
    initialDateCondition ? "range" : "all"
  );
  const [from, setFrom] = useState(
    initialDateCondition?.field === "received_between"
      ? initialDateCondition.value.from
      : "2024-01-01"
  );
  const [to, setTo] = useState(
    initialDateCondition?.field === "received_between"
      ? initialDateCondition.value.to
      : "2026-01-01"
  );
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    scheduleTypeFrom(automation?.scheduleValue)
  );
  const [time, setTime] = useState(timeFrom(automation?.scheduleValue));
  const [runDate, setRunDate] = useState(runDateFrom(automation?.scheduleValue));
  const [dayOfWeek, setDayOfWeek] = useState(
    automation?.scheduleValue?.type === "weekly"
      ? String(automation.scheduleValue.dayOfWeek)
      : "1"
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    automation?.scheduleValue?.type === "monthly"
      ? String(automation.scheduleValue.dayOfMonth)
      : "1"
  );
  const [customField, setCustomField] = useState<CustomField>(
    customFieldFrom(automation?.conditionJson)
  );
  const [customValue, setCustomValue] = useState(
    customValueFrom(automation?.conditionJson)
  );
  const [customBool, setCustomBool] = useState(
    customBoolFrom(automation?.conditionJson)
  );
  const [preview, setPreview] = useState<AutomationPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedType = selectedEmailType(emailType);
  const conditionJson = useMemo(
    () =>
      buildCondition({
        emailType,
        dateMode,
        from,
        to,
        customField,
        customValue,
        customBool,
      }),
    [customBool, customField, customValue, dateMode, emailType, from, to]
  );
  const scheduleValue = useMemo(
    () =>
      buildSchedule({
        type: scheduleType,
        time,
        runDate,
        dayOfWeek,
        dayOfMonth,
      }),
    [dayOfMonth, dayOfWeek, runDate, scheduleType, time]
  );

  function selectEmailType(nextType: EmailType) {
    setEmailType(nextType);
    setName(selectedEmailType(nextType).defaultName);
    setPreview(null);
  }

  function previewMatches() {
    setError(null);
    startTransition(async () => {
      try {
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
        setStep(5);
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
        const response = await fetch(
          automation
            ? `/api/automations/${automation.id}`
            : "/api/automations",
          {
            method: automation ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: `${selectedType.label} - ${formatAction(action)}`,
            conditionJson,
            actionJson: { type: action } satisfies AutomationActionJson,
            scheduleValue,
            enabled: true,
          }),
          }
        );
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        if (!response.ok) {
          throw new Error(
            body?.error ??
              (automation
                ? "Failed to update automation."
                : "Failed to create automation.")
          );
        }

        router.push("/dashboard/automation");
        router.refresh();
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : automation
              ? "Failed to update automation."
              : "Failed to create automation."
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase text-[#D97706]">
          {automation ? "Edit Automation" : "Create Automation"}
        </p>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-[#F5F5F5]">
          {automation
            ? "Adjust what this automation handles"
            : "Keep your inbox clean automatically"}
        </h1>
      </header>

      <nav className="grid gap-2 sm:grid-cols-5">
        {[
          "What emails?",
          "What happens?",
          "Which dates?",
          "When?",
          "Preview",
        ].map((label, index) => {
          const itemStep = (index + 1) as WizardStep;
          const active = step === itemStep;

          return (
            <button
              key={label}
              type="button"
              onClick={() => setStep(itemStep)}
              className={`h-10 rounded-xl border px-3 text-xs font-medium transition ${
                active
                  ? "border-gray-950 bg-gray-950 text-white dark:border-[#F5F5F5] dark:bg-[#F5F5F5] dark:text-[#18181B]"
                  : "border-[rgba(0,0,0,0.08)] text-gray-600 hover:bg-[#F3F3F3] dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </nav>

      <section className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5 dark:border-[#3F3F46] dark:bg-[#232326]">
        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
                What emails should we handle?
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {emailTypes.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectEmailType(option.value)}
                  className={`min-h-24 rounded-2xl border p-4 text-left transition ${
                    emailType === option.value
                      ? "border-gray-950 bg-gray-50 dark:border-[#F5F5F5] dark:bg-[#2A2A2E]"
                      : "border-[rgba(0,0,0,0.08)] hover:bg-[#F8F8F8] dark:border-[#3F3F46] dark:hover:bg-[#2A2A2E]"
                  }`}
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-sm text-gray-600 dark:text-[#A1A1AA]">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
                {selectedType.label}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-[#A1A1AA]">
                We found examples such as:
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {selectedType.examples.map((example) => (
                <div
                  key={example}
                  className="rounded-xl border border-[rgba(0,0,0,0.08)] px-3 py-2 text-sm text-gray-700 dark:border-[#3F3F46] dark:text-[#D4D4D8]"
                >
                  {example}
                </div>
              ))}
            </div>

            {emailType === "custom" ? (
              <div className="grid gap-4 rounded-2xl bg-[#F8F8F8] p-4 dark:bg-[#2A2A2E] sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                    Advanced field
                  </span>
                  <select
                    value={customField}
                    onChange={(event) =>
                      setCustomField(event.target.value as CustomField)
                    }
                    className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
                  >
                    {customFields.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </label>

                {customField === "unread" ||
                customField === "has_attachment" ? (
                  <label className="block">
                    <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                      Match
                    </span>
                    <select
                      value={customBool ? "true" : "false"}
                      onChange={(event) =>
                        setCustomBool(event.target.value === "true")
                      }
                      className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                ) : customField === "received_between" ? (
                  <>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                        From
                      </span>
                      <input
                        type="date"
                        value={from}
                        onChange={(event) => setFrom(event.target.value)}
                        className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                        To
                      </span>
                      <input
                        type="date"
                        value={to}
                        onChange={(event) => setTo(event.target.value)}
                        className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
                      />
                    </label>
                  </>
                ) : (
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                      Text to match
                    </span>
                    <input
                      type="text"
                      value={customValue}
                      onChange={(event) => setCustomValue(event.target.value)}
                      className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
                    />
                  </label>
                )}
              </div>
            ) : null}

            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
                What should happen?
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  ["archive", "Archive them"],
                  ["delete", "Move them to Trash"],
                  ["mark_read", "Mark as Read"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAction(value as ActionType)}
                    className={`h-12 rounded-xl border px-3 text-sm font-medium transition ${
                      action === value
                        ? "border-gray-950 bg-gray-950 text-white dark:border-[#F5F5F5] dark:bg-[#F5F5F5] dark:text-[#18181B]"
                        : "border-[rgba(0,0,0,0.08)] text-gray-700 hover:bg-[#F3F3F3] dark:border-[#3F3F46] dark:text-[#D4D4D8] dark:hover:bg-[#2A2A2E]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
                Optional Date Filter
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-[#A1A1AA]">
                Choose whether to handle all matching emails or only messages
                received within a date range.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["all", "All matching emails"],
                ["range", "Only emails received between"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDateMode(value as DateMode)}
                  className={`h-12 rounded-xl border px-3 text-left text-sm font-medium transition ${
                    dateMode === value
                      ? "border-gray-950 bg-gray-50 dark:border-[#F5F5F5] dark:bg-[#2A2A2E]"
                      : "border-[rgba(0,0,0,0.08)] hover:bg-[#F8F8F8] dark:border-[#3F3F46] dark:hover:bg-[#2A2A2E]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {dateMode === "range" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                    From
                  </span>
                  <input
                    type="date"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                    To
                  </span>
                  <input
                    type="date"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
                When should this happen?
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ["once", "Run Once"],
                ["daily", "Every Day"],
                ["weekly", "Every Week"],
                ["monthly", "Every Month"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScheduleType(value as ScheduleType)}
                  className={`h-12 rounded-xl border px-3 text-sm font-medium transition ${
                    scheduleType === value
                      ? "border-gray-950 bg-gray-950 text-white dark:border-[#F5F5F5] dark:bg-[#F5F5F5] dark:text-[#18181B]"
                      : "border-[rgba(0,0,0,0.08)] text-gray-700 hover:bg-[#F3F3F3] dark:border-[#3F3F46] dark:text-[#D4D4D8] dark:hover:bg-[#2A2A2E]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {scheduleType === "once" ? (
                <label className="block">
                  <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                    Date
                  </span>
                  <input
                    type="date"
                    value={runDate}
                    onChange={(event) => setRunDate(event.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
                  />
                </label>
              ) : null}

              {scheduleType === "weekly" ? (
                <label className="block">
                  <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                    Day
                  </span>
                  <select
                    value={dayOfWeek}
                    onChange={(event) => setDayOfWeek(event.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
                  >
                    {weekDays.map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {scheduleType === "monthly" ? (
                <label className="block">
                  <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                    Day of month
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(event) => setDayOfMonth(event.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
                  />
                </label>
              ) : null}

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
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
                Preview Automation
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-[#A1A1AA]">
                Review what will happen before saving.
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                Automation Name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] px-3 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] p-4 dark:border-[#3F3F46]">
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
                  Emails Found
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-[#F5F5F5]">
                  {preview
                    ? `${preview.count.toLocaleString()}${preview.capped ? "+" : ""}`
                    : "Not previewed"}
                </p>
              </div>
              <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] p-4 dark:border-[#3F3F46]">
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
                  Action
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
                  {formatAction(action)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] p-4 dark:border-[#3F3F46]">
              <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
                Top Senders
              </p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-[#D4D4D8]">
                {topSenders(preview).map((item) => (
                  <li key={item.label} className="flex justify-between gap-4">
                    <span>{item.label}</span>
                    <span>{item.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] p-4 dark:border-[#3F3F46]">
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
                  Date Range
                </p>
                <p className="mt-1 text-sm text-gray-900 dark:text-[#F5F5F5]">
                  {dateMode === "range"
                    ? `${formatDate(from)} to ${formatDate(to)}`
                    : "All matching emails"}
                </p>
              </div>
              <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] p-4 dark:border-[#3F3F46]">
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-[#71717A]">
                  Schedule
                </p>
                <p className="mt-1 text-sm text-gray-900 dark:text-[#F5F5F5]">
                  {formatSchedule({
                    type: scheduleType,
                    time,
                    runDate,
                    dayOfWeek,
                    dayOfMonth,
                  })}
                </p>
              </div>
            </div>

            {preview?.capped ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-[#5F3333] dark:bg-[#2D1F1F] dark:text-red-300">
                Preview is capped at {preview.limit.toLocaleString()} emails.
                Use a narrower date range before choosing a destructive action.
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-[#5F3333] dark:bg-[#2D1F1F] dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((Math.max(1, step - 1) as WizardStep))}
            disabled={step === 1 || isPending}
            className="inline-flex h-9 items-center rounded-full border border-[rgba(0,0,0,0.08)] px-4 text-xs font-medium text-gray-700 transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E]"
          >
            Back
          </button>
          <div className="flex flex-wrap gap-2">
            {step === 4 ? (
              <button
                type="button"
                onClick={previewMatches}
                disabled={isPending}
                className="inline-flex h-9 items-center rounded-full bg-gray-950 px-4 text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#F5F5F5] dark:text-[#18181B]"
              >
                Preview Automation
              </button>
            ) : null}
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((Math.min(5, step + 1) as WizardStep))}
                disabled={isPending}
                className="inline-flex h-9 items-center rounded-full bg-gray-950 px-4 text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#F5F5F5] dark:text-[#18181B]"
              >
                Continue
              </button>
            ) : null}
            {step === 5 ? (
              <button
                type="button"
                onClick={saveAutomation}
                disabled={isPending}
                className="inline-flex h-9 items-center rounded-full bg-gray-950 px-4 text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#F5F5F5] dark:text-[#18181B]"
              >
                {automation ? "Save Changes" : "Create Automation"}
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
