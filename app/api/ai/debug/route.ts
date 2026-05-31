import { NextRequest, NextResponse } from "next/server";
import { ProviderFactory } from "@/lib/ai/provider-factory";

/**
 * Debug endpoint to verify provider configuration
 * GET /api/ai/debug
 */

export async function GET() {
  try {
    const provider = ProviderFactory.getCurrentProvider();
    const apiKey = process.env.GROK_API_KEY || "NOT SET";

    // Mask the key for security
    const maskedKey =
      apiKey === "NOT SET" ? apiKey : apiKey.substring(0, 10) + "...";

    // Try to get provider instance
    const providerInstance = ProviderFactory.getProvider();

    return NextResponse.json({
      status: "ok",
      provider,
      apiKeySet: apiKey !== "NOT SET",
      apiKeyPreview: maskedKey,
      providerName: providerInstance.getName?.() || "unknown",
      model: "llama-3.3-70b-versatile",
      environment: {
        AI_PROVIDER: process.env.AI_PROVIDER,
        NODE_ENV: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        status: "error",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
