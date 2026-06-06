import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recordExecutionCommit } from "@/lib/commits/commit-service";
import { requireSessionUserId } from "@/lib/commits/session";
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
    const userId = requireSessionUserId(session);
    let zip: Uint8Array | null = null;
    let fileName = "email-export.zip";

    await recordExecutionCommit({
      userId,
      accessToken: session.accessToken,
      emailIds: [body.messageId],
      source: "manual",
      actionType: "export",
      title: "Exported Email",
      metadata: {
        initiatedFrom: "export-email-api",
      },
      execute: async () => {
        const email = await getEmailDetails(
          session.accessToken as string,
          body.messageId as string
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

        zip = await buildSingleEmailZip(email, attachments);
        fileName = getSingleExportFileName(email);

        return {
          success: true,
          emailsProcessed: 1,
          emailsSucceeded: 1,
          emailsFailed: 0,
        };
      },
    });

    const exportZip = zip as Uint8Array | null;

    if (!exportZip) {
      throw new Error("Failed to build email export.");
    }

    return new Response(exportZip, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          fileName
        )}`,
        "Content-Length": String(exportZip.length),
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
