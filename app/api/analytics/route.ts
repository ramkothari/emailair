import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProgressiveEmailAnalytics } from "@/lib/analytics";

const DEFAULT_LIMIT = 1_000;
const MAX_LIMIT = 100_000;
const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 500;

function getNumberParam(
  searchParams: URLSearchParams,
  name: string,
  fallback: number,
  max: number
): number {
  const value = Number(searchParams.get(name));

  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(value), max);
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Gmail access is required." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const limit = getNumberParam(
    url.searchParams,
    "limit",
    DEFAULT_LIMIT,
    MAX_LIMIT
  );
  const batchSize = getNumberParam(
    url.searchParams,
    "batchSize",
    DEFAULT_BATCH_SIZE,
    MAX_BATCH_SIZE
  );

  try {
    const analytics = await getProgressiveEmailAnalytics({
      accessToken: session.accessToken,
      userKey: session.user?.email ?? "unknown-user",
      limit,
      batchSize,
      forceRefresh: url.searchParams.get("refresh") === "1",
    });

    return NextResponse.json({ analytics });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load email analytics.",
      },
      { status: 500 }
    );
  }
}
