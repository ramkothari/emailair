import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { automationRuns, automations } from "@/db/schema";
import { db } from "@/db/client";
import { executeAction } from "@/lib/executor/executor";
import { calculateNextRunAt } from "./schedule";
import { findMatchingEmailIds } from "./rule-matcher";
import type {
  AutomationActionJson,
  AutomationConditionJson,
  AutomationRecord,
  AutomationScheduleValue,
} from "./types";
import type { ActionType } from "@/lib/executor/types";
import type { CommitActionType } from "@/lib/commits/types";

function nowIso(): string {
  return new Date().toISOString();
}

function getMaxEmailsPerRun(): number {
  const parsed = Number(process.env.AUTOMATION_MAX_EMAILS_PER_RUN ?? 100);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 100;
}

function mapAutomationRow(
  row: typeof automations.$inferSelect
): AutomationRecord {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    scheduleType: row.scheduleType,
    scheduleValue: row.scheduleValue as AutomationScheduleValue | null,
    conditionJson: row.conditionJson as AutomationConditionJson | null,
    actionJson: row.actionJson as AutomationActionJson | null,
    lastRunAt: row.lastRunAt,
    nextRunAt: row.nextRunAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getAutomationById(input: {
  automationId: string;
  userId: string;
}): Promise<AutomationRecord | null> {
  const rows = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.id, input.automationId),
        eq(automations.userId, input.userId)
      )
    )
    .limit(1);

  return rows[0] ? mapAutomationRow(rows[0]) : null;
}

export async function getUserAutomations(
  userId: string
): Promise<AutomationRecord[]> {
  const rows = await db
    .select()
    .from(automations)
    .where(eq(automations.userId, userId))
    .orderBy(desc(automations.createdAt));

  return rows.map(mapAutomationRow);
}

function mapAutomationAction(action: AutomationActionJson): ActionType {
  return action.type;
}

function mapCommitAction(action: AutomationActionJson): CommitActionType {
  return action.type;
}

async function hasRunningRun(automationId: string): Promise<boolean> {
  const rows = await db
    .select({ id: automationRuns.id })
    .from(automationRuns)
    .where(
      and(
        eq(automationRuns.automationId, automationId),
        eq(automationRuns.status, "running")
      )
    )
    .limit(1);

  return rows.length > 0;
}

async function updateScheduleAfterSuccess(
  automation: AutomationRecord
): Promise<void> {
  if (!automation.scheduleValue) {
    return;
  }

  if (automation.scheduleValue.type === "once") {
    await db
      .update(automations)
      .set({
        enabled: false,
        lastRunAt: nowIso(),
        status: "completed",
        updatedAt: nowIso(),
      })
      .where(eq(automations.id, automation.id));
    return;
  }

  await db
    .update(automations)
    .set({
      lastRunAt: nowIso(),
      nextRunAt: calculateNextRunAt(automation.scheduleValue).toISOString(),
      status: "completed",
      updatedAt: nowIso(),
    })
    .where(eq(automations.id, automation.id));
}

export async function runAutomation(input: {
  automation: AutomationRecord;
  runMode: "scheduled" | "manual";
  accessToken?: string;
}): Promise<{
  runId: string;
  executionId: string | null;
  commitId: string | null;
  emailsMatched: number;
  emailsProcessed: number;
}> {
  const { automation } = input;

  if (!automation.conditionJson || !automation.actionJson) {
    throw new Error("Automation is missing condition or action configuration.");
  }

  if (await hasRunningRun(automation.id)) {
    throw new Error("Automation is already running.");
  }

  if (!input.accessToken) {
    throw new Error(
      "No Gmail access token is available for this automation run. Use Run Now from an authenticated session or add token persistence before enabling cron."
    );
  }

  const runId = randomUUID();
  const startedAt = nowIso();

  await db.insert(automationRuns).values({
    id: runId,
    automationId: automation.id,
    startedAt,
    finishedAt: null,
    status: "running",
    emailsMatched: 0,
    emailsProcessed: 0,
    executionId: null,
    commitId: null,
    error: null,
  });

  try {
    const emailIds = await findMatchingEmailIds({
      accessToken: input.accessToken,
      conditionJson: automation.conditionJson,
      limit: getMaxEmailsPerRun(),
    });

    await db
      .update(automationRuns)
      .set({
        emailsMatched: emailIds.length,
      })
      .where(eq(automationRuns.id, runId));

    if (emailIds.length === 0) {
      await db
        .update(automationRuns)
        .set({
          status: "completed",
          finishedAt: nowIso(),
          emailsProcessed: 0,
        })
        .where(eq(automationRuns.id, runId));

      await updateScheduleAfterSuccess(automation);

      return {
        runId,
        executionId: null,
        commitId: null,
        emailsMatched: 0,
        emailsProcessed: 0,
      };
    }

    const action = mapAutomationAction(automation.actionJson);
    const result = await executeAction({
      action,
      emailIds,
      context: {
        accessToken: input.accessToken,
      },
      commit: {
        userId: automation.userId,
        accessToken: input.accessToken,
        title: automation.name,
        source: "automation",
        actionType: mapCommitAction(automation.actionJson),
        automationId: automation.id,
        metadata: {
          initiatedFrom: "automation",
          automationRunId: runId,
          runMode: input.runMode,
        },
      },
    });

    await db
      .update(automationRuns)
      .set({
        status: result.success ? "completed" : "failed",
        finishedAt: nowIso(),
        emailsProcessed: result.succeeded,
        executionId: result.executionId ?? null,
        commitId: result.commitId ?? null,
        error: result.success ? null : `${result.failed} emails failed.`,
      })
      .where(eq(automationRuns.id, runId));

    if (result.success) {
      await updateScheduleAfterSuccess(automation);
    }

    return {
      runId,
      executionId: result.executionId ?? null,
      commitId: result.commitId ?? null,
      emailsMatched: emailIds.length,
      emailsProcessed: result.succeeded,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Automation execution failed.";

    await db
      .update(automationRuns)
      .set({
        status: "failed",
        finishedAt: nowIso(),
        error: message,
      })
      .where(eq(automationRuns.id, runId));

    await db
      .update(automations)
      .set({
        status: "failed",
        updatedAt: nowIso(),
      })
      .where(eq(automations.id, automation.id));

    throw error;
  }
}
