"use client";

import { useState } from "react";
import {
  parseIntent,
  analyzeEmails,
  detectRisk,
  summarizeEmails,
} from "@/lib/ai";
import type {
  Intent,
  EmailAnalysis,
  RiskAssessment,
  EmailSummary,
} from "@/types/ai";

type TestResult =
  | Intent
  | EmailAnalysis
  | RiskAssessment
  | EmailSummary
  | null;

export default function AIPlaygroundPage() {
  const [prompt, setPrompt] = useState("Delete all promotional emails older than 6 months");
  const [testType, setTestType] = useState<"intent" | "analyze" | "risk" | "summarize">("intent");
  const [result, setResult] = useState<TestResult>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (testType === "intent") {
        const intentResult = await parseIntent(prompt);
        setResult(intentResult);
      } else if (testType === "analyze") {
        const emailBodies = [prompt];
        const analysisResult = await analyzeEmails(emailBodies);
        setResult(analysisResult);
      } else if (testType === "risk") {
        const emailBodies = [prompt];
        const riskResult = await detectRisk(emailBodies);
        setResult(riskResult);
      } else if (testType === "summarize") {
        const emailBodies = [prompt];
        const summaryResult = await summarizeEmails(emailBodies);
        setResult(summaryResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">AI Playground</h1>
          <p className="mt-2 text-sm text-gray-600">
            Test parseIntent, analyzeEmails, detectRisk, and summarizeEmails
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-6">
          <div className="space-y-4">
            {/* Test Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900">
                Test Type
              </label>
              <select
                value={testType}
                onChange={(e) =>
                  setTestType(
                    e.target.value as
                      | "intent"
                      | "analyze"
                      | "risk"
                      | "summarize"
                  )
                }
                className="mt-2 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="intent">Parse Intent</option>
                <option value="analyze">Analyze Emails</option>
                <option value="risk">Detect Risk</option>
                <option value="summarize">Summarize Emails</option>
              </select>
            </div>

            {/* Prompt Input */}
            <div>
              <label className="block text-sm font-medium text-gray-900">
                {testType === "intent"
                  ? "User Intent (e.g., 'Delete all promotional emails')"
                  : "Email Body or Text"}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                className="mt-2 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter text for testing..."
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </div>
            )}

            {/* Result Display */}
            {result && (
              <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-200">
                <p className="mb-2 text-sm font-semibold text-blue-900">
                  Result:
                </p>
                <pre className="overflow-x-auto rounded bg-blue-100 p-3 text-xs text-blue-900">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}

            {/* Test Button */}
            <button
              onClick={handleTest}
              disabled={loading || !prompt.trim()}
              className="inline-flex h-8 w-full items-center justify-center rounded-full bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Testing..." : "Run Test"}
            </button>
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">About</h2>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>
                <span className="font-medium">parseIntent:</span> Extract action
                intent from user input
              </li>
              <li>
                <span className="font-medium">analyzeEmails:</span> Find themes,
                patterns, and suggestions
              </li>
              <li>
                <span className="font-medium">detectRisk:</span> Assess risk
                level before deletion/archive
              </li>
              <li>
                <span className="font-medium">summarizeEmails:</span> Create
                concise summaries
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-blue-50 p-6 ring-1 ring-blue-200">
            <h2 className="text-lg font-semibold text-blue-900">
              Provider Configuration
            </h2>
            <p className="mt-2 text-sm text-blue-800">
              Change <code className="font-mono">AI_PROVIDER</code> in{" "}
              <code className="font-mono">.env.local</code>:
            </p>
            <pre className="mt-3 overflow-x-auto rounded bg-blue-100 p-3 text-xs text-blue-900">
              AI_PROVIDER=grok{"\n"}
              GROK_API_KEY=xai-...
            </pre>
            <p className="mt-3 text-xs text-blue-700">
              Supported: openai (OPENAI_API_KEY), grok (GROK_API_KEY), gemini (GEMINI_API_KEY), deepseek (DEEPSEEK_API_KEY), claude (CLAUDE_API_KEY)
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
