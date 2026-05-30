/**
 * Analysis Controller
 */

import { ProviderFactory } from "../provider-factory";
import { createAnalysisPrompt } from "../prompts";
import {
  extractJsonFromText,
  validateAnalysisResult,
} from "../controller-utils";
import type { EmailAnalysis } from "@/types/ai";

// TODO: Redis Later
const analysisCache = new Map<
  string,
  { result: EmailAnalysis; timestamp: number }
>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// TODO: Redis Later
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;

export async function analyzeEmails(
  emailBodies: string[]
): Promise<EmailAnalysis> {
  if (emailBodies.length === 0) {
    throw new Error("No emails provided for analysis");
  }

  // 1. Check cache
  const cacheKey = `analysis:${emailBodies.join("|").substring(0, 100)}`;
  const cached = analysisCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // 2. Check rate limit
  const now = Date.now();
  const callKey = "analysis";
  const calls = rateLimitMap.get(callKey) || [];
  const recentCalls = calls.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recentCalls.length >= RATE_LIMIT_MAX) {
    throw new Error(
      `Email analysis rate limit exceeded. Max ${RATE_LIMIT_MAX} calls per minute.`
    );
  }

  recentCalls.push(now);
  rateLimitMap.set(callKey, recentCalls);

  // 3. Get provider
  const provider = ProviderFactory.getProvider();

  // 4. Call provider
  const prompt = createAnalysisPrompt(emailBodies);
  const rawText = await provider.complete(prompt);

  // 5. Parse and validate
  let data: unknown;

  try {
    data = extractJsonFromText(rawText);
  } catch (error) {
    throw new Error(
      `Failed to parse analysis response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  if (!validateAnalysisResult(data)) {
    throw new Error("Analysis response failed validation");
  }

  const result: EmailAnalysis = {
    themes: data.themes,
    patterns: data.patterns,
    suggestions: data.suggestions,
    summary: data.summary,
  };

  // 6. Cache and return
  analysisCache.set(cacheKey, { result, timestamp: now });
  return result;
}

export function clearAnalysisCache(): void {
  analysisCache.clear();
}
