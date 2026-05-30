import { cache } from "react";
import type { gmail_v1 } from "googleapis";
import { getGmailClient } from "@/lib/gmail";
import type {
  AttachmentStats,
  CleanupCandidate,
  EmailAnalytics,
  OverviewStats,
  SenderStat,
} from "@/types/analytics";

const MAX_ANALYTICS_EMAILS = 200;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type AttachmentInfo = {
  count: number;
  largestSize: number;
};

type AnalyticsEmail = {
  id: string;
  sender: string;
  senderName: string;
  subject: string;
  date: string;
  timestamp: number;
  labelIds: string[];
  hasAttachments: boolean;
  attachmentCount: number;
  largestAttachmentSize: number;
};

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

function parseSenderName(sender: string): string {
  const trimmed = sender.trim();

  if (!trimmed) {
    return "Unknown sender";
  }

  const nameWithEmailMatch = trimmed.match(/^"?([^"<]+?)"?\s*<[^>]+>$/);

  if (nameWithEmailMatch?.[1]) {
    return cleanSenderName(nameWithEmailMatch[1]);
  }

  const emailMatch = trimmed.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  if (emailMatch?.[0]) {
    return emailMatch[0].toLowerCase();
  }

  return cleanSenderName(trimmed);
}

function cleanSenderName(value: string): string {
  return value
    .replace(/^"+|"+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getMessageTimestamp(message: gmail_v1.Schema$Message): number {
  if (message.internalDate) {
    const internalDate = Number(message.internalDate);

    if (Number.isFinite(internalDate)) {
      return internalDate;
    }
  }

  const dateHeader = getHeader(message.payload?.headers, "Date");
  const parsedDate = Date.parse(dateHeader);

  if (Number.isFinite(parsedDate)) {
    return parsedDate;
  }

  return Date.now();
}

function extractAttachmentInfo(
  part: gmail_v1.Schema$MessagePart | undefined
): AttachmentInfo {
  if (!part) {
    return {
      count: 0,
      largestSize: 0,
    };
  }

  let count = 0;
  let largestSize = 0;

  const filename = part.filename?.trim();
  const bodySize = part.body?.size ?? 0;
  const hasAttachmentId = Boolean(part.body?.attachmentId);

  if (filename && (hasAttachmentId || bodySize > 0)) {
    count += 1;
    largestSize = Math.max(largestSize, bodySize);
  }

  for (const childPart of part.parts ?? []) {
    const childInfo = extractAttachmentInfo(childPart);

    count += childInfo.count;
    largestSize = Math.max(largestSize, childInfo.largestSize);
  }

  return {
    count,
    largestSize,
  };
}

function isOlderThan(timestamp: number, days: number): boolean {
  return Date.now() - timestamp > days * ONE_DAY_MS;
}

function isPromotionalEmail(email: AnalyticsEmail): boolean {
  const searchableText = `${email.sender} ${email.senderName} ${email.subject}`
    .toLowerCase()
    .trim();

  return (
    email.labelIds.includes("CATEGORY_PROMOTIONS") ||
    searchableText.includes("promotion") ||
    searchableText.includes("promotional") ||
    searchableText.includes("newsletter") ||
    searchableText.includes("sale") ||
    searchableText.includes("discount") ||
    searchableText.includes("offer") ||
    searchableText.includes("deal")
  );
}

function isLinkedInEmail(email: AnalyticsEmail): boolean {
  const searchableText = `${email.sender} ${email.senderName}`.toLowerCase();

  return searchableText.includes("linkedin");
}

function getGmailErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
  ) {
    if (error.code === 401) {
      return "Gmail access token is invalid or expired. Please reconnect Gmail.";
    }

    if (error.code === 403) {
      return "Gmail read permission is missing. Please reconnect Gmail and approve Gmail access.";
    }

    if (error.code === 429) {
      return "Gmail rate limit reached. Please try again shortly.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to load email analytics.";
}

async function fetchLatestAnalyticsEmails(
  accessToken: string,
  limit: number
): Promise<AnalyticsEmail[]> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_ANALYTICS_EMAILS);
  const gmail = getGmailClient(accessToken);

  const messageRefs: gmail_v1.Schema$Message[] = [];
  let pageToken: string | undefined;

  while (messageRefs.length < safeLimit) {
    const remaining = safeLimit - messageRefs.length;

    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: Math.min(500, remaining),
      pageToken,
      labelIds: ["INBOX"],
    });

    messageRefs.push(...(listResponse.data.messages ?? []));

    pageToken = listResponse.data.nextPageToken ?? undefined;

    if (!pageToken) {
      break;
    }
  }

  if (messageRefs.length === 0) {
    return [];
  }

  const settledMessages = await Promise.allSettled(
    messageRefs.map(async (messageRef): Promise<AnalyticsEmail> => {
      if (!messageRef.id) {
        throw new Error("Gmail message is missing an ID.");
      }

      const messageResponse = await gmail.users.messages.get({
        userId: "me",
        id: messageRef.id,
        format: "full",
        metadataHeaders: ["From", "Subject", "Date"],
      });

      const message = messageResponse.data;
      const headers = message.payload?.headers;

      const sender = getHeader(headers, "From") || "Unknown sender";
      const subject = getHeader(headers, "Subject") || "(No subject)";
      const date = getHeader(headers, "Date") || "";
      const timestamp = getMessageTimestamp(message);
      const labelIds = message.labelIds ?? [];
      const attachmentInfo = extractAttachmentInfo(message.payload);

      return {
        id: messageRef.id,
        sender,
        senderName: parseSenderName(sender),
        subject,
        date,
        timestamp,
        labelIds,
        hasAttachments: attachmentInfo.count > 0,
        attachmentCount: attachmentInfo.count,
        largestAttachmentSize: attachmentInfo.largestSize,
      };
    })
  );

  return settledMessages
    .filter(
      (result): result is PromiseFulfilledResult<AnalyticsEmail> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value);
}

