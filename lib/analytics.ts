import type { gmail_v1 } from "googleapis";
import { getGmailClient } from "@/lib/gmail";
import type {
  ActivityTrend,
  AttachmentStats,
  CategoryStat,
  EmailAgeBucket,
  EmailAnalytics,
  InboxHealth,
  NewsletterInsights,
  SenderInsights,
  SenderStat,
} from "@/types/analytics";

const MAX_ANALYTICS_EMAILS = 100_000;
const DEFAULT_ANALYTICS_EMAILS = 1_000;
const GMAIL_PAGE_SIZE = 500;
const DETAIL_CONCURRENCY = 20;
const ANALYTICS_CACHE_TTL_MS = 15 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type AttachmentInfo = {
  count: number;
  largestSize: number;
  estimatedBytes: number;
};

type MetadataEmail = {
  senderName: string;
  subject: string;
  timestamp: number;
  labelIds: string[];
  hasNewsletterHeaders: boolean;
};

type AnalyticsAccumulator = {
  totalScanned: number;
  unreadEmails: number;
  starredEmails: number;
  importantEmails: number;
  categoryCounts: Map<string, number>;
  ageCounts: Map<string, number>;
  senderCounts: Map<string, number>;
  newsletterSenderCounts: Map<string, number>;
  monthCounts: Map<string, number>;
  weekdayCounts: Map<string, number>;
};

type AnalyticsCacheEntry = {
  result: EmailAnalytics;
  generatedAt: number;
  analyzedEmailCount: number;
};

type AnalyticsOptions = {
  forceRefresh?: boolean;
};

const analyticsCache = new Map<string, AnalyticsCacheEntry>();

const CATEGORY_LABELS: Array<{
  labelId: string;
  label: string;
}> = [
  { labelId: "CATEGORY_PERSONAL", label: "Primary" },
  { labelId: "CATEGORY_SOCIAL", label: "Social" },
  { labelId: "CATEGORY_PROMOTIONS", label: "Promotions" },
  { labelId: "CATEGORY_UPDATES", label: "Updates" },
  { labelId: "CATEGORY_FORUMS", label: "Forums" },
];

