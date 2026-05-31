/**
 * AI Request/Response Types
 */

// Phase 8.2: Email metadata sent to AI (max 50 per request)
export type EmailMetadata = {
  sender: string;
  subject: string;
  snippet: string;
  date: string;
};

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

// Phase 8.2: Type aliases for API response
export type AnalysisResult = EmailAnalysis;
export type RiskResult = RiskAssessment;
export type SummaryResult = EmailSummary;