export function getOverviewStats(emails: AnalyticsEmail[]): OverviewStats {
  return {
    totalEmails: emails.length,
    unreadEmails: emails.filter((email) => email.labelIds.includes("UNREAD"))
      .length,
    emailsWithAttachments: emails.filter((email) => email.hasAttachments)
      .length,
    emailsOlderThanOneYear: emails.filter((email) =>
      isOlderThan(email.timestamp, 365)
    ).length,
  };
}

export function getTopSenders(
  emails: AnalyticsEmail[],
  limit: number = 10
): SenderStat[] {
  const senderCounts = new Map<string, number>();

  for (const email of emails) {
    senderCounts.set(
      email.senderName,
      (senderCounts.get(email.senderName) ?? 0) + 1
    );
  }

  return Array.from(senderCounts.entries())
    .map(([sender, count]) => ({
      sender,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getAttachmentStats(
  emails: AnalyticsEmail[]
): AttachmentStats {
  return {
    emailsWithAttachments: emails.filter((email) => email.hasAttachments)
      .length,
    totalAttachments: emails.reduce(
      (total, email) => total + email.attachmentCount,
      0
    ),
    largestAttachmentSize: emails.reduce(
      (largest, email) => Math.max(largest, email.largestAttachmentSize),
      0
    ),
  };
}

export function getCleanupCandidates(
  emails: AnalyticsEmail[]
): CleanupCandidate[] {
  const linkedInOlderThan90Days = emails.filter(
    (email) => isLinkedInEmail(email) && isOlderThan(email.timestamp, 90)
  ).length;

  const promotionsOlderThan180Days = emails.filter(
    (email) => isPromotionalEmail(email) && isOlderThan(email.timestamp, 180)
  ).length;

  const unreadOlderThanTwoYears = emails.filter(
    (email) =>
      email.labelIds.includes("UNREAD") && isOlderThan(email.timestamp, 730)
  ).length;

  const largeAttachmentEmails = emails.filter(
    (email) => email.largestAttachmentSize >= 10 * 1024 * 1024
  ).length;

  const candidates: CleanupCandidate[] = [];

  if (linkedInOlderThan90Days > 0) {
    candidates.push({
      title: "LinkedIn Emails",
      count: linkedInOlderThan90Days,
      recommendation: "Archive Candidate",
    });
  }

  if (promotionsOlderThan180Days > 0) {
    candidates.push({
      title: "Promotions > 180 Days",
      count: promotionsOlderThan180Days,
      recommendation: "Delete Candidate",
    });
  }

  if (unreadOlderThanTwoYears > 0) {
    candidates.push({
      title: "Unread Emails > 2 Years",
      count: unreadOlderThanTwoYears,
      recommendation: "Review Candidate",
    });
  }

  if (largeAttachmentEmails > 0) {
    candidates.push({
      title: "Large Attachment Emails",
      count: largeAttachmentEmails,
      recommendation: "Review Candidate",
    });
  }

  return candidates;
}

export const getEmailAnalytics = cache(
  async (
    accessToken: string,
    limit: number = MAX_ANALYTICS_EMAILS
  ): Promise<EmailAnalytics> => {
    try {
      const safeLimit = Math.min(Math.max(limit, 1), MAX_ANALYTICS_EMAILS);
      const emails = await fetchLatestAnalyticsEmails(accessToken, safeLimit);

      return {
        overview: getOverviewStats(emails),
        topSenders: getTopSenders(emails, 10),
        attachmentStats: getAttachmentStats(emails),
        cleanupCandidates: getCleanupCandidates(emails),
        analyzedEmailCount: emails.length,
        maxAnalyzed: safeLimit,
      };
    } catch (error) {
      throw new Error(getGmailErrorMessage(error));
    }
  }
);
