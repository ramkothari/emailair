import { NextRequest, NextResponse } from "next/server";
import { analyzeEmails } from "@/lib/ai";

/**
 * Simple test endpoint for debugging AI controller
 * POST /api/ai/test-analyze
 * Body: { emailBodies: string[] }
 */

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      emailBodies?: string[];
    };

    if (!Array.isArray(body.emailBodies) || body.emailBodies.length === 0) {
      return NextResponse.json(
        { error: "emailBodies array required" },
        { status: 400 }
      );
    }

    console.log(
      `Test: Calling analyzeEmails with ${body.emailBodies.length} emails`
    );

    const result = await analyzeEmails(body.emailBodies);

    console.log("Test: analyzeEmails succeeded:", {
      themes: result.themes?.length || 0,
      patterns: result.patterns?.length || 0,
      suggestions: result.suggestions?.length || 0,
      summary: result.summary?.substring(0, 50),
    });

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("Test endpoint error:", errorMessage);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
