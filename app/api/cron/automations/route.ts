import { and, asc, eq, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { automations } from "@/db/schema";
import { runAutomation } from "@/lib/automations/run-automation";
import { getValidGoogleAccessToken } from "@/lib/google/credentials";
import type {
  AutomationActionJson,
  AutomationConditionJson,
  AutomationRecord,
  AutomationScheduleValue,
} from "@/lib/automations/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getMaxRunsPerTick(): number {
  const parsed = Number(process.env.AUTOMATION_MAX_RUNS_PER_TICK ?? 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 10;
}

function assertCronAuthorized(request: Request): void {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new Error("CRON_SECRET is not configured.");
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new Error("Unauthorized cron request.");
  }
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

async function handleCronRequest(request: Request) {
  try {
    assertCronAuthorized(request);

    const dueRows = await db
      .select()
      .from(automations)
      .where(
        and(
          eq(automations.enabled, true),
          lte(automations.nextRunAt, new Date().toISOString())
        )
      )
      .orderBy(asc(automations.nextRunAt))
      .limit(getMaxRunsPerTick());

    const results = [];

    for (const row of dueRows) {
      const automation = mapAutomationRow(row);

      try {
        const result = await runAutomation({
          automation,
          runMode: "scheduled",
          resolveAccessToken: () => getValidGoogleAccessToken(automation.userId),
        });

        results.push({
          automationId: automation.id,
          status: "completed",
          result,
        });
      } catch (error) {
        results.push({
          automationId: automation.id,
          status: "failed",
          error:
            error instanceof Error
              ? error.message
              : "Automation execution failed.",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Automation scheduler failed.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleCronRequest(request);
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}
