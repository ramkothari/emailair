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
