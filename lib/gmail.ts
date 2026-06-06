import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import type { Email } from "@/types/email";
import type { EmailFilter } from "@/types/filter";

const DEFAULT_GMAIL_BULK_BATCH_SIZE = 25;
const DEFAULT_GMAIL_BULK_BATCH_DELAY_MS = 350;
const DEFAULT_GMAIL_METADATA_BATCH_SIZE = 15;
const DEFAULT_GMAIL_METADATA_BATCH_DELAY_MS = 200;
const DEFAULT_GMAIL_DELETE_BATCH_SIZE = 10;
const DEFAULT_GMAIL_DELETE_BATCH_DELAY_MS = 200;
const DEFAULT_GMAIL_RETRY_ATTEMPTS = 3;
const DEFAULT_GMAIL_RETRY_BASE_DELAY_MS = 300;
const DEFAULT_GMAIL_RETRY_MAX_DELAY_MS = 2500;

const TRANSIENT_GMAIL_REASONS = new Set([
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "backendError",
  "internalError",
]);

const TRANSIENT_GMAIL_STATUSES = new Set([429, 500, 502, 503, 504]);

export type GmailMessageSnapshot = {
  emailId: string;
  sender: string;
  subject: string;
};

function getPositiveIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type GmailDiagnostic = {
  operation: string;
  status?: number;
  reason?: string;
  message: string;
  attempt?: number;
  maxAttempts?: number;
  emailCount?: number;
  batchIndex?: number;
};

function getGmailDiagnostic(error: unknown, operation: string): GmailDiagnostic {
  const maybeGoogleError = error as {
    code?: number;
    status?: number;
    message?: string;
    response?: {
      status?: number;
      data?: {
        error?: string | { message?: string; errors?: Array<{ reason?: string; message?: string }> };
        error_description?: string;
        message?: string;
      };
    };
    errors?: Array<{ reason?: string; message?: string }>;
  };
  const responseError = maybeGoogleError.response?.data?.error;
  const nestedError =
    typeof responseError === "object" ? responseError.errors?.[0] : undefined;
  const directError = maybeGoogleError.errors?.[0];
  const reason = nestedError?.reason ?? directError?.reason;
  const message =
    nestedError?.message ??
    directError?.message ??
    (typeof responseError === "string" ? responseError : responseError?.message) ??
    maybeGoogleError.response?.data?.message ??
    maybeGoogleError.response?.data?.error_description ??
    maybeGoogleError.message ??
    "Unknown Gmail API error.";
  const status =
    maybeGoogleError.response?.status ??
    maybeGoogleError.code ??
    maybeGoogleError.status;

  return {
    operation,
    status,
    reason,
    message,
  };
}

function isTransientGmailError(error: unknown): boolean {
  const diagnostic = getGmailDiagnostic(error, "gmail");

  return (
    (typeof diagnostic.status === "number" &&
      TRANSIENT_GMAIL_STATUSES.has(diagnostic.status)) ||
    (typeof diagnostic.reason === "string" &&
      TRANSIENT_GMAIL_REASONS.has(diagnostic.reason))
  );
}

function getRetryDelayMs(attempt: number): number {
  const exponentialDelay = Math.min(
    DEFAULT_GMAIL_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
    DEFAULT_GMAIL_RETRY_MAX_DELAY_MS
  );
  const jitter = Math.floor(Math.random() * DEFAULT_GMAIL_RETRY_BASE_DELAY_MS);

  return exponentialDelay + jitter;
}

function logGmailDiagnostic(diagnostic: GmailDiagnostic): void {
  console.error("[gmail]", diagnostic);
}

async function withGmailRetry<T>(
  operation: string,
  execute: () => Promise<T>,
  context: {
    emailCount?: number;
    batchIndex?: number;
  } = {}
): Promise<T> {
  for (let attempt = 1; attempt <= DEFAULT_GMAIL_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await execute();
    } catch (error) {
      const diagnostic = {
        ...getGmailDiagnostic(error, operation),
        attempt,
        maxAttempts: DEFAULT_GMAIL_RETRY_ATTEMPTS,
        ...context,
      };

      logGmailDiagnostic(diagnostic);

      if (
        attempt >= DEFAULT_GMAIL_RETRY_ATTEMPTS ||
        !isTransientGmailError(error)
      ) {
        throw error;
      }

      await sleep(getRetryDelayMs(attempt));
    }
  }

  throw new Error(`${operation} failed.`);
}

