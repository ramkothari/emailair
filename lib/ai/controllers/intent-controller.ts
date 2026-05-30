/**
 * Intent Controller
 * 
 * Business Logic:
 * 1. Get provider
 * 2. Check cache
 * 3. Rate limit check
 * 4. Call provider with prompt
 * 5. Validate response
 * 6. Return result
 */

import { ProviderFactory } from "../provider-factory";
import { createIntentPrompt } from "../prompts";
import {
  extractJsonFromText,
  validateIntentResult,
} from "../controller-utils";
import type { Intent } from "@/types/ai";

// TODO: Redis Later - Replace with distributed cache
const intentCache = new Map<string, { result: Intent; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// TODO: Redis Later - Replace with distributed rate limiter
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 calls per minute

export async function parseIntent(userInput: string): Promise<Intent> {
  // 1. Check cache
  const cacheKey = `intent:${userInput}`;
  const cached = intentCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // 2. Check rate limit
  const now = Date.now();
  const callKey = "intent";
  const calls = rateLimitMap.get(callKey) || [];
  const recentCalls = calls.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recentCalls.length >= RATE_LIMIT_MAX) {
    throw new Error(
      `Intent parsing rate limit exceeded. Max ${RATE_LIMIT_MAX} calls per minute.`
    );
  }

  recentCalls.push(now);
  rateLimitMap.set(callKey, recentCalls);

  // 3. Get provider
  const provider = ProviderFactory.getProvider();

  // 4. Call provider
  const prompt = createIntentPrompt(userInput);
  const rawText = await provider.complete(prompt);

  // 5. Parse and validate
  let data: unknown;

  try {
    data = extractJsonFromText(rawText);
  } catch (error) {
    throw new Error(
      `Failed to parse intent response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  if (!validateIntentResult(data)) {
    throw new Error("Intent response failed validation");
  }

  const result: Intent = {
    intent: data.intent as Intent["intent"],
    confidence: data.confidence,
    target: data.target as Intent["target"],
    reasoning: data.reasoning,
  };

  // 6. Cache and return
  intentCache.set(cacheKey, { result, timestamp: now });
  return result;
}

export function clearIntentCache(): void {
  intentCache.clear();
}
