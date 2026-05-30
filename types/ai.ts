/**
 * AI Response Types
 */

export type Intent = {
  intent: "delete" | "archive" | "keep" | "export" | "summarize" | "unknown";
  confidence: number;
  target: "all" | "selected" | "query_result" | null;
  reasoning: string;
};

export type EmailAnalysis = {
  themes: string[];
  patterns: string[];
  suggestions: string[];
  summary: string;
};

export type RiskAssessment = {
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  concerns: string[];
  safe: boolean;
  recommendation: string;
};

export type EmailSummary = {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  senders: string[];
};