function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }

  return batches;
}

async function processGmailIdsInBatches(
  ids: string[],
  operation: (id: string) => Promise<unknown>,
  options?: {
    operationName?: string;
    batchSize?: number;
    batchDelayMs?: number;
  }
): Promise<void> {
  const batchSize = options?.batchSize ?? getPositiveIntegerEnv(
    "GMAIL_BULK_BATCH_SIZE",
    DEFAULT_GMAIL_BULK_BATCH_SIZE
  );
  const batchDelayMs = options?.batchDelayMs ?? getPositiveIntegerEnv(
    "GMAIL_BULK_BATCH_DELAY_MS",
    DEFAULT_GMAIL_BULK_BATCH_DELAY_MS
  );
  const operationName = options?.operationName ?? "gmail.bulk";
  const batches = createBatches(ids, batchSize);
  const failedIds: string[] = [];
  const startedAt = Date.now();

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const batchStartedAt = Date.now();
    const results = await Promise.allSettled(
      batch.map((id) =>
        withGmailRetry(operationName, () => operation(id), {
          batchIndex: batchIndex + 1,
          emailCount: batch.length,
        })
      )
    );

    results.forEach((result, resultIndex) => {
      if (result.status === "rejected") {
        failedIds.push(batch[resultIndex]);
        logGmailDiagnostic({
          ...getGmailDiagnostic(result.reason, operationName),
          batchIndex: batchIndex + 1,
          emailCount: batch.length,
        });
      }
    });

    console.info("[gmail]", {
      operation: operationName,
      batchIndex: batchIndex + 1,
      totalBatches: batches.length,
      emailCount: batch.length,
      durationMs: Date.now() - batchStartedAt,
      failedCount: results.filter((result) => result.status === "rejected")
        .length,
    });

    if (batchIndex < batches.length - 1) {
      await sleep(batchDelayMs);
    }
  }

  if (failedIds.length > 0) {
    throw new Error(
      `Gmail API failed for ${failedIds.length} of ${ids.length} emails.`
    );
  }

  console.info("[gmail]", {
    operation: operationName,
    emailCount: ids.length,
    batchCount: batches.length,
    durationMs: Date.now() - startedAt,
  });
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  if (!headers) {
    return "";
  }

  const header = headers.find(
    (item) => item.name?.toLowerCase() === name.toLowerCase()
  );

  return header?.value ?? "";
}

function getGmailErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
  ) {
    if (error.code === 401) {
      return "Your Google access token is expired or invalid. Please sign out and connect Gmail again.";
    }

    if (error.code === 403) {
      return "Missing Gmail permissions. Please reconnect and approve Gmail read access.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to fetch Gmail emails.";
}

export async function getRecentEmails(
  accessToken: string,
  limit: number = 20
): Promise<Email[]> {
  try {
    const auth = new google.auth.OAuth2();

    auth.setCredentials({
      access_token: accessToken,
    });

    const gmail = google.gmail({
      version: "v1",
      auth,
    });

    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: limit,
      labelIds: ["INBOX"],
    });

    const messages = listResponse.data.messages ?? [];

    if (messages.length === 0) {
      return [];
    }

    const emails = await Promise.all(
      messages.map(async (message): Promise<Email> => {
        if (!message.id) {
          throw new Error("Gmail message is missing an ID.");
        }

        const messageResponse = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
          format: "full",
        });

        const headers = messageResponse.data.payload?.headers;
        const snippet = messageResponse.data.snippet ?? undefined;

        return {
          id: message.id,
          sender: getHeader(headers, "From") || "Unknown sender",
          subject: getHeader(headers, "Subject") || "(No subject)",
          date: getHeader(headers, "Date") || "Unknown date",
          snippet,
        };
      })
    );

    return emails;
  } catch (error) {
    throw new Error(getGmailErrorMessage(error));
  }
}

