import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { previewAutomationMatches } from "@/lib/automations/rule-matcher";
import type { AutomationConditionJson } from "@/lib/automations/types";

export const runtime = "nodejs";

function getPreviewLimit(): number {
  const parsed = Number(process.env.AUTOMATION_PREVIEW_LIMIT ?? 1000);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1000;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      conditionJson?: AutomationConditionJson;
    };

    if (!body.conditionJson) {
      return NextResponse.json(
        { error: "conditionJson is required." },
        { status: 400 }
      );
    }

    const preview = await previewAutomationMatches({
      accessToken: session.accessToken,
      conditionJson: body.conditionJson,
      limit: getPreviewLimit(),
    });

    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to preview automation.",
      },
      { status: 500 }
    );
  }
}
