/**
 * AI API - Public Interface
 * 
 * The rest of the application only imports from this file
 * All controllers are exposed through this unified API
 */

import { parseIntent as parseIntentController } from "./controllers/intent-controller";
import { analyzeEmails as analyzeEmailsController } from "./controllers/analysis-controller";
import { detectRisk as detectRiskController } from "./controllers/risk-controller";
import { summarizeEmails as summarizeEmailsController } from "./controllers/summary-controller";

export type {
  Intent,
  EmailAnalysis,
  RiskAssessment,
  EmailSummary,
  EmailMetadata,
  AnalysisResult,
  RiskResult,
  SummaryResult,
} from "@/types/ai";

export async function parseIntent(prompt: string) {
  return parseIntentController(prompt);
}

export async function analyzeEmails(emailBodies: string[]) {
  return analyzeEmailsController(emailBodies);
}

export async function detectRisk(emailBodies: string[]) {
  return detectRiskController(emailBodies);
}

export async function summarizeEmails(emailBodies: string[]) {
  return summarizeEmailsController(emailBodies);
}
