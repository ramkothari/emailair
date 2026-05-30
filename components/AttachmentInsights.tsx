import type { AttachmentStats } from "@/types/analytics";

type AttachmentInsightsProps = {
  stats: AttachmentStats;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "0 MB";
  }

  const megabytes = bytes / (1024 * 1024);

  if (megabytes < 1) {
    const kilobytes = bytes / 1024;
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${megabytes.toFixed(1)} MB`;
}

export function AttachmentInsights({ stats }: AttachmentInsightsProps) {
  const cards = [
    {
      label: "Emails With Attachments",
      value: formatNumber(stats.emailsWithAttachments),
    },
    {
      label: "Total Attachments",
      value: formatNumber(stats.totalAttachments),
    },
    {
      label: "Largest Attachment Found",
      value: formatBytes(stats.largestAttachmentSize),
    },
  ];

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">
        Attachment Insights
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-gray-50 p-4"
          >
            <p className="text-sm font-medium text-gray-600">{card.label}</p>
            <p className="mt-2 text-xl font-bold text-gray-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
