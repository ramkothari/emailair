import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { commitItems, commits, executions } from "@/db/schema";
import { getEmailsMetadataByIds } from "@/lib/gmail";
import type {
  Commit,
  CommitAffectedEmail,
  CommitGroup,
  CommitItem,
  ExecutionRecordResult,
  GetCommitsOptions,
  GetCommitsResult,
  RecordExecutionCommitInput,
  RecordExecutionCommitResult,
} from "@/lib/commits/types";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

async function getDb() {
  const { db } = await import("@/db/client");

  return db;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeLimit(limit?: number): number {
  if (!limit || !Number.isInteger(limit) || limit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(limit, MAX_LIMIT);
}

function uniqueSenders(emails: CommitAffectedEmail[]): string[] {
  return Array.from(
    new Set(
      emails
        .map((email) => email.sender.trim())
        .filter((sender) => sender.length > 0)
    )
  );
}

function getExecutionCounts(
  result: ExecutionRecordResult,
  fallbackCount: number
): {
  emailsProcessed: number;
  emailsSucceeded: number;
  emailsFailed: number;
} {
  return {
    emailsProcessed: result.emailsProcessed ?? fallbackCount,
    emailsSucceeded:
      result.emailsSucceeded ?? (result.success ? fallbackCount : 0),
    emailsFailed: result.emailsFailed ?? (result.success ? 0 : fallbackCount),
  };
}

function toCommit(row: typeof commits.$inferSelect, items: CommitItem[]): Commit {
  return {
    id: row.id,
    userId: row.userId,
    executionId: row.executionId,
    source: row.source,
    actionType: row.actionType,
    title: row.title,
    emailCount: row.emailCount,
    status: row.status,
    durationMs: row.durationMs,
    createdAt: row.createdAt,
    automationId: row.automationId,
    metadata: row.metadata ?? {},
    items,
  };
}

async function loadItemsForCommitIds(
  commitIds: string[]
): Promise<Map<string, CommitItem[]>> {
  const itemsByCommit = new Map<string, CommitItem[]>();

  if (commitIds.length === 0) {
    return itemsByCommit;
  }

  const db = await getDb();
  const itemRows = await db
    .select()
    .from(commitItems)
    .where(inArray(commitItems.commitId, commitIds));

  for (const item of itemRows) {
    const existing = itemsByCommit.get(item.commitId) ?? [];

    existing.push({
      id: item.id,
      commitId: item.commitId,
      emailId: item.emailId,
      sender: item.sender,
      subject: item.subject,
    });

    itemsByCommit.set(item.commitId, existing);
  }

  return itemsByCommit;
}

export async function createCommit(input: {
  userId: string;
  executionId: string;
  source: Commit["source"];
  actionType: Commit["actionType"];
  title: string;
  emailCount: number;
  status: Commit["status"];
  durationMs: number;
  automationId?: string | null;
  affectedEmails: CommitAffectedEmail[];
  metadata?: Record<string, unknown>;
}): Promise<Commit> {
  const commitId = randomUUID();
  const createdAt = nowIso();
  const db = await getDb();

  await db.transaction(async (tx) => {
    await tx.insert(commits).values({
      id: commitId,
      userId: input.userId,
      executionId: input.executionId,
      source: input.source,
      actionType: input.actionType,
      title: input.title,
      emailCount: input.emailCount,
      status: input.status,
      durationMs: input.durationMs,
      createdAt,
      automationId: input.automationId ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        affectedSenders: uniqueSenders(input.affectedEmails),
      },
    });

    if (input.affectedEmails.length > 0) {
      await tx.insert(commitItems).values(
        input.affectedEmails.map((email) => ({
          id: randomUUID(),
          commitId,
          emailId: email.emailId,
          sender: email.sender,
          subject: email.subject,
        }))
      );
    }
  });

  const commit = await getCommit(input.userId, commitId);

  if (!commit) {
    throw new Error("Commit was created but could not be loaded.");
  }

  return commit;
}

export async function recordExecutionCommit<
  TExecutionResult extends ExecutionRecordResult,
>(
  input: RecordExecutionCommitInput<TExecutionResult>
): Promise<RecordExecutionCommitResult<TExecutionResult>> {
  const executionId = randomUUID();
  const startedAt = nowIso();
  const startMs = Date.now();

  const affectedEmails = await getEmailsMetadataByIds(
    input.accessToken,
    input.emailIds
  );
  const db = await getDb();

  await db.insert(executions).values({
    id: executionId,
    userId: input.userId,
    automationId: input.automationId ?? null,
    source: input.source,
    status: "running",
    startedAt,
    finishedAt: null,
    durationMs: 0,
    emailsProcessed: input.emailIds.length,
    emailsSucceeded: 0,
    emailsFailed: 0,
    metadata: input.metadata ?? {},
  });

  try {
    const result = await input.execute(executionId);
    const durationMs = Date.now() - startMs;
    const finishedAt = nowIso();
    const counts = getExecutionCounts(result, input.emailIds.length);

    await db
      .update(executions)
      .set({
        status: result.success ? "completed" : "failed",
        finishedAt,
        durationMs,
        emailsProcessed: counts.emailsProcessed,
        emailsSucceeded: counts.emailsSucceeded,
        emailsFailed: counts.emailsFailed,
        metadata: {
          ...(input.metadata ?? {}),
          ...(result.metadata ?? {}),
        },
      })
      .where(eq(executions.id, executionId));

    if (!result.success || counts.emailsSucceeded === 0 || counts.emailsFailed > 0) {
      return {
        executionId,
        commitId: null,
        result,
      };
    }

    const commit = await createCommit({
      userId: input.userId,
      executionId,
      source: input.source,
      actionType: input.actionType,
      title: input.title,
      emailCount: counts.emailsSucceeded,
      status: "completed",
      durationMs,
      automationId: input.automationId ?? null,
      affectedEmails,
      metadata: {
        ...(input.metadata ?? {}),
        ...(result.metadata ?? {}),
      },
    });

    return {
      executionId,
      commitId: commit.id,
      result,
    };
  } catch (error) {
    const durationMs = Date.now() - startMs;

    await db
      .update(executions)
      .set({
        status: "failed",
        finishedAt: nowIso(),
        durationMs,
        emailsProcessed: input.emailIds.length,
        emailsSucceeded: 0,
        emailsFailed: input.emailIds.length,
        metadata: {
          ...(input.metadata ?? {}),
          error: error instanceof Error ? error.message : "Unknown error",
        },
      })
      .where(eq(executions.id, executionId));

    throw error;
  }
}

export async function getCommits(
  userId: string,
  options: GetCommitsOptions = {}
): Promise<GetCommitsResult> {
  const limit = normalizeLimit(options.limit);
  const db = await getDb();
  const whereClause = options.cursor
    ? and(
        eq(commits.userId, userId),
        eq(commits.status, "completed"),
        lt(commits.createdAt, options.cursor)
      )
    : and(eq(commits.userId, userId), eq(commits.status, "completed"));

  const rows = await db
    .select()
    .from(commits)
    .where(whereClause)
    .orderBy(desc(commits.createdAt))
    .limit(limit + 1);

  const visibleRows = rows.slice(0, limit);
  const nextCursor =
    rows.length > limit
      ? visibleRows[visibleRows.length - 1]?.createdAt ?? null
      : null;
  const itemsByCommit = await loadItemsForCommitIds(
    visibleRows.map((commit) => commit.id)
  );

  return {
    commits: visibleRows.map((row) =>
      toCommit(row, itemsByCommit.get(row.id) ?? [])
    ),
    nextCursor,
  };
}

export async function getCommit(
  userId: string,
  commitId: string
): Promise<Commit | null> {
  const db = await getDb();
  const [commit] = await db
    .select()
    .from(commits)
    .where(and(eq(commits.id, commitId), eq(commits.userId, userId)))
    .limit(1);

  if (!commit) {
    return null;
  }

  const itemsByCommit = await loadItemsForCommitIds([commit.id]);

  return toCommit(commit, itemsByCommit.get(commit.id) ?? []);
}

export async function getRecentCommits(
  userId: string,
  limit = 10
): Promise<Commit[]> {
  const result = await getCommits(userId, { limit });
  return result.commits;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);

  yesterday.setDate(today.getDate() - 1);

  if (isSameCalendarDay(date, today)) {
    return "Today";
  }

  if (isSameCalendarDay(date, yesterday)) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function groupByDate(commitsList: Commit[]): CommitGroup[] {
  const groups = new Map<string, Commit[]>();

  for (const commit of commitsList) {
    const label = formatDateLabel(commit.createdAt);
    const existing = groups.get(label) ?? [];

    existing.push(commit);
    groups.set(label, existing);
  }

  return Array.from(groups.entries()).map(([label, groupCommits]) => ({
    label,
    commits: groupCommits,
  }));
}
