import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import type { Email } from "@/types/email";
import type { EmailFilter } from "@/types/filter";

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

  await Promise.all(
    ids.map((id) =>
      gmail.users.messages.trash({
        userId: "me",
        id,
      })
    )
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

  await Promise.all(
    ids.map((id) =>
      gmail.users.messages.modify({
        userId: "me",
        id,
        requestBody: {
          removeLabelIds: ["INBOX"],
        },
      })
    )
  );
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
