import type { RiskResult } from "@/lib/ai";

type AIRiskBadgeProps = {
  risk: RiskResult;
};

function getRiskClasses(level: string): string {
  const normalized = level.toLowerCase();

  if (normalized.includes("high")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (normalized.includes("medium") || normalized.includes("moderate")) {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  if (normalized.includes("low")) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

export function AIRiskBadge({ risk }: AIRiskBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700 dark:text-[#A1A1AA]">Risk:</span>
      <span
        className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold dark:border-[#3F3F46] dark:bg-[#2A2A2E] dark:text-[#F5F5F5] ${getRiskClasses(
          risk.riskLevel
        )}`}
      >
        {risk.riskLevel.charAt(0).toUpperCase() + risk.riskLevel.slice(1)}
      </span>
    </div>
  );
}
