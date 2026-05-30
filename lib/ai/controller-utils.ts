/**
 * Controller utilities for validation and parsing
 * These run AFTER the provider returns text
 */

export function extractJsonFromText(text: string): Record<string, unknown> {
  const trimmed = text.trim();

  // If it looks like markdown JSON, extract it
  const markdownMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (markdownMatch?.[1]) {
    return JSON.parse(markdownMatch[1].trim());
  }

  // Try direct JSON parse
  return JSON.parse(trimmed);
}

export function validateIntentResult(
  data: unknown
): data is {
  intent: string;
  confidence: number;
  target: string | null;
  reasoning: string;
} {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.intent === "string" &&
    typeof obj.confidence === "number" &&
    (obj.target === null || typeof obj.target === "string") &&
    typeof obj.reasoning === "string" &&
    obj.confidence >= 0 &&
    obj.confidence <= 100
  );
}

export function validateAnalysisResult(
  data: unknown
): data is {
  themes: string[];
  patterns: string[];
  suggestions: string[];
  summary: string;
} {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;

  return (
    Array.isArray(obj.themes) &&
    obj.themes.every((t) => typeof t === "string") &&
    Array.isArray(obj.patterns) &&
    obj.patterns.every((p) => typeof p === "string") &&
    Array.isArray(obj.suggestions) &&
    obj.suggestions.every((s) => typeof s === "string") &&
    typeof obj.summary === "string"
  );
}

export function validateRiskResult(
  data: unknown
): data is {
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  concerns: string[];
  safe: boolean;
  recommendation: string;
} {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;

  return (
    (obj.riskLevel === "low" ||
      obj.riskLevel === "medium" ||
      obj.riskLevel === "high") &&
    typeof obj.riskScore === "number" &&
    obj.riskScore >= 0 &&
    obj.riskScore <= 100 &&
    Array.isArray(obj.concerns) &&
    obj.concerns.every((c) => typeof c === "string") &&
    typeof obj.safe === "boolean" &&
    typeof obj.recommendation === "string"
  );
}

export function validateSummaryResult(
  data: unknown
): data is {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  senders: string[];
} {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.summary === "string" &&
    Array.isArray(obj.keyPoints) &&
    obj.keyPoints.every((k) => typeof k === "string") &&
    Array.isArray(obj.actionItems) &&
    obj.actionItems.every((a) => typeof a === "string") &&
    Array.isArray(obj.senders) &&
    obj.senders.every((s) => typeof s === "string")
  );
}