const AGE_BUCKETS: Array<{
  key: string;
  label: string;
  maxDays?: number;
}> = [
  { key: "last7", label: "Last 7 Days", maxDays: 7 },
  { key: "last30", label: "8-30 Days", maxDays: 30 },
  { key: "last90", label: "31-90 Days", maxDays: 90 },
  { key: "last365", label: "91-365 Days", maxDays: 365 },
  { key: "older", label: "Older Than 1 Year" },
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function createAccumulator(): AnalyticsAccumulator {
  return {
    totalScanned: 0,
    unreadEmails: 0,
    starredEmails: 0,
    importantEmails: 0,
    categoryCounts: new Map(),
    ageCounts: new Map(),
    senderCounts: new Map(),
    newsletterSenderCounts: new Map(),
    monthCounts: new Map(),
    weekdayCounts: new Map(),
  };
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  return (
    headers?.find(
      (item) => item.name?.toLowerCase() === name.toLowerCase()
    )?.value ?? ""
  );
}

function cleanSenderName(value: string): string {
  return value
    .replace(/^"+|"+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

function getCategory(labelIds: string[]): string {
  const category = CATEGORY_LABELS.find((item) =>
    labelIds.includes(item.labelId)
  );

  return category?.label ?? "Uncategorized";
}

function getAgeBucket(timestamp: number): string {
  const ageDays = Math.floor((Date.now() - timestamp) / ONE_DAY_MS);

  for (const bucket of AGE_BUCKETS) {
    if (bucket.maxDays !== undefined && ageDays <= bucket.maxDays) {
      return bucket.key;
    }
  }

  return "older";
}

function getMonthKey(timestamp: number): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function hasNewsletterSignal(input: {
  sender: string;
  subject: string;
  listUnsubscribe: string;
  listId: string;
  precedence: string;
  labelIds: string[];
}): boolean {
  const searchableText = `${input.sender} ${input.subject}`.toLowerCase();

  return (
    Boolean(input.listUnsubscribe || input.listId) ||
    input.precedence.toLowerCase() === "bulk" ||
    input.labelIds.includes("CATEGORY_PROMOTIONS") ||
    searchableText.includes("newsletter") ||
    searchableText.includes("unsubscribe")
  );
}

function isNoReplySender(sender: string): boolean {
  const normalized = sender.toLowerCase();
  return (
    normalized.includes("noreply") ||
    normalized.includes("no-reply") ||
    normalized.includes("donotreply") ||
    normalized.includes("do-not-reply")
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      try {
        results[currentIndex] = {
          status: "fulfilled",
          value: await mapper(items[currentIndex]),
        };
      } catch (reason) {
        results[currentIndex] = {
          status: "rejected",
          reason,
        };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}

function toMetadataEmail(message: gmail_v1.Schema$Message): MetadataEmail {
  const headers = message.payload?.headers;
  const sender = getHeader(headers, "From") || "Unknown sender";
  const subject = getHeader(headers, "Subject") || "(No subject)";
  const labelIds = message.labelIds ?? [];
  const listUnsubscribe = getHeader(headers, "List-Unsubscribe");
  const listId = getHeader(headers, "List-Id");
  const precedence = getHeader(headers, "Precedence");

  return {
    senderName: parseSenderName(sender),
    subject,
    timestamp: getMessageTimestamp(message),
    labelIds,
    hasNewsletterHeaders: hasNewsletterSignal({
      sender,
      subject,
      listUnsubscribe,
      listId,
      precedence,
      labelIds,
    }),
  };
}

function increment(map: Map<string, number>, key: string, amount = 1): void {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function addEmailToAccumulator(
  accumulator: AnalyticsAccumulator,
  email: MetadataEmail
): void {
  accumulator.totalScanned += 1;

  if (email.labelIds.includes("UNREAD")) {
    accumulator.unreadEmails += 1;
  }

  if (email.labelIds.includes("STARRED")) {
    accumulator.starredEmails += 1;
  }

  if (email.labelIds.includes("IMPORTANT")) {
    accumulator.importantEmails += 1;
  }

  increment(accumulator.categoryCounts, getCategory(email.labelIds));
  increment(accumulator.ageCounts, getAgeBucket(email.timestamp));
  increment(accumulator.senderCounts, email.senderName);
  increment(accumulator.monthCounts, getMonthKey(email.timestamp));
  increment(
    accumulator.weekdayCounts,
    WEEKDAY_LABELS[new Date(email.timestamp).getDay()]
  );

  if (email.hasNewsletterHeaders) {
    increment(accumulator.newsletterSenderCounts, email.senderName);
  }
}

function toPercentage(count: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((count / total) * 1000) / 10;
}

function sortEntriesByCount(entries: Array<[string, number]>): Array<[string, number]> {
  return entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function getInboxHealth(
  accumulator: AnalyticsAccumulator,
  attachmentStats: AttachmentStats
): InboxHealth {
  const readEmails = accumulator.totalScanned - accumulator.unreadEmails;

  return {
    totalScanned: accumulator.totalScanned,
    unreadEmails: accumulator.unreadEmails,
    readEmails,
    readRate: toPercentage(readEmails, accumulator.totalScanned),
    starredEmails: accumulator.starredEmails,
    importantEmails: accumulator.importantEmails,
    emailsWithAttachments: attachmentStats.emailsWithAttachments,
  };
}

function getCategoryBreakdown(
  accumulator: AnalyticsAccumulator
): CategoryStat[] {
  const orderedCategories = [
    ...CATEGORY_LABELS.map((item) => item.label),
    "Uncategorized",
  ];

  return orderedCategories
    .map((category) => {
      const count = accumulator.categoryCounts.get(category) ?? 0;

      return {
        category,
        count,
        percentage: toPercentage(count, accumulator.totalScanned),
      };
    })
    .filter((item) => item.count > 0);
}

function getAgeDistribution(
  accumulator: AnalyticsAccumulator
): EmailAgeBucket[] {
  return AGE_BUCKETS.map((bucket) => {
    const count = accumulator.ageCounts.get(bucket.key) ?? 0;

    return {
      label: bucket.label,
      count,
      percentage: toPercentage(count, accumulator.totalScanned),
    };
  });
}

function getSenderInsights(
  accumulator: AnalyticsAccumulator
): SenderInsights {
  const senderEntries = Array.from(accumulator.senderCounts.entries());
  const topSenders: SenderStat[] = sortEntriesByCount(senderEntries)
    .slice(0, 10)
    .map(([sender, count]) => ({
      sender,
      count,
      percentage: toPercentage(count, accumulator.totalScanned),
    }));

  return {
    uniqueSenders: senderEntries.length,
    repeatSenders: senderEntries.filter(([, count]) => count > 1).length,
    noReplySenders: senderEntries.filter(([sender]) => isNoReplySender(sender))
      .length,
    topSenders,
  };
}

function getActivityTrends(accumulator: AnalyticsAccumulator): {
  byMonth: ActivityTrend[];
  byWeekday: ActivityTrend[];
} {
  return {
    byMonth: Array.from(accumulator.monthCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .slice(-12),
    byWeekday: WEEKDAY_LABELS.map((label) => ({
      label,
      count: accumulator.weekdayCounts.get(label) ?? 0,
    })),
  };
}

function getNewsletterInsights(
  accumulator: AnalyticsAccumulator
): NewsletterInsights {
  const newsletterEntries = Array.from(
    accumulator.newsletterSenderCounts.entries()
  );
  const newsletterEmails = newsletterEntries.reduce(
    (total, [, count]) => total + count,
    0
  );

  return {
    newsletterEmails,
    newsletterSenders: newsletterEntries.length,
    topNewsletterSenders: sortEntriesByCount(newsletterEntries)
      .slice(0, 10)
      .map(([sender, count]) => ({
        sender,
        count,
      })),
  };
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
      return "Gmail metadata permission is missing. Please reconnect Gmail and approve Gmail access.";
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

function createAnalyticsCacheKey(userKey: string, limit: number): string {
  return `analytics:${userKey}:${limit}`;
}

function getValidCachedAnalytics(cacheKey: string): EmailAnalytics | null {
  const cached = analyticsCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  if (Date.now() - cached.generatedAt > ANALYTICS_CACHE_TTL_MS) {
    analyticsCache.delete(cacheKey);
    return null;
  }

  return {
    ...cached.result,
    cached: true,
  };
}

async function aggregateEmailMetadata(
  accessToken: string,
  limit: number
): Promise<{
  accumulator: AnalyticsAccumulator;
  scanComplete: boolean;
}> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_ANALYTICS_EMAILS);
  const gmail = getGmailClient(accessToken);
  const accumulator = createAccumulator();
  let pageToken: string | undefined;
  let scanComplete = true;

  while (accumulator.totalScanned < safeLimit) {
    const remaining = safeLimit - accumulator.totalScanned;
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: Math.min(GMAIL_PAGE_SIZE, remaining),
      pageToken,
      labelIds: ["INBOX"],
    });

    const messageRefs = listResponse.data.messages ?? [];
    pageToken = listResponse.data.nextPageToken ?? undefined;

    if (messageRefs.length === 0) {
      scanComplete = !pageToken;
      break;
    }

    const settledMessages = await mapWithConcurrency(
      messageRefs,
      DETAIL_CONCURRENCY,
      async (messageRef): Promise<MetadataEmail> => {
        if (!messageRef.id) {
          throw new Error("Gmail message is missing an ID.");
        }

        const messageResponse = await gmail.users.messages.get({
          userId: "me",
          id: messageRef.id,
          format: "metadata",
          metadataHeaders: [
            "From",
            "Subject",
            "Date",
            "List-Unsubscribe",
            "List-Id",
            "Precedence",
          ],
        });

        return toMetadataEmail(messageResponse.data);
      }
    );

    for (const result of settledMessages) {
      if (result.status === "fulfilled") {
        addEmailToAccumulator(accumulator, result.value);
      }
    }

    if (!pageToken) {
      scanComplete = true;
      break;
    }

    scanComplete = false;
  }

  return {
    accumulator,
    scanComplete,
  };
}

async function aggregateAttachmentMetadata(
  accessToken: string,
  limit: number
): Promise<AttachmentStats> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_ANALYTICS_EMAILS);
  const gmail = getGmailClient(accessToken);
  let scanned = 0;
  let pageToken: string | undefined;
  let largestMessageSizeEstimate = 0;
  let estimatedAttachmentMessageBytes = 0;

  while (scanned < safeLimit) {
    const remaining = safeLimit - scanned;
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: Math.min(GMAIL_PAGE_SIZE, remaining),
      pageToken,
      labelIds: ["INBOX"],
      q: "has:attachment",
    });

    const messageRefs = listResponse.data.messages ?? [];
    pageToken = listResponse.data.nextPageToken ?? undefined;

    if (messageRefs.length === 0) {
      break;
    }

    const settledMessages = await mapWithConcurrency(
      messageRefs,
      DETAIL_CONCURRENCY,
      async (messageRef): Promise<number> => {
        if (!messageRef.id) {
          throw new Error("Gmail message is missing an ID.");
        }

        const messageResponse = await gmail.users.messages.get({
          userId: "me",
          id: messageRef.id,
          format: "metadata",
          metadataHeaders: [],
        });

        return Number(messageResponse.data.sizeEstimate ?? 0);
      }
    );

    for (const result of settledMessages) {
      if (result.status === "fulfilled") {
        scanned += 1;
        largestMessageSizeEstimate = Math.max(
          largestMessageSizeEstimate,
          result.value
        );
        estimatedAttachmentMessageBytes += result.value;
      }
    }

    if (!pageToken) {
      break;
    }
  }

  return {
    emailsWithAttachments: scanned,
    largestMessageSizeEstimate,
    estimatedAttachmentMessageBytes,
  };
}

export async function getEmailAnalytics(
  accessToken: string,
  userKey: string,
  limit: number = DEFAULT_ANALYTICS_EMAILS,
  options: AnalyticsOptions = {}
): Promise<EmailAnalytics> {
  try {
    const safeLimit = Math.min(Math.max(limit, 1), MAX_ANALYTICS_EMAILS);
    const cacheKey = createAnalyticsCacheKey(userKey, safeLimit);

    if (!options.forceRefresh) {
      const cached = getValidCachedAnalytics(cacheKey);

      if (cached) {
        return cached;
      }
    }

      const [{ accumulator, scanComplete }, attachmentStats] =
        await Promise.all([
          aggregateEmailMetadata(accessToken, safeLimit),
          aggregateAttachmentMetadata(accessToken, safeLimit),
        ]);

      const generatedAt = Date.now();
      const result: EmailAnalytics = {
        inboxHealth: getInboxHealth(accumulator, attachmentStats),
        categoryBreakdown: getCategoryBreakdown(accumulator),
        ageDistribution: getAgeDistribution(accumulator),
        senderInsights: getSenderInsights(accumulator),
        attachmentStats,
        activityTrends: getActivityTrends(accumulator),
        newsletterInsights: getNewsletterInsights(accumulator),
        scannedEmailCount: accumulator.totalScanned,
        maxScanned: safeLimit,
        scanComplete,
        generatedAt: new Date(generatedAt).toISOString(),
        cached: false,
      };

    analyticsCache.set(cacheKey, {
      result,
      generatedAt,
      analyzedEmailCount: result.scannedEmailCount,
    });

    return result;
  } catch (error) {
    throw new Error(getGmailErrorMessage(error));
  }
}
