import { NextRequest, NextResponse } from "next/server";
import {
  analyzeEmails,
  detectRisk,
  summarizeEmails,
} from "@/lib/ai";
import type {
  AnalysisResult,
  EmailMetadata,
  RiskResult,
  SummaryResult,
} from "@/lib/ai";
import { createHash } from "crypto";

const MAX_EMAILS_TO_ANALYZE = 50;

type AnalyzeSearchRequest = {
  emails: EmailMetadata[];
};

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
  try {
    const body = (await request.json()) as Partial<AnalyzeSearchRequest>;

    if (!Array.isArray(body.emails)) {
      return NextResponse.json(
        {
          error: "Invalid request. Expected emails array.",
        },
        {
          status: 400,
        }
      );
    }

    const totalProvided = body.emails.length;
    const emailsToAnalyze = body.emails.slice(0, MAX_EMAILS_TO_ANALYZE);

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
      return NextResponse.json({
        ...cached.result,
        cached: true,
      });
    }

    // Convert metadata to email bodies for AI
    const emailBodies = emailsToAnalyze.map(
      (email) => `From: ${email.sender}\nSubject: ${email.subject}\n\n${email.snippet}`
    );

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

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("AI search analysis failed:", errorMessage);

    return NextResponse.json(
      {
        error: `Analysis failed: ${errorMessage}`,
      },
      {
        status: 500,
      }
    );
  }
}
