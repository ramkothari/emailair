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

type QuickFilter = {
  label: string;
  apply: (values: InboxSearchFormValues) => InboxSearchFormValues;
};

const QUICK_FILTERS: QuickFilter[] = [
  {
    label: "Newsletters",
    apply: (values) => ({
      ...values,
      query: "newsletter unsubscribe",
    }),
  },
  {
    label: "Promotions",
    apply: (values) => ({
      ...values,
      query: "promotion discount offer sale",
    }),
  },
  {
    label: "Amazon",
    apply: (values) => ({
      ...values,
      sender: "amazon",
    }),
  },
  {
    label: "GitHub",
    apply: (values) => ({
      ...values,
      sender: "github",
    }),
  },
  {
    label: "Unread",
    apply: (values) => ({
      ...values,
      unread: true,
    }),
  },
  {
    label: "Attachments",
    apply: (values) => ({
      ...values,
      hasAttachment: true,
    }),
  },
];

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

  function handleQuickFilter(filter: QuickFilter) {
    setValues((current) => filter.apply(current));
  }

  function handleReset() {
    setValues(DEFAULT_VALUES);
    onReset?.();
  }

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
      <form onSubmit={handleSubmit}>
        <div className="p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-950">
                Search Emails
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Search your inbox, then analyze or act on selected results.
              </p>
            </div>

            {typeof resultCount === "number" ? (
              <div className="text-sm text-gray-500">
                Found{" "}
                <span className="font-semibold text-gray-900">
                  {resultCount.toLocaleString()}
                </span>{" "}
                email{resultCount === 1 ? "" : "s"}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              type="search"
              value={values.query}
              onChange={(event) => updateValue("query", event.target.value)}
              placeholder="Search subject or keywords..."
              className="h-11 flex-1 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-100"
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSearching}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-gray-950 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSearching ? "Searching..." : "Search"}
              </button>

              <button
                type="button"
                onClick={() => setAdvancedOpen((current) => !current)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                aria-expanded={advancedOpen}
              >
                Advanced Filters
                <span
                  className={`ml-2 transition-transform duration-300 ${
                    advancedOpen ? "rotate-180" : ""
                  }`}
                >
                  v
                </span>
              </button>
            </div>
          </div>
        </div>

        <div
          className={`grid overflow-hidden border-t border-gray-100 transition-all duration-300 ease-in-out ${
            advancedOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0">
            <div className="bg-gray-50/70 p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Sender Email or Name
                  </span>
                  <input
                    type="text"
                    value={values.sender}
                    onChange={(event) =>
                      updateValue("sender", event.target.value)
                    }
                    placeholder="amazon, github, billing@..."
                    className="mt-1.5 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Subject Contains
                  </span>
                  <input
                    type="text"
                    value={values.subject}
                    onChange={(event) =>
                      updateValue("subject", event.target.value)
                    }
                    placeholder="invoice, refund, sale..."
                    className="mt-1.5 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
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
                    className="mt-1.5 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-100"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={values.hasAttachment}
                    onChange={(event) =>
                      updateValue("hasAttachment", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-gray-950 focus:ring-gray-900"
                  />
                  Has Attachment
                </label>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={values.unread}
                    onChange={(event) =>
                      updateValue("unread", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-gray-950 focus:ring-gray-900"
                  />
                  Unread
                </label>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Quick Filters
                </p>

                <div className="flex flex-wrap gap-2">
                  {QUICK_FILTERS.map((filter) => (
                    <button
                      key={filter.label}
                      type="button"
                      onClick={() => handleQuickFilter(filter)}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  Reset Filters
                </button>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
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
