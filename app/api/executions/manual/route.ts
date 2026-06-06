import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recordExecutionCommit } from "@/lib/commits/commit-service";
import { requireSessionUserId } from "@/lib/commits/session";
import { executeAction } from "@/lib/executor/executor";
import { getAttachment, getEmailDetails } from "@/lib/gmail";
import { buildMultipleEmailsZip } from "@/lib/export";
import type { ExecutionLifecycleEvent } from "@/lib/executor/events";
import type { ActionType, ExecutorProgress } from "@/lib/executor/types";
import type { DownloadedAttachment } from "@/types/email";

export const runtime = "nodejs";

const MAX_ACTION_EMAILS: Record<ManualExecutionAction, number> = {
  archive: 100,
  delete: 100,
  export: 50,
};

type ManualExecutionAction = "archive" | "delete" | "export";

type ManualExecutionRequest = {
  action?: ManualExecutionAction;
  emailIds?: string[];
};

function normalizeEmailIds(emailIds: unknown): string[] {
  if (!Array.isArray(emailIds)) {
    return [];
  }

  return Array.from(
    new Set(
      emailIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Execution failed.";
}

function getCommitTitle(action: ManualExecutionAction): string {
  if (action === "archive") {
    return "Archived Inbox Emails";
  }

  if (action === "delete") {
    return "Deleted Inbox Emails";
  }

  return "Exported Selected Emails";
}

function calculateEtaSeconds(input: {
  startedAt: number;
  processed: number;
  total: number;
}): number | null {
  if (input.processed <= 0) {
    return null;
  }

  const elapsedSeconds = (Date.now() - input.startedAt) / 1000;
  const secondsPerEmail = elapsedSeconds / input.processed;
  const remaining = Math.max(input.total - input.processed, 0);

  return Number((secondsPerEmail * remaining).toFixed(1));
}

function createEvent(input: {
  type: ExecutionLifecycleEvent["type"];
  executionId: string | null;
  action: ManualExecutionAction;
  total: number;
  processed: number;
  failed: number;
  startedAt: number;
  affectedIds?: string[];
  commitId?: string | null;
  error?: string;
  fileName?: string;
  fileBase64?: string;
}): ExecutionLifecycleEvent {
  const durationMs = Date.now() - input.startedAt;
  const percentage =
    input.total > 0
      ? Math.min(100, Math.round((input.processed / input.total) * 100))
      : 100;
  const base = {
    executionId: input.executionId,
    action: input.action as ActionType,
    total: input.total,
    processed: input.processed,
    failed: input.failed,
    percentage,
    durationMs,
    etaSeconds: calculateEtaSeconds({
      startedAt: input.startedAt,
      processed: input.processed,
      total: input.total,
    }),
  };

  if (input.type === "completed") {
    return {
      ...base,
      type: "completed",
      executionId: input.executionId ?? "",
      affectedIds: input.affectedIds ?? [],
      commitId: input.commitId ?? null,
      fileName: input.fileName,
      fileBase64: input.fileBase64,
    };
  }

  if (input.type === "failed") {
    return {
      ...base,
      type: "failed",
      affectedIds: input.affectedIds ?? [],
      error: input.error ?? "Execution failed.",
    };
  }

  return {
    ...base,
    type: input.type,
    executionId: input.executionId ?? "",
  };
}

function streamEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: ExecutionLifecycleEvent
): void {
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
}

async function buildExportZipWithProgress(input: {
  accessToken: string;
  emailIds: string[];
  onProgress: (processed: number) => void;
}): Promise<Buffer> {
  const exportItems = [];

  for (let index = 0; index < input.emailIds.length; index += 1) {
    const messageId = input.emailIds[index];
    const email = await getEmailDetails(input.accessToken, messageId);

    const attachments: DownloadedAttachment[] = await Promise.all(
      email.attachments.map(async (attachment) => {
        const data = await getAttachment(
          input.accessToken,
          email.id,
          attachment.attachmentId
        );

        return {
          ...attachment,
          data,
        };
      })
    );

    exportItems.push({
      email,
      attachments,
    });
    input.onProgress(index + 1);
  }

  return buildMultipleEmailsZip(exportItems);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as ManualExecutionRequest;
  const action = body.action;
  const emailIds = normalizeEmailIds(body.emailIds);

  if (action !== "archive" && action !== "delete" && action !== "export") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  if (emailIds.length === 0) {
    return NextResponse.json(
      { error: "emailIds must be a non-empty array." },
      { status: 400 }
    );
  }

  if (emailIds.length > MAX_ACTION_EMAILS[action]) {
    return NextResponse.json(
      { error: `Cannot ${action} more than ${MAX_ACTION_EMAILS[action]} emails.` },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const startedAt = Date.now();
      let executionId: string | null = null;
      let processed = 0;
      let failed = 0;
      let affectedIds: string[] = [];

      try {
        const userId = requireSessionUserId(session);

        if (action === "archive" || action === "delete") {
          const result = await executeAction(
            {
              action,
              emailIds,
              context: {
                accessToken: session.accessToken as string,
              },
              commit: {
                userId,
                accessToken: session.accessToken as string,
                title: getCommitTitle(action),
                source: "manual",
                actionType: action,
                metadata: {
                  initiatedFrom: "manual-execution-api",
                },
                onExecutionStarted: (nextExecutionId) => {
                  executionId = nextExecutionId;
                  streamEvent(
                    controller,
                    encoder,
                    createEvent({
                      type: "started",
                      executionId,
                      action,
                      total: emailIds.length,
                      processed: 0,
                      failed: 0,
                      startedAt,
                    })
                  );
                },
              },
            },
            {
              onProgress: (progress: ExecutorProgress) => {
                processed = progress.processedEmails;
                failed = progress.failed;
                affectedIds = emailIds.filter(
                  (id) => !progress.failedIds.includes(id)
                );
                streamEvent(
                  controller,
                  encoder,
                  createEvent({
                    type: "progress",
                    executionId,
                    action,
                    total: emailIds.length,
                    processed,
                    failed,
                    startedAt,
                  })
                );
              },
            }
          );

          processed = result.total;
          failed = result.failed;
          affectedIds = emailIds.filter((id) => !result.failedIds.includes(id));

          if (!result.success) {
            streamEvent(
              controller,
              encoder,
              createEvent({
                type: "failed",
                executionId,
                action,
                total: emailIds.length,
                processed,
                failed,
                startedAt,
                affectedIds,
                error: `${failed} email${failed === 1 ? "" : "s"} failed.`,
              })
            );
            return;
          }

          streamEvent(
            controller,
            encoder,
            createEvent({
              type: "completed",
              executionId,
              action,
              total: emailIds.length,
              processed,
              failed,
              startedAt,
              affectedIds,
              commitId: null,
            })
          );
          return;
        }

        let zip: Buffer | null = null;

        const recorded = await recordExecutionCommit({
          userId,
          accessToken: session.accessToken as string,
          emailIds,
          source: "manual",
          actionType: "export",
          title: getCommitTitle("export"),
          metadata: {
            initiatedFrom: "manual-execution-api",
            action: "export",
          },
          onExecutionStarted: (nextExecutionId) => {
            executionId = nextExecutionId;
            streamEvent(
              controller,
              encoder,
              createEvent({
                type: "started",
                executionId,
                action,
                total: emailIds.length,
                processed: 0,
                failed: 0,
                startedAt,
              })
            );
          },
          execute: async () => {
            zip = await buildExportZipWithProgress({
              accessToken: session.accessToken as string,
              emailIds,
              onProgress: (nextProcessed) => {
                processed = nextProcessed;
                streamEvent(
                  controller,
                  encoder,
                  createEvent({
                    type: "progress",
                    executionId,
                    action,
                    total: emailIds.length,
                    processed,
                    failed: 0,
                    startedAt,
                  })
                );
              },
            });

            return {
              success: true,
              emailsProcessed: emailIds.length,
              emailsSucceeded: emailIds.length,
              emailsFailed: 0,
            };
          },
        });

        const exportZip = zip as Buffer | null;

        if (!exportZip) {
          throw new Error("Failed to build selected email export.");
        }

        streamEvent(
          controller,
          encoder,
          createEvent({
            type: "completed",
            executionId,
            action,
            total: emailIds.length,
            processed: emailIds.length,
            failed: 0,
            startedAt,
            affectedIds: emailIds,
            commitId: recorded.commitId,
            fileName: "emails-export.zip",
            fileBase64: exportZip.toString("base64"),
          })
        );
      } catch (error) {
        streamEvent(
          controller,
          encoder,
          createEvent({
            type: "failed",
            executionId,
            action,
            total: emailIds.length,
            processed,
            failed: failed || Math.max(emailIds.length - affectedIds.length, 0),
            startedAt,
            affectedIds,
            error: getErrorMessage(error),
          })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
