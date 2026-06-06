"use client";

import { useEffect, useState } from "react";
import type { EmailDetails } from "@/types/email";
import { AttachmentList } from "@/components/AttachmentList";

type EmailViewerProps = {
  messageId: string;
  onClose: () => void;
};

function getFileNameFromContentDisposition(
  contentDisposition: string | null,
  fallback: string
): string {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const regularMatch = contentDisposition.match(/filename="?([^"]+)"?/);

  if (regularMatch?.[1]) {
    return regularMatch[1];
  }

  return fallback;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export function EmailViewer({ messageId, onClose }: EmailViewerProps) {
  const [email, setEmail] = useState<EmailDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadEmail() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/emails/${encodeURIComponent(messageId)}`
        );

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error || "Failed to load email");
        }

        const data = (await response.json()) as EmailDetails;

        if (active) {
          setEmail(data);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load email"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadEmail();

    return () => {
      active = false;
    };
  }, [messageId]);

  async function exportEmail() {
    setExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/export/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Failed to export email");
      }

      const blob = await response.blob();
      const fileName = getFileNameFromContentDisposition(
        response.headers.get("Content-Disposition"),
        "email.zip"
      );

      downloadBlob(blob, fileName);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Failed to export email"
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="ml-auto flex h-full w-full max-w-4xl flex-col rounded-l-2xl bg-white shadow-xl dark:bg-[#232326]">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-[#3F3F46]">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
              Email Viewer
            </h2>
            <p className="text-sm text-gray-500 dark:text-[#A1A1AA]">
              Read full email and export as ZIP
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportEmail}
              disabled={exporting || loading || !email}
              className="inline-flex h-8 items-center rounded-full bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-[#F5F5F5] dark:text-[#18181B] dark:hover:bg-white dark:disabled:bg-[#3F3F46] dark:disabled:text-[#71717A]"
            >
              {exporting ? "Exporting..." : "Export Email"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center rounded-full border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="text-sm text-gray-600 dark:text-[#A1A1AA]">
              Loading email...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-[#5F3333] dark:bg-[#2D1F1F] dark:text-red-300">
              {error}
            </div>
          ) : email ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-[#F5F5F5]">
                  {email.subject}
                </h1>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
                  <p>
                    <span className="font-semibold text-gray-900 dark:text-[#F5F5F5]">From:</span>{" "}
                    <span className="text-gray-700 dark:text-[#A1A1AA]">{email.sender}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900 dark:text-[#F5F5F5]">To:</span>{" "}
                    <span className="text-gray-700 dark:text-[#A1A1AA]">{email.recipient}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900 dark:text-[#F5F5F5]">Date:</span>{" "}
                    <span className="text-gray-700 dark:text-[#A1A1AA]">{email.date}</span>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-[#71717A]">
                  Body
                </h3>

                <div className="whitespace-pre-wrap rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-900 dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5]">
                  {email.body || "(No body content)"}
                </div>
              </div>

              <AttachmentList
                messageId={email.id}
                attachments={email.attachments}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
