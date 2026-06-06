import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCommits } from "@/lib/commits/commit-service";
import { getSessionUserId } from "@/lib/commits/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  const userId = getSessionUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = limitParam ? Number(limitParam) : undefined;
  const result = await getCommits(userId, { limit, cursor });

  return NextResponse.json(result);
}
