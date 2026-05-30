export type EmailFilter = {
  sender?: string;
  subject?: string;
  olderThanDays?: number;
  hasAttachment?: boolean;
};
