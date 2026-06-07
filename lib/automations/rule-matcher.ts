import { getEmailsMetadataByIds, searchEmailIds } from "@/lib/gmail";
import type {
  AutomationCondition,
  AutomationConditionJson,
  AutomationPreviewResult,
} from "./types";

const DEFAULT_AUTOMATION_MATCH_LIMIT = 100;
const DEFAULT_PREVIEW_SAMPLE_LIMIT = 200;

function quoteGmailValue(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const escaped = trimmed.replace(/"/g, '\\"');

  if (/\s/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}

function normalizeDateToGmailDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) {
    throw new Error("Invalid date condition.");
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

function conditionToGmailQuery(condition: AutomationCondition): string {
  if (condition.field === "sender") {
    return `from:${quoteGmailValue(condition.value)}`;
  }

  if (condition.field === "subject") {
    return `subject:${quoteGmailValue(condition.value)}`;
  }

  if (condition.field === "older_than_days") {
    if (!Number.isInteger(condition.value) || condition.value <= 0) {
      throw new Error("Older Than Days must be a positive integer.");
    }

    return `older_than:${condition.value}d`;
  }

  if (condition.field === "received_between") {
    const from = normalizeDateToGmailDate(condition.value.from);
    const to = normalizeDateToGmailDate(condition.value.to);

    return `after:${from} before:${to}`;
  }

  if (condition.field === "before_date") {
    return `before:${normalizeDateToGmailDate(condition.value)}`;
  }

  if (condition.field === "after_date") {
    return `after:${normalizeDateToGmailDate(condition.value)}`;
  }

  if (condition.field === "unread") {
    return condition.value ? "is:unread" : "-is:unread";
  }

  if (condition.field === "has_attachment") {
    return condition.value ? "has:attachment" : "-has:attachment";
  }

  if (condition.field === "category") {
    return `category:${quoteGmailValue(condition.value)}`;
  }

  if (condition.field === "label") {
    return `label:${quoteGmailValue(condition.value)}`;
  }

  throw new Error("Unsupported automation condition.");
}

export function buildAutomationGmailQuery(
  conditionJson: AutomationConditionJson
): string {
  if ("conditions" in conditionJson) {
    if (conditionJson.operator !== "and") {
      throw new Error("Only AND automation conditions are supported.");
    }

    return conditionJson.conditions
      .map(conditionToGmailQuery)
      .filter(Boolean)
      .join(" ");
  }

  return conditionToGmailQuery(conditionJson);
}

export async function findMatchingEmailIds(input: {
  accessToken: string;
  conditionJson: AutomationConditionJson;
  limit?: number;
}): Promise<string[]> {
  const query = buildAutomationGmailQuery(input.conditionJson);

  if (!query) {
    return [];
  }

  return searchEmailIds(
    input.accessToken,
    query,
    input.limit ?? DEFAULT_AUTOMATION_MATCH_LIMIT
  );
}

function getSenderLabel(sender: string): string {
  const match = sender.match(/<([^>]+)>/);
  const email = (match?.[1] ?? sender).trim().toLowerCase();
  const domain = email.includes("@") ? email.split("@").pop() : null;

  return domain || sender.split("<")[0]?.trim() || "Unknown sender";
}

export async function previewAutomationMatches(input: {
  accessToken: string;
  conditionJson: AutomationConditionJson;
  limit: number;
}): Promise<AutomationPreviewResult> {
  const query = buildAutomationGmailQuery(input.conditionJson);
  const emailIds = await findMatchingEmailIds({
    accessToken: input.accessToken,
    conditionJson: input.conditionJson,
    limit: input.limit,
  });
  const sampleIds = emailIds.slice(0, DEFAULT_PREVIEW_SAMPLE_LIMIT);
  const snapshots = await getEmailsMetadataByIds(input.accessToken, sampleIds);
  const grouped = new Map<string, number>();

  for (const snapshot of snapshots) {
    const label = getSenderLabel(snapshot.sender);
    grouped.set(label, (grouped.get(label) ?? 0) + 1);
  }

  const breakdown = Array.from(grouped.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    query,
    count: emailIds.length,
    capped: emailIds.length >= input.limit,
    limit: input.limit,
    breakdown,
  };
}
