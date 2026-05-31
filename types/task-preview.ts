import type {
  AnalysisResult,
  EmailMetadata,
  RiskResult,
  SummaryResult,
} from "@/types/ai";

export type TaskAction = "delete" | "archive" | "download";

export type TaskPreviewEmail = EmailMetadata & {
  id: string;
};

export type TaskPreviewDefinition<TSearch = unknown> = {
  id: string;
  title: string;
  action: TaskAction;
  search: TSearch;
  searchLabel?: string;
  maxResults?: number;
};

export type TaskRunResult = {
  taskId: string;
  title: string;
  action: TaskAction;
  foundCount: number;
  analyzedCount: number;
  emails: TaskPreviewEmail[];
  analysis: AnalysisResult;
  risk: RiskResult;
  summary: SummaryResult;
  ranAt: string;
};