export async function getRecentEmailsPage(
  accessToken: string,
  limit: number = 50,
  pageToken?: string
): Promise<{
  emails: Email[];
  nextPageToken?: string;
}> {
  try {
    const auth = new google.auth.OAuth2();

    auth.setCredentials({
      access_token: accessToken,
    });

    const gmail = google.gmail({
      version: "v1",
      auth,
    });

    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: limit,
      labelIds: ["INBOX"],
      pageToken,
    });

    const messages = listResponse.data.messages ?? [];

    if (messages.length === 0) {
      return {
        emails: [],
        nextPageToken: listResponse.data.nextPageToken ?? undefined,
      };
    }

    const emails = await Promise.all(
      messages.map(async (message): Promise<Email> => {
        if (!message.id) {
          throw new Error("Gmail message is missing an ID.");
        }

        const messageResponse = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
          format: "full",
        });

        const headers = messageResponse.data.payload?.headers;
        const snippet = messageResponse.data.snippet ?? undefined;

        return {
          id: message.id,
          sender: getHeader(headers, "From") || "Unknown sender",
          subject: getHeader(headers, "Subject") || "(No subject)",
          date: getHeader(headers, "Date") || "Unknown date",
          snippet,
        };
      })
    );

    return {
      emails,
      nextPageToken: listResponse.data.nextPageToken ?? undefined,
    };
  } catch (error) {
    throw new Error(getGmailErrorMessage(error));
  }
}

export async function deleteEmails(
  accessToken: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) {
    throw new Error("No emails selected.");
  }

  const auth = new google.auth.OAuth2();

  auth.setCredentials({
    access_token: accessToken,
  });

  const gmail = google.gmail({
    version: "v1",
    auth,
  });

  await processGmailIdsInBatches(
    ids,
    (id) =>
      gmail.users.messages.trash({
        userId: "me",
        id,
      }),
    {
      operationName: "gmail.messages.trash",
      batchSize: getPositiveIntegerEnv(
        "GMAIL_DELETE_BATCH_SIZE",
        DEFAULT_GMAIL_DELETE_BATCH_SIZE
      ),
      batchDelayMs: getPositiveIntegerEnv(
        "GMAIL_DELETE_BATCH_DELAY_MS",
        DEFAULT_GMAIL_DELETE_BATCH_DELAY_MS
      ),
    }
  );
}

export async function archiveEmails(
  accessToken: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) {
    throw new Error("No emails selected.");
  }

  const auth = new google.auth.OAuth2();

  auth.setCredentials({
    access_token: accessToken,
  });

  const gmail = google.gmail({
    version: "v1",
    auth,
  });

  const batchSize = getPositiveIntegerEnv(
    "GMAIL_ARCHIVE_BATCH_SIZE",
    DEFAULT_GMAIL_BULK_BATCH_SIZE
  );
  const batchDelayMs = getPositiveIntegerEnv(
    "GMAIL_ARCHIVE_BATCH_DELAY_MS",
    DEFAULT_GMAIL_BULK_BATCH_DELAY_MS
  );
  const batches = createBatches(ids, batchSize);
  const startedAt = Date.now();

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const batchStartedAt = Date.now();

    await withGmailRetry(
      "gmail.messages.batchModify.archive",
      () =>
        gmail.users.messages.batchModify({
          userId: "me",
          requestBody: {
            ids: batch,
            removeLabelIds: ["INBOX"],
          },
        }),
      {
        batchIndex: batchIndex + 1,
        emailCount: batch.length,
      }
    );

    console.info("[gmail]", {
      operation: "gmail.messages.batchModify.archive",
      batchIndex: batchIndex + 1,
      totalBatches: batches.length,
      emailCount: batch.length,
      durationMs: Date.now() - batchStartedAt,
    });

    if (batchIndex < batches.length - 1) {
      await sleep(batchDelayMs);
    }
  }

  console.info("[gmail]", {
    operation: "gmail.messages.batchModify.archive",
    emailCount: ids.length,
    batchCount: batches.length,
    durationMs: Date.now() - startedAt,
  });
}

