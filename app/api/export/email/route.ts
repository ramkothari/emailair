import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAttachment, getEmailDetails } from "@/lib/gmail";
import { buildSingleEmailZip, getSingleExportFileName } from "@/lib/export";
import type { DownloadedAttachment } from "@/types/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const body = (await request.json()) as {
    messageId?: string;
  };

  if (!body.messageId) {
    return NextResponse.json(
      { error: "messageId is required" },
      { status: 400 }
    );
  }

  try {
    const email = await getEmailDetails(session.accessToken, body.messageId);

    const attachments: DownloadedAttachment[] = await Promise.all(
      email.attachments.map(async (attachment) => {
        const data = await getAttachment(
          session.accessToken as string,
          email.id,
          attachment.attachmentId
        );

        return {
          ...attachment,
          data,
        };
      })
    );

    const zip = await buildSingleEmailZip(email, attachments);
    const fileName = getSingleExportFileName(email);

    return new Response(zip, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          fileName
        )}`,
        "Content-Length": String(zip.length),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to export email";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
