import { NextResponse } from "next/server";
import { ProviderFactory } from "@/lib/ai/provider-factory";

/**
 * Debug endpoint to verify provider configuration
 * GET /api/ai/debug
 */

export async function GET() {
  try {
    const provider = ProviderFactory.getCurrentProvider();
    const providerEnv: Record<string, string> = {
      openai: "OPENAI_API_KEY",
      grok: "GROK_API_KEY",
      gemini: "GEMINI_API_KEY",
      deepseek: "DEEPSEEK_API_KEY",
      claude: "CLAUDE_API_KEY",
    };

    const apiKeyEnvName = providerEnv[provider] ?? "UNKNOWN_API_KEY";
    const apiKey = process.env[apiKeyEnvName];

    // Try to get provider instance
    const providerInstance = ProviderFactory.getProvider();

    return NextResponse.json({
      status: "ok",
      provider,
      apiKeyEnvName,
      apiKeySet: Boolean(apiKey),
      providerName: providerInstance.getName?.() || "unknown",
      model: ProviderFactory.getCurrentModel(),
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
