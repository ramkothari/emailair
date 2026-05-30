/**
 * Summary Controller
 */

import { ProviderFactory } from "../provider-factory";
import { createSummaryPrompt } from "../prompts";
import {
  extractJsonFromText,
  validateSummaryResult,
} from "../controller-utils";
import type { EmailSummary } from "@/types/ai";

// TODO: Redis Later
const summaryCache = new Map<
  string,
  { result: EmailSummary; timestamp: number }
>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// TODO: Redis Later
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;

export async function summarizeEmails(
  emailBodies: string[]
): Promise<EmailSummary> {
  if (emailBodies.length === 0) {
    throw new Error("No emails provided for summarization");
  }

  // 1. Check cache
  const cacheKey = `summary:${emailBodies.join("|").substring(0, 100)}`;
  const cached = summaryCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // 2. Check rate limit
  const now = Date.now();
  const callKey = "summary";
  const calls = rateLimitMap.get(callKey) || [];
  const recentCalls = calls.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recentCalls.length >= RATE_LIMIT_MAX) {
    throw new Error(
      `Email summarization rate limit exceeded. Max ${RATE_LIMIT_MAX} calls per minute.`
    );
  }

  recentCalls.push(now);
  rateLimitMap.set(callKey, recentCalls);

  // 3. Get provider
  const provider = ProviderFactory.getProvider();

  // 4. Call provider
  const prompt = createSummaryPrompt(emailBodies);
  const rawText = await provider.complete(prompt);

  // 5. Parse and validate
  let data: unknown;

  try {
    data = extractJsonFromText(rawText);
  } catch (error) {
    throw new Error(
      `Failed to parse summary response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  if (!validateSummaryResult(data)) {
    throw new Error("Summary response failed validation");
  }

  const result: EmailSummary = {
    summary: data.summary,
    keyPoints: data.keyPoints,
    actionItems: data.actionItems,
    senders: data.senders,
  };

  // 6. Cache and return
  summaryCache.set(cacheKey, { result, timestamp: now });
  return result;
}

export function clearSummaryCache(): void {
  summaryCache.clear();
}
