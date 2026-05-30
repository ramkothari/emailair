import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAttachment, getEmailDetails } from "@/lib/gmail";
import { buildMultipleEmailsZip } from "@/lib/export";
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
    messageIds?: string[];
  };

  if (!Array.isArray(body.messageIds) || body.messageIds.length === 0) {
    return NextResponse.json(
      { error: "messageIds must be a non-empty array" },
      { status: 400 }
    );
  }

  try {
    const exportItems = await Promise.all(
      body.messageIds.map(async (messageId) => {
        const email = await getEmailDetails(
          session.accessToken as string,
          messageId
        );

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

        return {
          email,
          attachments,
        };
      })
    );

    const zip = await buildMultipleEmailsZip(exportItems);

    return new Response(zip, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          "attachment; filename*=UTF-8''emails-export.zip",
        "Content-Length": String(zip.length),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to export selected emails";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
