import { NextRequest, NextResponse } from "next/server";
import {
  analyzeEmails,
  detectRisk,
  summarizeEmails,
} from "@/lib/ai";
import { ProviderFactory } from "@/lib/ai/provider-factory";
import type {
  AnalysisResult,
  EmailMetadata,
  RiskResult,
  SummaryResult,
} from "@/lib/ai";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EMAILS_TO_ANALYZE = 50;

type AnalyzeSearchResponse = {
  analysis: AnalysisResult;
  risk: RiskResult;
  summary: SummaryResult;
  analyzedCount: number;
  totalProvided: number;
  analyzedAt: string;
  cached: boolean;
};

type AnalyzeSearchErrorResponse = {
  error: string;
};

// In-memory cache: hash -> result
const analyzeCache = new Map<
  string,
  {
    result: AnalyzeSearchResponse;
    timestamp: number;
  }
>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmailMetadata(value: unknown): value is EmailMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.sender === "string" &&
    typeof value.subject === "string" &&
    typeof value.snippet === "string" &&
    typeof value.date === "string"
  );
}

function sanitizeEmailMetadata(email: EmailMetadata): EmailMetadata {
  return {
    sender: email.sender.slice(0, 160),
    subject: email.subject.slice(0, 240),
    snippet: email.snippet.slice(0, 280),
    date: email.date.slice(0, 80),
  };
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("rate")) {
      return "AI analysis limit reached. Please try again later.";
    }

    if (
      message.includes("api key") ||
      message.includes("provider") ||
      message.includes("unauthorized") ||
      message.includes("forbidden")
    ) {
      return "Unable to analyze results. Please check the AI provider configuration.";
    }
  }

  return "Unable to analyze results. Please try again.";
}

function getStatusCode(error: unknown): number {
  if (error instanceof Error && error.message.toLowerCase().includes("rate")) {
    return 429;
  }

  return 500;
}

function getPayloadSizeBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

/**
 * Create a stable hash for a set of emails
 * Used for cache key stability
 */
function createEmailHash(emails: EmailMetadata[]): string {
  const combined = emails
    .map((email) => `${email.sender}|${email.subject}|${email.date}`)
    .join(":::");

  return createHash("sha256").update(combined).digest("hex");
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<AnalyzeSearchResponse | AnalyzeSearchErrorResponse>> {
  const requestStartedAt = Date.now();

  try {
    const body = (await request.json()) as unknown;

    if (!isRecord(body)) {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const emails = body.emails;

    if (!Array.isArray(emails)) {
      return NextResponse.json(
        {
          error: "emails must be an array.",
        },
        {
          status: 400,
        }
      );
    }

    if (!emails.every(isEmailMetadata)) {
      return NextResponse.json(
        {
          error:
            "Each email must include sender, subject, snippet, and date as strings.",
        },
        {
          status: 400,
        }
      );
    }

    const totalProvided = emails.length;
    const emailsToAnalyze = emails
      .slice(0, MAX_EMAILS_TO_ANALYZE)
      .map(sanitizeEmailMetadata);
    const provider = ProviderFactory.getCurrentProvider();
    const payloadSizeBytes = getPayloadSizeBytes({ emails: emailsToAnalyze });

    if (emailsToAnalyze.length === 0) {
      return NextResponse.json(
        {
          error: "No emails provided for analysis.",
        },
        {
          status: 400,
        }
      );
    }

    // Check cache
    const emailHash = createEmailHash(emailsToAnalyze);
    const cached = analyzeCache.get(emailHash);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.info("[ai:analyze-search] cache hit", {
        provider,
        totalProvided,
        analyzedCount: emailsToAnalyze.length,
        payloadSizeBytes,
        elapsedMs: Date.now() - requestStartedAt,
      });

      return NextResponse.json({
        ...cached.result,
        cached: true,
      });
    }

    // Convert metadata to email bodies for AI
    const emailBodies = emailsToAnalyze.map(
      (email) => `From: ${email.sender}\nSubject: ${email.subject}\n\n${email.snippet}`
    );

    console.info("[ai:analyze-search] request", {
      provider,
      totalProvided,
      analyzedCount: emailsToAnalyze.length,
      payloadSizeBytes,
      aiCalls: ["analyzeEmails", "detectRisk", "summarizeEmails"],
      execution: "parallel",
    });

    // Run analysis in parallel
    const [analysis, risk, summary] = await Promise.all([
      analyzeEmails(emailBodies),
      detectRisk(emailBodies),
      summarizeEmails(emailBodies),
    ]);

    const response: AnalyzeSearchResponse = {
      analysis,
      risk,
      summary,
      analyzedCount: emailsToAnalyze.length,
      totalProvided,
      analyzedAt: new Date().toISOString(),
      cached: false,
    };

    // Store in cache
    analyzeCache.set(emailHash, {
      result: response,
      timestamp: Date.now(),
    });

    console.info("[ai:analyze-search] success", {
      provider,
      totalProvided,
      analyzedCount: emailsToAnalyze.length,
      elapsedMs: Date.now() - requestStartedAt,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[ai:analyze-search] failed", {
      elapsedMs: Date.now() - requestStartedAt,
      error,
    });

    return NextResponse.json(
      {
        error: getSafeErrorMessage(error),
      },
      {
        status: getStatusCode(error),
      }
    );
  }
}