function formatGmailSearchValue(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const escaped = trimmed.replace(/"/g, '\\"');

  if (/\s/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}

function buildGmailSearchQuery(filter: EmailFilter): string {
  const queryParts: string[] = [];

  if (filter.sender?.trim()) {
    queryParts.push(`from:${formatGmailSearchValue(filter.sender)}`);
  }

  if (filter.subject?.trim()) {
    queryParts.push(`subject:${formatGmailSearchValue(filter.subject)}`);
  }

  if (filter.hasAttachment) {
    queryParts.push("has:attachment");
  }

  if (filter.olderThanDays !== undefined) {
    if (
      !Number.isFinite(filter.olderThanDays) ||
      !Number.isInteger(filter.olderThanDays) ||
      filter.olderThanDays <= 0
    ) {
      throw new Error("Invalid filter: olderThanDays must be a positive number.");
    }

    queryParts.push(`older_than:${filter.olderThanDays}d`);
  }

  if (queryParts.length === 0) {
    throw new Error("Invalid filter: add at least one filter.");
  }

  return queryParts.join(" ");
}

function getGmailHeaderForSearch(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  return (
    headers?.find(
      (header) => header.name?.toLowerCase() === name.toLowerCase()
    )?.value ?? ""
  );
}

function mapGmailMessageToEmail(
  message: gmail_v1.Schema$Message
): Email | null {
  if (!message.id) {
    return null;
  }

  const headers = message.payload?.headers;

  return {
    id: message.id,
    sender: getGmailHeaderForSearch(headers, "From") || "Unknown sender",
    subject: getGmailHeaderForSearch(headers, "Subject") || "(No Subject)",
    date: getGmailHeaderForSearch(headers, "Date") || "Unknown date",
  };
}

export async function searchEmails(
  accessToken: string,
  filter: EmailFilter,
  limit: number = 50
): Promise<{
  totalMatches: number;
  emails: Email[];
}> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const query = buildGmailSearchQuery(filter);

  const auth = new google.auth.OAuth2();
  auth.setCredentials({
    access_token: accessToken,
  });

  const gmail = google.gmail({
    version: "v1",
    auth,
  });

  const listResponse = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: safeLimit,
  });

  const messages = listResponse.data.messages ?? [];
  const totalMatches = listResponse.data.resultSizeEstimate ?? messages.length;

  if (messages.length === 0) {
    return {
      totalMatches,
      emails: [],
    };
  }

  const emailResponses = await Promise.all(
    messages.map((message) =>
      gmail.users.messages.get({
        userId: "me",
        id: message.id as string,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      })
    )
  );

  const emails = emailResponses
    .map((response) => mapGmailMessageToEmail(response.data))
    .filter((email): email is Email => email !== null);

  return {
    totalMatches,
    emails,
  };
}

export function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return google.gmail({ version: "v1", auth });
}

