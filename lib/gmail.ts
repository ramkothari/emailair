import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import type { Email } from "@/types/email";

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
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        });

        const headers = messageResponse.data.payload?.headers;

        return {
          id: message.id,
          sender: getHeader(headers, "From") || "Unknown sender",
          subject: getHeader(headers, "Subject") || "(No subject)",
          date: getHeader(headers, "Date") || "Unknown date",
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
