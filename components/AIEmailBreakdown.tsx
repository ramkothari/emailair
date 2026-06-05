import type { AnalysisResult } from "@/lib/ai";

type AIEmailBreakdownProps = {
  analysis: AnalysisResult;
};

export function AIEmailBreakdown({ analysis }: AIEmailBreakdownProps) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F5]">
        Analysis Summary
      </h4>

      <div className="mt-3 space-y-3">
        {analysis.themes && analysis.themes.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">Themes</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {analysis.themes.map((theme) => (
                <li
                  key={theme}
                  className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-[#202834] dark:text-[#A1C0E4]"
                >
                  {theme}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.patterns && analysis.patterns.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">Patterns</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {analysis.patterns.map((pattern) => (
                <li
                  key={pattern}
                  className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-700 dark:bg-[#2A2A2E] dark:text-[#F5F5F5]"
                >
                  {pattern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.suggestions && analysis.suggestions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 dark:text-[#A1A1AA]">Suggestions</p>
            <ul className="mt-1 space-y-1">
              {analysis.suggestions.map((suggestion) => (
                <li
                  key={suggestion}
                  className="rounded-2xl border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700 dark:border-[#315341] dark:bg-[#1F2D26] dark:text-green-300"
                >
                  💡 {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
