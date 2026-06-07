import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireSessionUserId } from "@/lib/commits/session";
import {
  getAutomationById,
  runAutomation,
} from "@/lib/automations/run-automation";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
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
    const automation = await getAutomationById({ automationId, userId });

    if (!automation) {
      return NextResponse.json(
        { error: "Automation not found." },
        { status: 404 }
      );
    }

    const result = await runAutomation({
      automation,
      runMode: "manual",
      accessToken: session.accessToken,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to run automation.",
      },
      { status: 500 }
    );
  }
}
