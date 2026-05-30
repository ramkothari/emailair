/**
 * Risk Detection Controller
 */

import { ProviderFactory } from "../provider-factory";
import { createRiskPrompt } from "../prompts";
import { extractJsonFromText, validateRiskResult } from "../controller-utils";
import type { RiskAssessment } from "@/types/ai";

// TODO: Redis Later
const riskCache = new Map<
  string,
  { result: RiskAssessment; timestamp: number }
>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// TODO: Redis Later
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;

export async function detectRisk(
  emailBodies: string[]
): Promise<RiskAssessment> {
  if (emailBodies.length === 0) {
    throw new Error("No emails provided for risk assessment");
  }

  // 1. Check cache
  const cacheKey = `risk:${emailBodies.join("|").substring(0, 100)}`;
  const cached = riskCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // 2. Check rate limit
  const now = Date.now();
  const callKey = "risk";
  const calls = rateLimitMap.get(callKey) || [];
  const recentCalls = calls.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recentCalls.length >= RATE_LIMIT_MAX) {
    throw new Error(
      `Risk assessment rate limit exceeded. Max ${RATE_LIMIT_MAX} calls per minute.`
    );
  }

  recentCalls.push(now);
  rateLimitMap.set(callKey, recentCalls);

  // 3. Get provider
  const provider = ProviderFactory.getProvider();

  // 4. Call provider
  const prompt = createRiskPrompt(emailBodies);
  const rawText = await provider.complete(prompt);

  // 5. Parse and validate
  let data: unknown;

  try {
    data = extractJsonFromText(rawText);
  } catch (error) {
    throw new Error(
      `Failed to parse risk response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  if (!validateRiskResult(data)) {
    throw new Error("Risk assessment response failed validation");
  }

  const result: RiskAssessment = {
    riskLevel: data.riskLevel,
    riskScore: data.riskScore,
    concerns: data.concerns,
    safe: data.safe,
    recommendation: data.recommendation,
  };

  // 6. Cache and return
  riskCache.set(cacheKey, { result, timestamp: now });
  return result;
}

export function clearRiskCache(): void {
  riskCache.clear();
}
