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
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        No attachments
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Attachments</h3>
      </div>

      <ul className="divide-y divide-gray-200">
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
                <p className="truncate text-sm font-medium text-gray-900">
                  {attachment.filename}
                </p>
                <p className="text-xs text-gray-500">
                  {attachment.mimeType || "Unknown type"} ·{" "}
                  {formatSize(attachment.size)}
                </p>
              </div>

              <a
                href={href}
                className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
