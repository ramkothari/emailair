import { auth } from "@/lib/auth";
import { getAttachment } from "@/lib/gmail";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    messageId: string;
    attachmentId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.accessToken) {
    return Response.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const { messageId, attachmentId } = await context.params;
  const url = new URL(request.url);

  const filename = url.searchParams.get("filename") || "attachment";
  const mimeType =
    url.searchParams.get("mimeType") || "application/octet-stream";

  try {
    const data = await getAttachment(
      session.accessToken,
      messageId,
      attachmentId
    );

    return new Response(data, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          filename
        )}`,
        "Content-Length": String(data.length),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to download attachment";

    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
