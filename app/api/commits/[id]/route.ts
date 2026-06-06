import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCommit } from "@/lib/commits/commit-service";
import { getSessionUserId } from "@/lib/commits/session";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = getSessionUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const commit = await getCommit(userId, id);

  if (!commit) {
    return NextResponse.json({ error: "Commit not found" }, { status: 404 });
  }

  return NextResponse.json({ commit });
}
