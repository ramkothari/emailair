import type {
  AnalysisResult,
  EmailMetadata,
  RiskResult,
  SummaryResult,
} from "@/lib/ai";

export type AnalyzeSearchResponse = {
  analysis: AnalysisResult;
  risk: RiskResult;
  summary: SummaryResult;
  analyzedCount: number;
  totalProvided: number;
  analyzedAt: string;
  cached: boolean;
};
