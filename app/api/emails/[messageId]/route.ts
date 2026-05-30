import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEmailDetails } from "@/lib/gmail";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    messageId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const { messageId } = await context.params;

  try {
    const email = await getEmailDetails(session.accessToken, messageId);

    return NextResponse.json(email);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load email";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
