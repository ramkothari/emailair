import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { automations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireSessionUserId } from "@/lib/commits/session";
import { calculateNextRunAt } from "@/lib/automations/schedule";
import { getUserAutomations } from "@/lib/automations/run-automation";
import type {
  AutomationActionJson,
  AutomationConditionJson,
  AutomationScheduleValue,
} from "@/lib/automations/types";

export const runtime = "nodejs";

function nowIso(): string {
  return new Date().toISOString();
}

function getString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = requireSessionUserId(session);
  const items = await getUserAutomations(userId);

  return NextResponse.json({ automations: items });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const userId = requireSessionUserId(session);
    const body = (await request.json()) as {
      name?: unknown;
      description?: unknown;
      enabled?: unknown;
      scheduleValue?: AutomationScheduleValue;
      conditionJson?: AutomationConditionJson;
      actionJson?: AutomationActionJson;
    };
    const name = getString(body.name);

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!body.scheduleValue || !body.conditionJson || !body.actionJson) {
      return NextResponse.json(
        { error: "Schedule, condition, and action are required." },
        { status: 400 }
      );
    }

    const createdAt = nowIso();
    const nextRunAt = calculateNextRunAt(body.scheduleValue).toISOString();
    const id = randomUUID();

    await db.insert(automations).values({
      id,
      userId,
      name,
      description: getString(body.description, "") || null,
      enabled: typeof body.enabled === "boolean" ? body.enabled : true,
      schedule: body.scheduleValue.type,
      configuration: {},
      scheduleType: body.scheduleValue.type,
      scheduleValue: body.scheduleValue,
      conditionJson: body.conditionJson,
      actionJson: body.actionJson,
      lastRunAt: null,
      nextRunAt,
      status: "pending",
      createdAt,
      updatedAt: createdAt,
    });

    const automation = (await getUserAutomations(userId)).find(
      (item) => item.id === id
    );

    return NextResponse.json({ automation });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create automation.",
      },
      { status: 500 }
    );
  }
}
