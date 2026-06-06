import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recordExecutionCommit } from "@/lib/commits/commit-service";
import { requireSessionUserId } from "@/lib/commits/session";
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
    const userId = requireSessionUserId(session);
    let zip: Uint8Array | null = null;

    await recordExecutionCommit({
      userId,
      accessToken: session.accessToken,
      emailIds: body.messageIds,
      source: "manual",
      actionType: "export",
      title: "Exported Selected Emails",
      metadata: {
        initiatedFrom: "export-selected-api",
      },
      execute: async () => {
        const exportItems = await Promise.all(
          body.messageIds!.map(async (messageId) => {
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

        zip = await buildMultipleEmailsZip(exportItems);

        return {
          success: true,
          emailsProcessed: body.messageIds!.length,
          emailsSucceeded: body.messageIds!.length,
          emailsFailed: 0,
        };
      },
    });

    const exportZip = zip as Uint8Array | null;

    if (!exportZip) {
      throw new Error("Failed to build selected email export.");
    }

    return new Response(exportZip, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          "attachment; filename*=UTF-8''emails-export.zip",
        "Content-Length": String(exportZip.length),
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
