export type Email = {
  id: string;
  sender: string;
  subject: string;
  date: string;
  snippet?: string;
};

export type EmailActionResult = {
  success: boolean;
  message: string;
};

export type Attachment = {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type EmailDetails = {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  date: string;
  body: string;
  htmlBody?: string;
  attachments: Attachment[];
};

export type DownloadedAttachment = Attachment & {
  data: Buffer;
};
