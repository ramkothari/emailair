import { CommitCard } from "@/components/CommitCard";
import type { Commit } from "@/lib/commits/types";

type CommitGroupProps = {
  label: string;
  commits: Commit[];
};

export function CommitGroup({ label, commits }: CommitGroupProps) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
          {label}
        </h2>
        <div className="h-px flex-1 bg-[rgba(0,0,0,0.08)] dark:bg-[#3F3F46]" />
      </div>

      <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white px-4 shadow-sm dark:border-[#3F3F46] dark:bg-[#232326]">
        {commits.map((commit) => (
          <CommitCard key={commit.id} commit={commit} />
        ))}
      </div>
    </section>
  );
}
