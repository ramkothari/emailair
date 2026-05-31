import type { AnalysisResult } from "@/lib/ai";

type AIEmailBreakdownProps = {
  analysis: AnalysisResult;
};

export function AIEmailBreakdown({ analysis }: AIEmailBreakdownProps) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900">
        Analysis Summary
      </h4>

      <div className="mt-3 space-y-3">
        {analysis.themes && analysis.themes.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700">Themes</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {analysis.themes.map((theme) => (
                <li
                  key={theme}
                  className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700"
                >
                  {theme}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.patterns && analysis.patterns.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700">Patterns</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {analysis.patterns.map((pattern) => (
                <li
                  key={pattern}
                  className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-700"
                >
                  {pattern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.suggestions && analysis.suggestions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700">Suggestions</p>
            <ul className="mt-1 space-y-1">
              {analysis.suggestions.map((suggestion) => (
                <li
                  key={suggestion}
                  className="rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700"
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
