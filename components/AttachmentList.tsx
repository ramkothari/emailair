"use client";

import type { Attachment } from "@/types/email";

type AttachmentListProps = {
  messageId: string;
  attachments: Attachment[];
};

function formatSize(bytes: number): string {
  if (bytes <= 0) {
    return "Unknown size";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({
  messageId,
  attachments,
}: AttachmentListProps) {
  if (attachments.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-[#3F3F46] dark:bg-[#2A2A2E] dark:text-[#A1A1AA]">
        No attachments
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-[#3F3F46]">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">Attachments</h3>
      </div>

      <ul className="divide-y divide-gray-200 dark:divide-[#3F3F46]">
        {attachments.map((attachment) => {
          const href = `/api/emails/${encodeURIComponent(
            messageId
          )}/attachments/${encodeURIComponent(
            attachment.attachmentId
          )}?filename=${encodeURIComponent(
            attachment.filename
          )}&mimeType=${encodeURIComponent(attachment.mimeType)}`;

          return (
            <li
              key={attachment.attachmentId}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-[#F5F5F5]">
                  {attachment.filename}
                </p>
                <p className="text-xs text-gray-500 dark:text-[#A1A1AA]">
                  {attachment.mimeType || "Unknown type"} ·{" "}
                  {formatSize(attachment.size)}
                </p>
              </div>

              <a
                href={href}
                className="inline-flex h-8 shrink-0 items-center rounded-full border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
              >
                Download
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
