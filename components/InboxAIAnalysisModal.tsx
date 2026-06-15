"use client";

import { useEffect, useMemo, useState } from "react";
import type { EmailMetadata } from "@/lib/ai";

type AnalysisEmail = EmailMetadata & {
  id?: string;
};

type ClassifiedEmail = {
  email: AnalysisEmail;
  key: string;
  sender: string;
  category: string;
  protectedReason: string | null;
  confidence: number;
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

const MAX_ANALYSIS_BATCH = 100;
const PROTECTION_THRESHOLD = 0.9;

const routineSenderSignals = [
  "product hunt",
  "reddit",
  "linkedin",
  "substack",
  "medium",
  "quincy larson",
  "freecodecamp",
  "github",
  "newsletter",
  "digest",
];

const trustedBillingSignals = [
  "cloudflare",
  "stripe",
  "paypal",
  "razorpay",
  "cursor",
  "openai",
  "google",
  "microsoft",
  "aws",
  "amazon web services",
  "vercel",
  "netlify",
  "github",
  "namecheap",
  "godaddy",
  "bank",
  "hdfc",
  "icici",
  "axis",
  "sbi",
];

const routineContentPatterns = [
  /\b(newsletter|digest|roundup|weekly|daily)\b/i,
  /\b(coupon|voucher|cashback|discount|offer|sale|deal|promo)\b/i,
  /\b(free course|learn|learning|tutorial|webinar|blog|article|post)\b/i,
  /\b(product hunt|reddit|linkedin|github discussion|pull request|issue)\b/i,
  /\b(announcement|launch|update|community|news)\b/i,
];

function cleanSender(sender: string): string {
  const name = sender.split("<")[0]?.trim().replace(/^"|"$/g, "");
  const email = sender.match(/<([^>]+)>/)?.[1] ?? sender;
  const domain = email.includes("@") ? email.split("@").pop() : null;

  return name || domain || sender || "Unknown sender";
}

function getSearchText(email: EmailMetadata): string {
  return `${email.sender} ${email.subject} ${email.snippet ?? ""}`.toLowerCase();
}

function hasPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function hasSenderSignal(sender: string, signals: string[]): boolean {
  const normalized = sender.toLowerCase();
  return signals.some((signal) => normalized.includes(signal));
}

function inferCategory(email: EmailMetadata): string {
  const text = getSearchText(email);

  if (text.includes("github")) return "GitHub Notifications";
  if (text.includes("product hunt")) return "Product Updates";
  if (text.includes("reddit")) return "Routine Updates";
  if (text.includes("linkedin")) return "LinkedIn Updates";
  if (text.includes("openai") || text.includes("ai ")) return "AI Newsletters";
  if (text.includes("newsletter") || text.includes("digest")) return "News Digests";
  if (/\b(invoice|receipt|billing|payment|subscription)\b/i.test(text)) {
    return "Payment Notifications";
  }
  if (/\b(security|recovery|verification|password)\b/i.test(text)) {
    return "Security Alerts";
  }
  if (/\b(coupon|voucher|cashback|discount|offer|sale)\b/i.test(text)) {
    return "Promotions";
  }

  return "Routine Updates";
}

function getProtectionDecision(email: EmailMetadata): {
  reason: string | null;
  confidence: number;
} {
  const sender = cleanSender(email.sender);
  const senderText = sender.toLowerCase();
  const text = getSearchText(email);
  const subject = email.subject.toLowerCase();
  const isRoutineSender = hasSenderSignal(senderText, routineSenderSignals);
  const isTrustedBillingSender = hasSenderSignal(senderText, trustedBillingSignals);
  const isRoutineContent = hasPattern(text, routineContentPatterns);

  if (
    isRoutineContent &&
    !/\b(security alert|password reset|account recovery|payment failed|payment failure)\b/i.test(text)
  ) {
    return { reason: null, confidence: 0 };
  }

  if (
    /\b(payment failed|payment failure|card declined|billing failed|past due|overdue)\b/i.test(text)
  ) {
    return {
      reason: "Payment issue",
      confidence: isRoutineSender ? 0.72 : 0.96,
    };
  }

  if (
    /\b(your invoice|invoice is available|tax invoice|billing statement|statement is ready)\b/i.test(subject) &&
    isTrustedBillingSender
  ) {
    return { reason: "Invoice", confidence: 0.96 };
  }

  if (
    /\b(receipt|payment received|order confirmation)\b/i.test(subject) &&
    isTrustedBillingSender &&
    !/\b(coupon|voucher|cashback|discount|offer)\b/i.test(text)
  ) {
    return { reason: "Receipt", confidence: 0.92 };
  }

  if (
    /\b(security alert|suspicious sign-in|password reset|account recovery|verify your account|identity verification)\b/i.test(text)
  ) {
    return {
      reason: "Security alert",
      confidence: isRoutineSender ? 0.76 : 0.95,
    };
  }

  if (/\b(contract|legal notice|tax document|government notice|compliance notice)\b/i.test(text)) {
    return {
      reason: "Legal or tax",
      confidence: isRoutineSender ? 0.7 : 0.93,
    };
  }

  if (/\b(job offer|interview invitation|interview scheduled)\b/i.test(text)) {
    return {
      reason: "Job or interview",
      confidence: isRoutineSender ? 0.68 : 0.92,
    };
  }

  if (/\b(domain renewal|domain expires|service suspension|account suspended|subscription renewal)\b/i.test(text)) {
    return {
      reason: "Renewal or suspension",
      confidence: isRoutineSender ? 0.7 : 0.93,
    };
  }

  if (/\b(bank statement|banking alert|credit card statement|debit card)\b/i.test(text)) {
    return {
      reason: "Banking",
      confidence: isRoutineSender ? 0.68 : 0.94,
    };
  }

  return { reason: null, confidence: 0 };
}

function classifyEmail(email: AnalysisEmail, index: number): ClassifiedEmail {
  const decision = getProtectionDecision(email);
  const confidence =
    decision.reason && decision.confidence >= PROTECTION_THRESHOLD
      ? decision.confidence
      : 0;

  return {
    email,
    key: email.id ?? `${email.sender}-${email.subject}-${index}`,
    sender: cleanSender(email.sender),
    category: inferCategory(email),
    protectedReason: confidence > 0 ? decision.reason : null,
    confidence,
  };
}

function countBy<T extends string>(items: T[]): Array<{ label: T; count: number }> {
  const counts = new Map<T, number>();

  items.forEach((item) => {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function buildSenderRows(classifiedEmails: ClassifiedEmail[]) {
  const senderMap = new Map<
    string,
    {
      sender: string;
      count: number;
      categoryCounts: Map<string, number>;
    }
  >();

  classifiedEmails.forEach((item) => {
    const existing =
      senderMap.get(item.sender) ??
      {
        sender: item.sender,
        count: 0,
        categoryCounts: new Map<string, number>(),
      };

    existing.count += 1;
    existing.categoryCounts.set(
      item.category,
      (existing.categoryCounts.get(item.category) ?? 0) + 1
    );
    senderMap.set(item.sender, existing);
  });

  return Array.from(senderMap.values())
    .map((sender) => ({
      sender: sender.sender,
      count: sender.count,
      category:
        Array.from(sender.categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
        "Routine Updates",
    }))
    .sort((a, b) => b.count - a.count || a.sender.localeCompare(b.sender))
    .slice(0, 8);
}

function buildSummaryBullets(input: {
  categoryRows: Array<{ label: string; count: number }>;
  protectedRows: ClassifiedEmail[];
  senderRows: Array<{ sender: string; count: number; category: string }>;
}): string[] {
  const bullets: string[] = [];
  const topCategories = input.categoryRows.slice(0, 2).map((item) => item.label);

  bullets.push(`Mostly ${topCategories.join(" and ") || "routine updates"}`);

  const github = input.categoryRows.find((item) => item.label === "GitHub Notifications");
  if (github) bullets.push("GitHub notifications are common");

  const learningSignals = input.senderRows.filter((item) =>
    /quincy larson|freecodecamp|learn|course/i.test(item.sender)
  );
  if (learningSignals.length > 0) bullets.push("Learning newsletters detected");

  const paymentCount = input.protectedRows.filter((item) =>
    /invoice|receipt|payment/i.test(item.protectedReason ?? "")
  ).length;
  if (paymentCount > 0) {
    bullets.push(`${paymentCount} payment-related email${paymentCount === 1 ? "" : "s"} protected`);
  } else {
    bullets.push("No high-confidence invoices or payment failures found");
  }

  const legalCount = input.protectedRows.filter((item) =>
    /legal|tax|job|interview|contract/i.test(item.protectedReason ?? "")
  ).length;
  bullets.push(
    legalCount > 0
      ? `${legalCount} legal, tax, job, or contract email${legalCount === 1 ? "" : "s"} protected`
      : "No contracts, legal notices, tax documents, or job offers found"
  );

  return bullets.slice(0, 6);
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
  const [analyzedLimit, setAnalyzedLimit] = useState(MAX_ANALYSIS_BATCH);
  const [includeUnanalyzed, setIncludeUnanalyzed] = useState(false);
  const [userUnprotectedKeys, setUserUnprotectedKeys] = useState<Set<string>>(
    new Set()
  );
  const emailSignature = useMemo(
    () =>
      emails
        .map((email) => `${email.id ?? ""}:${email.sender}:${email.subject}`)
        .join("|"),
    [emails]
  );

  useEffect(() => {
    setAnalyzedLimit(MAX_ANALYSIS_BATCH);
    setIncludeUnanalyzed(false);
    setUserUnprotectedKeys(new Set());
  }, [emailSignature, open]);

  const analyzedEmails = useMemo(
    () => emails.slice(0, Math.min(analyzedLimit, emails.length)),
    [emails, analyzedLimit]
  );
  const classifiedEmails = useMemo(
    () => analyzedEmails.map(classifyEmail),
    [analyzedEmails]
  );
  const protectedRows = classifiedEmails.filter((item) => item.protectedReason);
  const activeProtectedRows = protectedRows.filter(
    (item) => !userUnprotectedKeys.has(item.key)
  );
  const protectedIds = new Set<string>(
    activeProtectedRows
      .map((item) => item.email.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  );
  const unanalyzedEmails = emails.slice(analyzedEmails.length);
  const notAnalyzedCount = Math.max(totalEmailsFound - analyzedEmails.length, 0);
  const categoryRows = countBy(classifiedEmails.map((item) => item.category)).slice(0, 8);
  const senderRows = buildSenderRows(classifiedEmails);
  const summaryBullets = buildSummaryBullets({
    categoryRows,
    protectedRows,
    senderRows,
  });
  const analyzedActionIds = analyzedEmails
    .map((email) => email.id)
    .filter(
      (id): id is string =>
        typeof id === "string" && id.length > 0 && !protectedIds.has(id)
    );
  const unanalyzedIds = unanalyzedEmails
    .map((email) => email.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const actionIds = includeUnanalyzed
    ? [...analyzedActionIds, ...unanalyzedIds]
    : analyzedActionIds;
  const availableCount = analyzedActionIds.length;

  if (!open) {
    return null;
  }

  function analyzeNextBatch() {
    setAnalyzedLimit((current) => Math.min(current + MAX_ANALYSIS_BATCH, emails.length));
    setIncludeUnanalyzed(false);
  }

  function toggleProtectedEmail(key: string) {
    setUserUnprotectedKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function executeAction(action: "archive" | "trash") {
    if (actionIds.length === 0) {
      return;
    }

    if (action === "archive") {
      onArchiveResults(actionIds);
      return;
    }

    onMoveResultsToTrash(actionIds);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="ml-auto flex h-full w-full max-w-4xl flex-col rounded-l-2xl bg-white shadow-xl dark:bg-[#232326]">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-[#3F3F46]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[#A1A1AA]">
              AI Summary
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-6 text-gray-950 dark:text-[#F5F5F5]">
              Bulk Email Summary
            </h2>
            <p className="mt-1 text-xs text-gray-600 dark:text-[#A1A1AA]">
              {analyzedEmails.length.toLocaleString()} of{" "}
              {totalEmailsFound.toLocaleString()} selected emails analyzed
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
          <section className="space-y-5">
            <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#F8F8F8] px-5 py-4 text-sm leading-7 text-gray-900 shadow-sm dark:border-[#3F3F46] dark:bg-[#2A2A2E] dark:text-[#F5F5F5]">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
                Inbox Summary
              </h3>
              <ul className="space-y-2">
                {summaryBullets.map((bullet) => (
                  <li key={bullet}>- {bullet}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
                Categories
              </h3>
              <div className="overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#F3F3F3] dark:border-[#3F3F46] dark:bg-[#232326]">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[78%]" />
                    <col className="w-[22%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[rgba(0,0,0,0.08)] bg-white dark:border-[#3F3F46] dark:bg-[#232326]">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-[#71717A]">
                        Category
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-[#71717A]">
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRows.map((row, index) => (
                      <tr
                        key={row.label}
                        className={`border-b border-[rgba(0,0,0,0.08)] transition last:border-b-0 dark:border-[#3F3F46] ${
                          index % 2 === 0
                            ? "bg-white dark:bg-[#232326]"
                            : "bg-[#F8F8F8] dark:bg-[#2A2A2E]"
                        } hover:bg-white dark:hover:bg-[#2A2A2E]`}
                      >
                        <td className="px-4 py-2.5 text-gray-900 dark:text-[#F5F5F5]">
                          {row.label}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-[#D97706]">
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
                Top Senders
              </h3>
              <div className="overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#F3F3F3] dark:border-[#3F3F46] dark:bg-[#232326]">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[48%]" />
                    <col className="w-[36%]" />
                    <col className="w-[16%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[rgba(0,0,0,0.08)] bg-white dark:border-[#3F3F46] dark:bg-[#232326]">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-[#71717A]">
                        Sender
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-[#71717A]">
                        Category
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-[#71717A]">
                        Emails
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {senderRows.map((row, index) => (
                      <tr
                        key={row.sender}
                        className={`border-b border-[rgba(0,0,0,0.08)] transition last:border-b-0 dark:border-[#3F3F46] ${
                          index % 2 === 0
                            ? "bg-white dark:bg-[#232326]"
                            : "bg-[#F8F8F8] dark:bg-[#2A2A2E]"
                        } hover:bg-white dark:hover:bg-[#2A2A2E]`}
                      >
                        <td className="truncate px-4 py-2.5 font-medium text-gray-900 dark:text-[#F5F5F5]">
                          {row.sender}
                        </td>
                        <td className="truncate px-4 py-2.5 text-xs text-gray-600 dark:text-[#A1A1AA]">
                          {row.category}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-[#D97706]">
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
                Protected Emails{" "}
                <span className="text-[#D97706]">{activeProtectedRows.length}</span>
              </h3>
              {protectedRows.length > 0 ? (
                <ul className="space-y-2">
                  {protectedRows.map((item) => (
                    <li
                      key={item.key}
                      className={`rounded-2xl border text-sm transition ${
                        userUnprotectedKeys.has(item.key)
                          ? "border-[rgba(0,0,0,0.08)] bg-white dark:border-[#3F3F46] dark:bg-[#232326]"
                          : "border-[#D97706]/35 bg-[#D97706]/10 shadow-[inset_3px_0_0_#D97706] dark:border-[#D97706]/35 dark:bg-[#D97706]/[0.12]"
                      } hover:bg-[#F8F8F8] dark:hover:bg-[#2A2A2E]`}
                    >
                      <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={!userUnprotectedKeys.has(item.key)}
                          onChange={() => toggleProtectedEmail(item.key)}
                          className="mt-0.5 h-3.5 w-3.5 appearance-none rounded-full border border-gray-300 bg-white transition checked:border-[#D97706] checked:bg-[#D97706] focus:ring-2 focus:ring-[#D97706]/30 dark:border-[#3F3F46] dark:bg-[#18181B] dark:checked:border-[#D97706] dark:checked:bg-[#D97706]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-gray-950 dark:text-[#F5F5F5]">
                            {item.email.subject || "(No subject)"}
                          </span>
                          <span className="mt-1 block text-xs text-gray-600 dark:text-[#A1A1AA]">
                            {item.sender}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 text-sm text-gray-600 dark:border-[#3F3F46] dark:bg-[#232326] dark:text-[#A1A1AA]">
                  No high-confidence invoices, payment failures, legal notices,
                  job offers, contracts, tax documents, or security alerts found.
                </p>
              )}
            </div>

            {notAnalyzedCount > 0 ? (
              <div className="rounded-2xl border border-[#D97706]/30 bg-[#D97706]/10 px-4 py-3 text-sm text-gray-800 dark:border-[#5A3A16] dark:bg-[#2F261B] dark:text-[#F5F5F5]">
                <p>
                  {notAnalyzedCount.toLocaleString()} selected emails have not
                  yet been analyzed.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={analyzeNextBatch}
                    disabled={analyzedEmails.length >= emails.length}
                    className="inline-flex h-8 items-center rounded-full bg-[#D97706] px-3 text-xs font-medium text-white transition hover:bg-[#B45309] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Analyze Next 100
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludeUnanalyzed(true)}
                    className="inline-flex h-8 items-center rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-[#F3F3F3] dark:border-[#3F3F46] dark:bg-[#232326] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
                  >
                    Proceed Without Protection
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <div className="border-t border-gray-200 bg-white px-6 py-4 dark:border-[#3F3F46] dark:bg-[#232326]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="mr-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-700 dark:text-[#A1A1AA]">
              <span>
                <span className="font-semibold text-gray-950 dark:text-[#F5F5F5]">
                  {analyzedEmails.length.toLocaleString()}
                </span>{" "}
                analyzed
              </span>
              <span>
                <span className="font-semibold text-gray-950 dark:text-[#F5F5F5]">
                  {availableCount.toLocaleString()}
                </span>{" "}
                available
              </span>
              <span className="text-[#D97706]">
                {activeProtectedRows.length.toLocaleString()} protected
              </span>
              {notAnalyzedCount > 0 ? (
                <span>{notAnalyzedCount.toLocaleString()} not analyzed</span>
              ) : null}
              {includeUnanalyzed && notAnalyzedCount > 0 ? (
                <span className="font-medium text-[#B45309]">
                  Unanalyzed included
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <button
                type="button"
                onClick={() => executeAction("archive")}
                disabled={isExecuting || actionIds.length === 0}
                className="inline-flex h-8 min-w-28 items-center justify-center rounded-full bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#F5F5F5] dark:text-[#18181B] dark:hover:bg-white"
              >
                Archive Emails
              </button>
              <button
                type="button"
                onClick={() => executeAction("trash")}
                disabled={isExecuting || actionIds.length === 0}
                className="inline-flex h-8 min-w-28 items-center justify-center rounded-full bg-red-600 px-3 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Move To Trash
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 min-w-28 items-center justify-center rounded-full border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
              >
                Review Emails
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 min-w-28 items-center justify-center rounded-full border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
              >
                Keep Results
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
