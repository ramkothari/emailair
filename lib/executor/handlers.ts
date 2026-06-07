import { archiveEmails, deleteEmails, markEmailsRead } from "@/lib/gmail";
import type {
  ActionType,
  BatchActionHandler,
  BatchExecutionResult,
  ExecuteActionContext,
} from "./types";

function allSucceeded(emailIds: string[]): BatchExecutionResult {
  return {
    succeededIds: [...emailIds],
    failedIds: [],
  };
}

function getAccessToken(context?: ExecuteActionContext): string {
  if (!context?.accessToken) {
    throw new Error("Missing access token for executor action.");
  }

  return context.accessToken;
}

const archiveHandler: BatchActionHandler = async ({ emailIds, context }) => {
  const accessToken = getAccessToken(context);

  await archiveEmails(accessToken, emailIds);

  return allSucceeded(emailIds);
};

const deleteHandler: BatchActionHandler = async ({ emailIds, context }) => {
  const accessToken = getAccessToken(context);

  await deleteEmails(accessToken, emailIds);

  return allSucceeded(emailIds);
};

const downloadHandler: BatchActionHandler = async ({ emailIds }) => {
  throw new Error(
    `Download execution is deferred for ${emailIds.length} emails until a file-returning strategy exists.`
  );
};

const markReadHandler: BatchActionHandler = async ({ emailIds, context }) => {
  const accessToken = getAccessToken(context);

  await markEmailsRead(accessToken, emailIds);

  return allSucceeded(emailIds);
};

export const executorHandlers: Record<ActionType, BatchActionHandler> = {
  archive: archiveHandler,
  delete: deleteHandler,
  download: downloadHandler,
  export: downloadHandler,
  mark_read: markReadHandler,
};
