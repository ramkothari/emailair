"use client";

import { useState, type FormEvent } from "react";

export type InboxSearchFormValues = {
  query: string;
  sender: string;
  subject: string;
  olderThanDays: string;
  hasAttachment: boolean;
  unread: boolean;
};

type InboxSearchHeaderProps = {
  initialValues?: Partial<InboxSearchFormValues>;
  isSearching?: boolean;
  resultCount?: number;
  onSearch: (values: InboxSearchFormValues) => void | Promise<void>;
  onReset?: () => void;
};

const DEFAULT_VALUES: InboxSearchFormValues = {
  query: "",
  sender: "",
  subject: "",
  olderThanDays: "",
  hasAttachment: false,
  unread: false,
};

export function InboxSearchHeader({
  initialValues,
  isSearching = false,
  resultCount,
  onSearch,
  onReset,
}: InboxSearchHeaderProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [values, setValues] = useState<InboxSearchFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });

  function updateValue<Key extends keyof InboxSearchFormValues>(
    key: Key,
    value: InboxSearchFormValues[Key]
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSearch(values);
  }

  function handleReset() {
    setValues(DEFAULT_VALUES);
    onReset?.();
  }

  return (
    <section className="mb-8">
      <form onSubmit={handleSubmit} className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={values.query}
              onChange={(event) => updateValue("query", event.target.value)}
              placeholder="Search subject or keywords..."
              className="h-14 w-full rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-6 pr-12 text-base text-gray-900 shadow-[0_12px_32px_rgba(0,0,0,0.08)] outline-none transition placeholder:text-gray-400 focus:border-[#60A5FA] focus:ring-4 focus:ring-[#60A5FA]/15 dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5] dark:shadow-[0_0_34px_rgba(96,165,250,0.13)] dark:placeholder:text-[#71717A] dark:focus:border-[#60A5FA] dark:focus:ring-[#60A5FA]/20"
            />

            {values.query ? (
              <button
                type="button"
                onClick={() => updateValue("query", "")}
                className="absolute right-4 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-lg leading-none text-gray-400 transition hover:bg-[#F3F3F3] hover:text-gray-700 dark:text-[#71717A] dark:hover:bg-[#2A2A2E] dark:hover:text-[#F5F5F5]"
                aria-label="Clear search"
              >
                ✕
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setAdvancedOpen((current) => !current)}
            className="inline-flex h-14 shrink-0 items-center justify-center px-1 text-2xl leading-none text-gray-500 transition hover:text-gray-950 dark:text-[#A1A1AA] dark:hover:text-[#F5F5F5]"
            aria-expanded={advancedOpen}
            aria-label="Advanced search"
          >
            ⋮
          </button>
        </div>

        <div
          className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
            advancedOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0">
            <div className="mt-3 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)] dark:border-[#3F3F46] dark:bg-[#232326] dark:shadow-[0_18px_45px_rgba(0,0,0,0.2)]">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                    Sender Email or Name
                  </span>
                  <input
                    type="text"
                    value={values.sender}
                    onChange={(event) =>
                      updateValue("sender", event.target.value)
                    }
                    placeholder="amazon, github, billing@..."
                    className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-100 dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5] dark:placeholder:text-[#71717A] dark:focus:border-[#6C84A3] dark:focus:ring-[#6C84A3]/20"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                    Subject Contains
                  </span>
                  <input
                    type="text"
                    value={values.subject}
                    onChange={(event) =>
                      updateValue("subject", event.target.value)
                    }
                    placeholder="invoice, refund, sale..."
                    className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-100 dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5] dark:placeholder:text-[#71717A] dark:focus:border-[#6C84A3] dark:focus:ring-[#6C84A3]/20"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">
                    Older Than Days
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={values.olderThanDays}
                    onChange={(event) =>
                      updateValue("olderThanDays", event.target.value)
                    }
                    placeholder="30"
                    className="mt-1.5 h-10 w-full rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-100 dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#F5F5F5] dark:placeholder:text-[#71717A] dark:focus:border-[#6C84A3] dark:focus:ring-[#6C84A3]/20"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-[#F3F3F3] dark:border-[#3F3F46] dark:bg-[#232326] dark:text-[#A1A1AA] dark:hover:bg-[#18181B]">
                  <input
                    type="checkbox"
                    checked={values.hasAttachment}
                    onChange={(event) =>
                      updateValue("hasAttachment", event.target.checked)
                    }
                    className="h-3.5 w-3.5 appearance-none rounded-full border border-gray-300 bg-white text-gray-950 transition checked:border-[#D97706] checked:bg-[#D97706] focus:ring-2 focus:ring-[#D97706]/30 dark:border-[#3F3F46] dark:bg-[#18181B]"
                  />
                  Has Attachment
                </label>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-[#F3F3F3] dark:border-[#3F3F46] dark:bg-[#232326] dark:text-[#A1A1AA] dark:hover:bg-[#18181B]">
                  <input
                    type="checkbox"
                    checked={values.unread}
                    onChange={(event) =>
                      updateValue("unread", event.target.checked)
                    }
                    className="h-3.5 w-3.5 appearance-none rounded-full border border-gray-300 bg-white text-gray-950 transition checked:border-[#D97706] checked:bg-[#D97706] focus:ring-2 focus:ring-[#D97706]/30 dark:border-[#3F3F46] dark:bg-[#18181B]"
                  />
                  Unread
                </label>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[rgba(0,0,0,0.08)] pt-4 sm:flex-row sm:justify-end dark:border-[#3F3F46]">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex h-9 items-center justify-center rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white px-3.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-[#F3F3F3] dark:border-[#3F3F46] dark:bg-[#232326] dark:text-[#A1A1AA] dark:hover:bg-[#18181B] dark:hover:text-[#F5F5F5]"
                >
                  Reset Filters
                </button>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="inline-flex h-9 items-center justify-center rounded-2xl bg-gray-950 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#F5F5F5] dark:text-[#18181B] dark:hover:bg-white"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
