/**
 * AI API - Public Interface
 * 
 * The rest of the application only imports from this file
 * All controllers are exposed through this unified API
 */

export { parseIntent } from "./controllers/intent-controller";
export { analyzeEmails } from "./controllers/analysis-controller";
export { detectRisk } from "./controllers/risk-controller";
export { summarizeEmails } from "./controllers/summary-controller";

export type { Intent, EmailAnalysis, RiskAssessment, EmailSummary } from "@/types/ai";
