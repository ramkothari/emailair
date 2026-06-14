"use client";

import { useEffect, useState } from "react";
import {
  AIAnalysisCard,
  type AnalyzeSearchResponse,
} from "@/components/AIAnalysisCard";
import type { EmailMetadata } from "@/lib/ai";

type AnalysisEmail = EmailMetadata & {
  id?: string;
};

type InboxAIAnalysisModalProps = {
  open: boolean;
  emails: AnalysisEmail[];
  totalEmailsFound: number;
  isExecuting?: boolean;
  onClose: () => void;
  onArchiveResults: (includedIds?: string[]) => void;
  onMoveResultsToTrash: (includedIds?: string[]) => void;
};

const protectedTerms = [
  "payment",
  "failed",
  "failure",
  "invoice",
  "receipt",
  "bill",
  "due",
  "offer",
  "interview",
  "contract",
  "legal",
  "tax",
  "security",
  "recovery",
  "suspension",
  "domain renewal",
  "bank",
  "statement",
];

const routineTerms = [
  "newsletter",
  "digest",
  "update",
  "promotion",
  "marketing",
  "announcement",
  "github",
  "issue",
  "pull request",
];

function cleanSender(sender: string) {
  const name = sender.split("<")[0]?.trim().replace(/^"|"$/g, "");
  const email = sender.match(/<([^>]+)>/)?.[1] ?? sender;
  const domain = email.includes("@") ? email.split("@").pop() : null;

  return name || domain || sender || "Unknown sender";
}

function inferCategory(email: EmailMetadata) {
  const text = `${email.sender} ${email.subject} ${email.snippet}`.toLowerCase();

  if (text.includes("github")) return "GitHub Notifications";
  if (text.includes("product hunt")) return "Product Updates";
  if (text.includes("openai") || text.includes("ai ")) return "AI Newsletters";
  if (text.includes("payment") || text.includes("invoice") || text.includes("receipt")) {
    return "Payment Notifications";
  }
  if (text.includes("digest") || text.includes("newsletter")) return "News Digests";
  if (text.includes("linkedin")) return "LinkedIn Updates";
  return "Routine Updates";
}

function isProtectedEmail(email: EmailMetadata) {
  const text = `${email.sender} ${email.subject} ${email.snippet}`.toLowerCase();
  const routine = routineTerms.some((term) => text.includes(term));
  const important = protectedTerms.some((term) => text.includes(term));

  return important && !routine;
}

