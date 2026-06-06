"use client";

import { useMemo, useState } from "react";
import type { Commit } from "@/lib/commits/types";

type CommitCardProps = {
  commit: Commit;
};

const sourceClasses: Record<string, string> = {
  manual:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-[#1F2D26] dark:text-emerald-300 dark:ring-[#315341]",
  automation:
    "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-[#1F2633] dark:text-blue-300 dark:ring-[#2B4A6B]",
  ai_agent:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-[#29233A] dark:text-violet-300 dark:ring-[#4C3B72]",
  system:
    "bg-gray-50 text-gray-700 ring-gray-200 dark:bg-[#2A2A2E] dark:text-[#A1A1AA] dark:ring-[#3F3F46]",
};

function formatSource(source: string): string {
  if (source === "manual") return "Manual";
  if (source === "automation") return "Automation";
  if (source === "ai_agent") return "AI Agent";
  return "System";
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatActionSummary(commit: Commit): string {
  const count = commit.emailCount;
  const emailLabel = count === 1 ? "email" : "emails";

  if (commit.actionType === "archive") {
    return `${count} ${emailLabel} archived`;
  }

  if (commit.actionType === "delete") {
    return `${count} ${emailLabel} moved to trash`;
  }

  if (commit.actionType === "export") {
    return `${count} ${emailLabel} exported`;
  }

  if (commit.actionType === "unsubscribe") {
    return `${count} ${emailLabel} unsubscribed`;
  }

  return `${count} ${emailLabel} processed`;
}

export function CommitCard({ commit }: CommitCardProps) {
  const [expanded, setExpanded] = useState(false);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, string[]>();

    for (const item of commit.items) {
      const existing = groups.get(item.sender) ?? [];
      existing.push(item.subject);
      groups.set(item.sender, existing);
    }

    return Array.from(groups.entries()).map(([sender, subjects]) => ({
      sender,
      subjects,
    }));
  }, [commit.items]);

  const hasItems = groupedItems.length > 0;

  return (
    <div className="border-b border-[rgba(0,0,0,0.08)] py-4 last:border-b-0 dark:border-[#3F3F46]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="grid w-full grid-cols-[auto_1fr_auto] gap-3 text-left"
        aria-expanded={expanded}
      >
        <span className="mt-1 text-xs text-gray-400 dark:text-[#71717A]">
          {expanded ? "v" : ">"}
        </span>

        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
              {commit.title}
            </span>

            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                sourceClasses[commit.source] ?? sourceClasses.system
              }`}
            >
              {formatSource(commit.source)}
            </span>
          </span>

          <span className="mt-1 block text-sm text-gray-600 dark:text-[#A1A1AA]">
            {formatActionSummary(commit)}
          </span>
        </span>

        <span className="shrink-0 text-xs text-gray-500 dark:text-[#71717A]">
          {formatTime(commit.createdAt)}
        </span>
      </button>

      {expanded && hasItems ? (
        <div className="ml-7 mt-4 space-y-4">
          {groupedItems.map((group) => (
            <div key={group.sender}>
              <p className="text-sm font-medium text-[#D97706]">
                {group.sender}
              </p>

              <ul className="mt-1 space-y-1 text-sm text-gray-600 dark:text-[#A1A1AA]">
                {group.subjects.map((subject, index) => (
                  <li
                    key={`${group.sender}-${subject}-${index}`}
                    className="flex gap-2"
                  >
                    <span className="text-gray-400 dark:text-[#71717A]">
                      -
                    </span>
                    <span>{subject}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
