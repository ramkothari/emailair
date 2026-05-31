"use client";

import { useState } from "react";
import Link from "next/link";

const testEmails = [
  "From: promotions@store.com\nSubject: Limited Time Offer\n\nDon't miss out on our sale",
  "From: newsletter@news.com\nSubject: Monthly Newsletter\n\nCheck out this month's updates",
  "From: support@bank.com\nSubject: Verify Your Account\n\nPlease verify your account",
];

async function testAnalyzeEmailsEndpoint(
  setResults: (results: string) => void
) {
  setResults("Testing...");

  try {
    const testEmailsData = [
      {
        sender: "promo@store.com",
        subject: "Sale",
        snippet: "Limited offer",
        date: "2026-05-31",
      },
      {
        sender: "news@site.com",
        subject: "Newsletter",
        snippet: "Updates",
        date: "2026-05-30",
      },
      {
        sender: "bank@secure.com",
        subject: "Verify",
        snippet: "Click here",
        date: "2026-05-29",
      },
    ];

    console.log("[TEST] Calling /api/ai/analyze-search with 3 emails");
    const response = await fetch("/api/ai/analyze-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: testEmailsData }),
    });

    const data = await response.json();

    if (response.ok) {
      setResults(JSON.stringify(data, null, 2));
      console.log("[TEST] Success:", data);
    } else {
      setResults("ERROR:\n" + JSON.stringify(data, null, 2));
      console.error("[TEST] API Error:", data);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setResults("NETWORK ERROR:\n" + message);
    console.error("[TEST] Network Error:", err);
  }
}

async function testSingleAnalysis(setResults: (results: string) => void) {
  setResults("Testing...");

  try {
    const emailBodies = [
      "From: promo@store.com\nSubject: Sale\n\nLimited offer",
      "From: news@site.com\nSubject: Newsletter\n\nUpdates",
      "From: bank@secure.com\nSubject: Verify\n\nClick here",
    ];

    console.log("[TEST] Calling /api/ai/test-analyze with 3 emails");
    const response = await fetch("/api/ai/test-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailBodies }),
    });

    const data = await response.json();

    if (response.ok) {
      setResults(JSON.stringify(data, null, 2));
      console.log("[TEST] Success:", data);
    } else {
      setResults("ERROR:\n" + JSON.stringify(data, null, 2));
      console.error("[TEST] API Error:", data);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setResults("NETWORK ERROR:\n" + message);
    console.error("[TEST] Network Error:", err);
  }
}

async function testAllControllers(setResults: (results: string) => void) {
  setResults("Testing all controllers...");

  try {
    const testEmailsData = [
      {
        sender: "p1@a.com",
        subject: "Email 1",
        snippet: "Content 1",
        date: "2026-05-31",
      },
      {
        sender: "p2@b.com",
        subject: "Email 2",
        snippet: "Content 2",
        date: "2026-05-30",
      },
    ];

    console.log("[TEST] Full workflow test starting...");
    const response = await fetch("/api/ai/analyze-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: testEmailsData }),
    });

    const data = await response.json();

    const summary = {
      status: response.ok ? "SUCCESS" : "FAILED",
      statusCode: response.status,
      analyzedCount: data.analyzedCount,
      cached: data.cached,
      hasAnalysis: !!data.analysis,
      hasRisk: !!data.risk,
      hasSummary: !!data.summary,
      error: data.error,
    };

    setResults(JSON.stringify(summary, null, 2));
    console.log("[TEST] Complete:", summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setResults("ERROR:\n" + message);
    console.error("[TEST] Error:", err);
  }
}

async function debugProviderConfig(
  setResults: (results: string) => void
) {
  setResults("Checking provider configuration...");

  try {
    console.log("[DEBUG] Fetching provider configuration");
    const response = await fetch("/api/ai/debug");
    const data = await response.json();

    setResults(JSON.stringify(data, null, 2));
    console.log("[DEBUG] Provider config:", data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setResults("ERROR:\n" + message);
    console.error("[DEBUG] Error:", err);
  }
}

export default function TestAnalyzePage() {
  const [results, setResults] = useState(
    "Test results will appear here...\n\nCheck browser console (F12) for detailed logs."
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold">Phase 8.2 API Test</h1>

      <nav className="mb-6 space-y-2">
        <Link href="/" className="block text-blue-600 hover:underline">
          ← Home
        </Link>
      </nav>

      <section className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold">Test Endpoints</h2>

          <div className="space-y-4">
            <button
              onClick={() => testAnalyzeEmailsEndpoint(setResults)}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Test /api/ai/analyze-search
            </button>

            <button
              onClick={() => testSingleAnalysis(setResults)}
              className="w-full rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Test /api/ai/test-analyze
            </button>

            <button
              onClick={() => testAllControllers(setResults)}
              className="w-full rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
            >
              Test All AI Controllers
            </button>

            <button
              onClick={() => debugProviderConfig(setResults)}
              className="w-full rounded-lg bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
            >
              🔧 Debug Provider Config
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Results</h2>
          <div className="min-h-20 rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm whitespace-pre-wrap break-words">
            {results}
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-900">Instructions</h3>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-blue-800">
            <li>Click a test button to run the API test</li>
            <li>Check the Results section below for output</li>
            <li>Check browser DevTools Console (F12) for detailed logs</li>
            <li>Check Next.js server terminal for backend logs</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
