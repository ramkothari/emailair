import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { automations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireSessionUserId } from "@/lib/commits/session";
import { calculateNextRunAt } from "@/lib/automations/schedule";
import { getAutomationById } from "@/lib/automations/run-automation";
import type {
  AutomationActionJson,
  AutomationConditionJson,
  AutomationScheduleValue,
} from "@/lib/automations/types";

export const runtime = "nodejs";

function nowIso(): string {
  return new Date().toISOString();
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ automationId: string }>;
  }
) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const userId = requireSessionUserId(session);
    const { automationId } = await context.params;
    const existing = await getAutomationById({ automationId, userId });

    if (!existing) {
      return NextResponse.json(
        { error: "Automation not found." },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      enabled?: boolean;
      scheduleValue?: AutomationScheduleValue;
      conditionJson?: AutomationConditionJson;
      actionJson?: AutomationActionJson;
    };
    const scheduleValue = body.scheduleValue ?? existing.scheduleValue;

    if (!scheduleValue) {
      return NextResponse.json(
        { error: "Schedule is required." },
        { status: 400 }
      );
    }

    await db
      .update(automations)
      .set({
        name: typeof body.name === "string" && body.name.trim()
          ? body.name.trim()
          : existing.name,
        description:
          body.description === undefined
            ? existing.description
            : body.description || null,
        enabled:
          typeof body.enabled === "boolean" ? body.enabled : existing.enabled,
        schedule: scheduleValue.type,
        scheduleType: scheduleValue.type,
        scheduleValue,
        conditionJson: body.conditionJson ?? existing.conditionJson,
        actionJson: body.actionJson ?? existing.actionJson,
        nextRunAt: calculateNextRunAt(scheduleValue).toISOString(),
        updatedAt: nowIso(),
      })
      .where(
        and(
          eq(automations.id, automationId),
          eq(automations.userId, userId)
        )
      );

    return NextResponse.json({
      automation: await getAutomationById({ automationId, userId }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update automation.",
      },
      { status: 500 }
    );
  }
}
