import type { RiskResult } from "@/lib/ai";

type AIWarningsListProps = {
  risk: RiskResult;
};

export function AIWarningsList({ risk }: AIWarningsListProps) {
  const warnings = risk.concerns || [];

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">Risks & Concerns</h4>

      {warnings.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-[#315341] dark:bg-[#1F2D26] dark:text-green-300">
          ✓ No significant risks detected.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {warnings.map((warning) => (
            <li
              key={warning}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-[#5F3333] dark:bg-[#2D1F1F] dark:text-red-300"
            >
              ⚠️ {warning}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-gray-600 dark:text-[#A1A1AA]">
        Recommendation: {risk.recommendation}
      </p>
    </div>
  );
}
