export type OverviewStats = {
  totalEmails: number;
  unreadEmails: number;
  emailsWithAttachments: number;
  emailsOlderThanOneYear: number;
};

export type SenderStat = {
  sender: string;
  count: number;
};

export type CleanupCandidate = {
  title: string;
  count: number;
  recommendation: string;
};

export type AttachmentStats = {
  emailsWithAttachments: number;
  totalAttachments: number;
  largestAttachmentSize: number;
};

export type EmailAnalytics = {
  overview: OverviewStats;
  topSenders: SenderStat[];
  attachmentStats: AttachmentStats;
  cleanupCandidates: CleanupCandidate[];
  analyzedEmailCount: number;
  maxAnalyzed: number;
};