function buildSenderBreakdown(emails: EmailMetadata[]) {
  const counts = new Map<string, number>();

  emails.forEach((email) => {
    const sender = cleanSender(email.sender);
    counts.set(sender, (counts.get(sender) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([sender, count]) => ({ sender, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function buildCategories(emails: EmailMetadata[]) {
  return Array.from(new Set(emails.map(inferCategory))).slice(0, 8);
}

function buildConclusion(input: {
  categories: string[];
  protectedCount: number;
}) {
  const categoryText = input.categories.slice(0, 3).join(", ") || "routine updates";

  if (input.protectedCount > 0) {
    return `Mostly ${categoryText}. ${input.protectedCount} email${
      input.protectedCount === 1 ? "" : "s"
    } may need protection before bulk actions.`;
  }

  return `Mostly ${categoryText}. No invoices, job offers, contracts, tax documents, legal notices, or payment issues found.`;
}

export function InboxAIAnalysisModal({
  open,
  emails,
  totalEmailsFound,
  isExecuting = false,
  onClose,
  onArchiveResults,
  onMoveResultsToTrash,
}: InboxAIAnalysisModalProps) {
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzeSearchResponse | null>(null);
  const [protectedIds, setProtectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAnalysisResult(null);
    setProtectedIds(
      new Set(
        emails
          .filter(isProtectedEmail)
          .map((email, index) => email.id ?? `${email.sender}-${email.subject}-${index}`)
      )
    );
  }, [emails]);

  if (!open) {
    return null;
  }

  const categories = buildCategories(emails);
  const senderBreakdown = buildSenderBreakdown(emails);
  const protectedEmails = emails
    .map((email, index) => ({
      ...email,
      protectedKey: email.id ?? `${email.sender}-${email.subject}-${index}`,
    }))
    .filter(isProtectedEmail);
  const includedIds = emails
    .map((email, index) => ({
      id: email.id,
      protectedKey: email.id ?? `${email.sender}-${email.subject}-${index}`,
    }))
    .filter((email) => email.id && !protectedIds.has(email.protectedKey))
    .map((email) => email.id as string);
  const protectedCount = protectedIds.size;
  const selectedCount = Math.max(totalEmailsFound - protectedCount, 0);
  const conclusion = buildConclusion({
    categories,
    protectedCount,
  });

  function toggleProtected(id: string) {
    setProtectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="ml-auto flex h-full w-full max-w-4xl flex-col rounded-l-2xl bg-white shadow-xl dark:bg-[#232326]">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-[#3F3F46]">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F5]">
              Email Summary
            </h2>
            <p className="text-sm text-gray-500 dark:text-[#A1A1AA]">
              Quick inbox context before archive or delete.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-full border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AIAnalysisCard
            emails={emails}
            onAnalysisComplete={setAnalysisResult}
            showHeader={false}
            renderResult={false}
            autoAnalyze
          />

          {analysisResult ? (
            <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-[#3F3F46] dark:bg-[#232326]">
              <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#F8F8F8] p-4 dark:border-[#3F3F46] dark:bg-[#2A2A2E]">
                <h3 className="text-sm font-semibold text-gray-950 dark:text-[#F5F5F5]">
                  Email Summary
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-800 dark:text-[#D4D4D8]">
                  {analysisResult.summary.summary || conclusion}
                </p>
                <p className="mt-3 text-xs text-gray-500 dark:text-[#71717A]">
                  Analyzed {analysisResult.analyzedCount.toLocaleString()} of{" "}
                  {analysisResult.totalProvided.toLocaleString()} visible emails.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
                  Email Categories
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <span
                      key={category}
                      className="rounded-full bg-[#F3F3F3] px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-[#2A2A2E] dark:text-[#D4D4D8]"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
                  Senders
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {senderBreakdown.map((sender) => (
                    <button
                      key={sender.sender}
                      type="button"
                      className="flex items-center justify-between rounded-xl border border-[rgba(0,0,0,0.08)] px-3 py-2 text-left text-sm transition hover:bg-[#F8F8F8] dark:border-[#3F3F46] dark:hover:bg-[#2A2A2E]"
                    >
                      <span className="truncate text-gray-800 dark:text-[#D4D4D8]">
                        {sender.sender}
                      </span>
                      <span className="ml-3 font-semibold text-[#D97706]">
                        {sender.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
                  Protected Emails
                </h3>
                {protectedEmails.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {protectedEmails.map((email) => {
                      const checked = protectedIds.has(email.protectedKey);

                      return (
                        <li
                          key={email.protectedKey}
                          className={`rounded-2xl border px-3 py-3 transition ${
                            checked
                              ? "border-[#D97706]/40 bg-[#D97706]/10"
                              : "border-[rgba(0,0,0,0.08)] bg-white dark:border-[#3F3F46] dark:bg-[#232326]"
                          }`}
                        >
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleProtected(email.protectedKey)}
                              className="mt-1 h-3.5 w-3.5 appearance-none rounded-full border border-gray-300 bg-white transition checked:border-[#D97706] checked:bg-[#D97706] focus:ring-2 focus:ring-[#D97706]/30 dark:border-[#3F3F46] dark:bg-[#18181B]"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-gray-900 dark:text-[#F5F5F5]">
                                {email.subject || "(No subject)"}
                              </span>
                              <span className="mt-1 block text-xs text-gray-500 dark:text-[#A1A1AA]">
                                {cleanSender(email.sender)}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 rounded-2xl border border-[rgba(0,0,0,0.08)] px-3 py-3 text-sm text-gray-600 dark:border-[#3F3F46] dark:text-[#A1A1AA]">
                    No payment failures, invoices, job offers, contracts, tax
                    documents, legal notices, or security alerts detected.
                  </p>
                )}
              </div>

              <p className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#F8F8F8] px-4 py-3 text-sm text-gray-700 dark:border-[#3F3F46] dark:bg-[#2A2A2E] dark:text-[#D4D4D8]">
                {conclusion}
              </p>

              <div className="flex flex-wrap gap-3">
                <div className="mr-auto flex items-center gap-3 text-sm text-gray-600 dark:text-[#A1A1AA]">
                  <span>{selectedCount.toLocaleString()} emails selected</span>
                  <span>{protectedCount.toLocaleString()} protected</span>
                </div>
                <button
                  type="button"
                  onClick={() => onArchiveResults(includedIds)}
                  disabled={isExecuting || selectedCount === 0}
                  className="inline-flex h-8 items-center rounded-full bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#F5F5F5] dark:text-[#18181B] dark:hover:bg-white"
                >
                  Archive Emails
                </button>

                <button
                  type="button"
                  onClick={() => onMoveResultsToTrash(includedIds)}
                  disabled={isExecuting || selectedCount === 0}
                  className="inline-flex h-8 items-center rounded-full bg-red-600 px-3 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Move To Trash
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 items-center rounded-full border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
                >
                  Review Emails
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 items-center rounded-full border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
                >
                  Keep Results
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
