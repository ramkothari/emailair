export type InboxHealth = {
  totalScanned: number;
  unreadEmails: number;
  readEmails: number;
  readRate: number;
  starredEmails: number;
  importantEmails: number;
  emailsWithAttachments: number;
};

export type CategoryStat = {
  category: string;
  count: number;
  percentage: number;
};

export type EmailAgeBucket = {
  label: string;
  count: number;
  percentage: number;
};

export type SenderStat = {
  sender: string;
  count: number;
  percentage: number;
};

export type SenderInsights = {
  uniqueSenders: number;
  repeatSenders: number;
  noReplySenders: number;
  topSenders: SenderStat[];
};

export type AttachmentStats = {
  emailsWithAttachments: number;
  largestMessageSizeEstimate: number;
  estimatedAttachmentMessageBytes: number;
};

export type ActivityTrend = {
  label: string;
  count: number;
};

export type ActivityTrends = {
  byMonth: ActivityTrend[];
  byWeekday: ActivityTrend[];
};

export type NewsletterSender = {
  sender: string;
  count: number;
};

export type NewsletterInsights = {
  newsletterEmails: number;
  newsletterSenders: number;
  topNewsletterSenders: NewsletterSender[];
};

export type CleanupCandidate = {
  title: string;
  count: number;
  recommendation: string;
};

export type EmailAnalytics = {
  inboxHealth: InboxHealth;
  categoryBreakdown: CategoryStat[];
  ageDistribution: EmailAgeBucket[];
  senderInsights: SenderInsights;
  attachmentStats: AttachmentStats;
  activityTrends: ActivityTrends;
  newsletterInsights: NewsletterInsights;
  scannedEmailCount: number;
  maxScanned: number;
  scanComplete: boolean;
  generatedAt: string;
  cached: boolean;
};
