export type EmailFilter = {
  query?: string;
  sender?: string;
  subject?: string;
  olderThanDays?: number;
  hasAttachment?: boolean;
};
