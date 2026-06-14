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
  ProtectedEmail,
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
  id: string;
  senderName: string;
  subject: string;
  timestamp: number;
  labelIds: string[];
  hasNewsletterHeaders: boolean;
  protectedReason: string | null;
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
  protectedEmails: ProtectedEmail[];
};

type AnalyticsCacheEntry = {
  result: EmailAnalytics;
  generatedAt: number;
  analyzedEmailCount: number;
};

type IncrementalAnalyticsJob = {
  accumulator: AnalyticsAccumulator;
  generatedAt: number;
  limit: number;
  pageToken?: string;
  scanComplete: boolean;
};

type AnalyticsOptions = {
  forceRefresh?: boolean;
};

const analyticsCache = new Map<string, AnalyticsCacheEntry>();
const incrementalAnalyticsJobs = new Map<string, IncrementalAnalyticsJob>();

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
    protectedEmails: [],
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

function getProtectedReason(input: {
  sender: string;
  subject: string;
  labelIds: string[];
}): string | null {
  const text = `${input.sender} ${input.subject}`.toLowerCase();

  const rules: Array<[RegExp, string]> = [
    [/\b(payment failed|payment failure|billing failed|past due|overdue)\b/, "Payment issue"],
    [/\b(invoice|receipt|bill due|billing statement|tax document|1099|w-2)\b/, "Financial document"],
    [/\b(job offer|interview|recruiter|contract|agreement|legal notice)\b/, "Work or legal"],
    [/\b(security alert|account recovery|password reset|verify your account|suspicious sign-in)\b/, "Security alert"],
    [/\b(domain renewal|renewal failed|service suspension|account suspended)\b/, "Service renewal"],
    [/\b(bank|banking|credit card|debit card|statement available)\b/, "Banking"],
  ];

  for (const [pattern, reason] of rules) {
    if (pattern.test(text)) {
      return reason;
    }
  }

  if (input.labelIds.includes("IMPORTANT") || input.labelIds.includes("STARRED")) {
    return "Marked important";
  }

  return null;
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
    id: message.id ?? "",
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
    protectedReason: getProtectedReason({
      sender,
      subject,
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

  if (email.protectedReason && email.id) {
    const alreadyTracked = accumulator.protectedEmails.some(
      (item) => item.id === email.id
    );

    if (!alreadyTracked) {
      accumulator.protectedEmails.push({
        id: email.id,
        sender: email.senderName,
        subject: email.subject,
        reason: email.protectedReason,
        timestamp: new Date(email.timestamp).toISOString(),
      });
    }
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

function getEmptyAttachmentStats(): AttachmentStats {
  return {
    emailsWithAttachments: 0,
    largestMessageSizeEstimate: 0,
    estimatedAttachmentMessageBytes: 0,
  };
}

function buildAnalyticsResult(input: {
  accumulator: AnalyticsAccumulator;
  attachmentStats: AttachmentStats;
  safeLimit: number;
  scanComplete: boolean;
  generatedAt: number;
  cached: boolean;
}): EmailAnalytics {
  const {
    accumulator,
    attachmentStats,
    safeLimit,
    scanComplete,
    generatedAt,
    cached,
  } = input;

  return {
    inboxHealth: getInboxHealth(accumulator, attachmentStats),
    categoryBreakdown: getCategoryBreakdown(accumulator),
    ageDistribution: getAgeDistribution(accumulator),
    senderInsights: getSenderInsights(accumulator),
    attachmentStats,
    activityTrends: getActivityTrends(accumulator),
    newsletterInsights: getNewsletterInsights(accumulator),
    protectedEmails: accumulator.protectedEmails
      .slice()
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 25),
    progress: {
      status: scanComplete || accumulator.totalScanned > 0 ? "ready" : "loading",
      sendersAnalyzed: accumulator.totalScanned > 0,
      categoriesDetected: accumulator.totalScanned > 0,
      protectedEmailsIdentified: accumulator.totalScanned > 0,
      secondaryAnalyticsReady: scanComplete,
      scannedEmailCount: accumulator.totalScanned,
      maxScanned: safeLimit,
    },
    scannedEmailCount: accumulator.totalScanned,
    maxScanned: safeLimit,
    scanComplete,
    generatedAt: new Date(generatedAt).toISOString(),
    cached,
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

async function aggregateEmailMetadataBatch(input: {
  accessToken: string;
  accumulator: AnalyticsAccumulator;
  limit: number;
  batchSize: number;
  pageToken?: string;
}): Promise<{
  nextPageToken?: string;
  scanComplete: boolean;
}> {
  const safeLimit = Math.min(Math.max(input.limit, 1), MAX_ANALYTICS_EMAILS);
  const remaining = safeLimit - input.accumulator.totalScanned;

  if (remaining <= 0) {
    return {
      nextPageToken: input.pageToken,
      scanComplete: true,
    };
  }

  const gmail = getGmailClient(input.accessToken);
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults: Math.min(GMAIL_PAGE_SIZE, input.batchSize, remaining),
    pageToken: input.pageToken,
    labelIds: ["INBOX"],
  });

  const messageRefs = listResponse.data.messages ?? [];
  const nextPageToken = listResponse.data.nextPageToken ?? undefined;

  if (messageRefs.length === 0) {
    return {
      nextPageToken,
      scanComplete: !nextPageToken,
    };
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
      addEmailToAccumulator(input.accumulator, result.value);
    }
  }

  return {
    nextPageToken,
    scanComplete: !nextPageToken || input.accumulator.totalScanned >= safeLimit,
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
      const result = buildAnalyticsResult({
        accumulator,
        attachmentStats,
        safeLimit,
        scanComplete,
        generatedAt,
        cached: false,
      });

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

export async function getProgressiveEmailAnalytics(input: {
  accessToken: string;
  userKey: string;
  limit?: number;
  batchSize?: number;
  forceRefresh?: boolean;
}): Promise<EmailAnalytics> {
  try {
    const safeLimit = Math.min(
      Math.max(input.limit ?? DEFAULT_ANALYTICS_EMAILS, 1),
      MAX_ANALYTICS_EMAILS
    );
    const batchSize = Math.min(
      Math.max(input.batchSize ?? 50, 1),
      GMAIL_PAGE_SIZE
    );
    const cacheKey = createAnalyticsCacheKey(input.userKey, safeLimit);
    const jobKey = `progressive:${cacheKey}`;

    if (input.forceRefresh) {
      incrementalAnalyticsJobs.delete(jobKey);
      analyticsCache.delete(cacheKey);
    }

    const cached = !input.forceRefresh
      ? getValidCachedAnalytics(cacheKey)
      : null;

    if (cached) {
      return cached;
    }

    let job = incrementalAnalyticsJobs.get(jobKey);

    if (!job) {
      job = {
        accumulator: createAccumulator(),
        generatedAt: Date.now(),
        limit: safeLimit,
        scanComplete: false,
      };
      incrementalAnalyticsJobs.set(jobKey, job);
    }

    if (!job.scanComplete && job.accumulator.totalScanned < safeLimit) {
      const batch = await aggregateEmailMetadataBatch({
        accessToken: input.accessToken,
        accumulator: job.accumulator,
        limit: safeLimit,
        batchSize,
        pageToken: job.pageToken,
      });

      job.pageToken = batch.nextPageToken;
      job.scanComplete = batch.scanComplete;
    }

    const attachmentStats =
      job.scanComplete || job.accumulator.totalScanned >= safeLimit
        ? await aggregateAttachmentMetadata(input.accessToken, safeLimit)
        : getEmptyAttachmentStats();

    const result = buildAnalyticsResult({
      accumulator: job.accumulator,
      attachmentStats,
      safeLimit,
      scanComplete: job.scanComplete,
      generatedAt: job.generatedAt,
      cached: false,
    });

    if (job.scanComplete || job.accumulator.totalScanned >= safeLimit) {
      analyticsCache.set(cacheKey, {
        result: {
          ...result,
          progress: {
            ...result.progress,
            secondaryAnalyticsReady: true,
          },
        },
        generatedAt: job.generatedAt,
        analyzedEmailCount: result.scannedEmailCount,
      });
    }

    return result;
  } catch (error) {
    throw new Error(getGmailErrorMessage(error));
  }
}