export async function getEmailsMetadataByIds(
  accessToken: string,
  ids: string[]
): Promise<GmailMessageSnapshot[]> {
  const normalizedIds = Array.from(
    new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))
  );

  if (normalizedIds.length === 0) {
    return [];
  }

  const gmail = getGmailClient(accessToken);
  const batchSize = getPositiveIntegerEnv(
    "GMAIL_METADATA_BATCH_SIZE",
    DEFAULT_GMAIL_METADATA_BATCH_SIZE
  );
  const batchDelayMs = getPositiveIntegerEnv(
    "GMAIL_METADATA_BATCH_DELAY_MS",
    DEFAULT_GMAIL_METADATA_BATCH_DELAY_MS
  );
  const batches = createBatches(normalizedIds, batchSize);
  const snapshots: GmailMessageSnapshot[] = [];
  const startedAt = Date.now();

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const batchStartedAt = Date.now();
    const settledMessages = await Promise.allSettled(
      batch.map(async (id): Promise<GmailMessageSnapshot> => {
        const response = await withGmailRetry(
          "gmail.messages.get.metadataSnapshot",
          () =>
            gmail.users.messages.get({
              userId: "me",
              id,
              format: "metadata",
              metadataHeaders: ["From", "Subject"],
            }),
          {
            batchIndex: batchIndex + 1,
            emailCount: batch.length,
          }
        );

        const headers = response.data.payload?.headers;

        return {
          emailId: response.data.id ?? id,
          sender: getHeader(headers, "From") || "Unknown sender",
          subject: getHeader(headers, "Subject") || "(No subject)",
        };
      })
    );

    for (const result of settledMessages) {
      if (result.status === "fulfilled") {
        snapshots.push(result.value);
      } else {
        logGmailDiagnostic({
          ...getGmailDiagnostic(
            result.reason,
            "gmail.messages.get.metadataSnapshot"
          ),
          batchIndex: batchIndex + 1,
          emailCount: batch.length,
        });
      }
    }

    console.info("[gmail]", {
      operation: "gmail.messages.get.metadataSnapshot",
      batchIndex: batchIndex + 1,
      totalBatches: batches.length,
      emailCount: batch.length,
      durationMs: Date.now() - batchStartedAt,
      failedCount: settledMessages.filter(
        (result) => result.status === "rejected"
      ).length,
    });

    if (batchIndex < batches.length - 1) {
      await sleep(batchDelayMs);
    }
  }

  console.info("[gmail]", {
    operation: "gmail.messages.get.metadataSnapshot",
    emailCount: normalizedIds.length,
    batchCount: batches.length,
    durationMs: Date.now() - startedAt,
    snapshotCount: snapshots.length,
  });

  return snapshots;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  return Buffer.from(padded, "base64").toString("utf-8");
}

function decodeBase64UrlToBuffer(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  return Buffer.from(padded, "base64");
}

function htmlToReadableText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collectEmailParts(
  part: gmail_v1.Schema$MessagePart,
  result: {
    plainBodies: string[];
    htmlBodies: string[];
    attachments: Array<{
      attachmentId: string;
      filename: string;
      mimeType: string;
      size: number;
    }>;
  }
): void {
  const mimeType = part.mimeType || "";
  const filename = part.filename || "";
  const body = part.body;

  if (filename && body?.attachmentId) {
    result.attachments.push({
      attachmentId: body.attachmentId,
      filename,
      mimeType,
      size: Number(body.size || 0),
    });
  }

  if (body?.data && mimeType === "text/plain") {
    result.plainBodies.push(decodeBase64Url(body.data));
  }

  if (body?.data && mimeType === "text/html") {
    result.htmlBodies.push(decodeBase64Url(body.data));
  }

  for (const childPart of part.parts || []) {
    collectEmailParts(childPart, result);
  }
}

export async function getEmailDetails(
  accessToken: string,
  messageId: string
) {
  const gmail = getGmailClient(accessToken);

  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const message = response.data;
  const payload = message.payload;

  if (!payload) {
    throw new Error("Email payload not found");
  }

  const headers = payload.headers;

  const collected = {
    plainBodies: [] as string[],
    htmlBodies: [] as string[],
    attachments: [] as Array<{
      attachmentId: string;
      filename: string;
      mimeType: string;
      size: number;
    }>,
  };

  collectEmailParts(payload, collected);

  const plainBody = collected.plainBodies.join("\n\n").trim();
  const htmlBody = collected.htmlBodies.join("\n\n").trim();

  const body =
    plainBody ||
    (htmlBody ? htmlToReadableText(htmlBody) : message.snippet || "");

  return {
    id: message.id || messageId,
    sender: getHeader(headers, "From") || "Unknown sender",
    recipient: getHeader(headers, "To") || "Unknown recipient",
    subject: getHeader(headers, "Subject") || "(No Subject)",
    date: getHeader(headers, "Date") || "",
    body,
    attachments: collected.attachments,
  };
}

export async function getAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const gmail = getGmailClient(accessToken);

  const response = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  });

  if (!response.data.data) {
    return Buffer.alloc(0);
  }

  return decodeBase64UrlToBuffer(response.data.data);
}
