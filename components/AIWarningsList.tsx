import type { RiskResult } from "@/lib/ai";

type AIWarningsListProps = {
  risk: RiskResult;
};

export function AIWarningsList({ risk }: AIWarningsListProps) {
  const warnings = risk.concerns || [];

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900">Risks & Concerns</h4>

      {warnings.length === 0 ? (
        <p className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          ✓ No significant risks detected.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {warnings.map((warning) => (
            <li
              key={warning}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              ⚠️ {warning}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-gray-600">
        Recommendation: {risk.recommendation}
      </p>
    </div>
  );
}
