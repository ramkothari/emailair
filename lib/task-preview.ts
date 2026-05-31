import {
  analyzeEmails,
  detectRisk,
  summarizeEmails,
} from "@/lib/ai";
import type { EmailMetadata } from "@/types/ai";
import type {
  TaskPreviewDefinition,
  TaskPreviewEmail,
  TaskRunResult,
} from "@/types/task-preview";

type ExecuteTaskSearch<TSearch> = (
  task: TaskPreviewDefinition<TSearch>
) => Promise<TaskPreviewEmail[]>;

function sanitizeEmailMetadata(email: TaskPreviewEmail): TaskPreviewEmail {
  return {
    id: email.id,
    sender: email.sender.slice(0, 160),
    subject: email.subject.slice(0, 240),
    snippet: email.snippet.slice(0, 280),
    date: email.date.slice(0, 80),
  };
}

function toEmailMetadata(emails: TaskPreviewEmail[]): EmailMetadata[] {
  return emails.map((email) => ({
    sender: email.sender,
    subject: email.subject,
    snippet: email.snippet,
    date: email.date,
  }));
}

/**
 * Preview-only task runner.
 *
 * This function intentionally does NOT call archiveEmails(), deleteEmails(),
 * getAttachment(), export helpers, or any Gmail mutation operation.
 *
 * AI analysis is limited to first 50 emails to keep costs predictable.
 * Total match count is shown separately.
 */
export async function runTaskPreview<TSearch>(
  task: TaskPreviewDefinition<TSearch>,
  executeSearch: ExecuteTaskSearch<TSearch>
): Promise<TaskRunResult> {
  const rawEmails = await executeSearch(task);

  const emails = rawEmails.map(sanitizeEmailMetadata);
  const analysisSample = emails.slice(0, 50);
  const metadata = toEmailMetadata(analysisSample);

  const [analysis, risk, summary] = await Promise.all([
    analyzeEmails(metadata),
    detectRisk(metadata),
    summarizeEmails(metadata),
  ]);

  return {
    taskId: task.id,
    title: task.title,
    action: task.action,
    foundCount: emails.length,
    analyzedCount: analysisSample.length,
    emails,
    analysis,
    risk,
    summary,
    ranAt: new Date().toISOString(),
  };
}
