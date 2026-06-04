# Component Map

## Active Route Components

| Component | Purpose | Props | Parent | Children / Dependencies | Related APIs |
|---|---|---|---|---|---|
| `LoginButton` | Starts Google sign-in | none | `app/page.tsx` | `signIn` from `lib/auth.ts` | `/api/auth/[...nextauth]` |
| `AnalyticsOverview` | Shows dashboard overview stats | `stats`, `analyzedEmailCount`, `maxAnalyzed` | `app/dashboard/page.tsx` | `types/analytics.ts` | none |
| `TopSenders` | Shows top senders table | `senders` | `app/dashboard/page.tsx` | `types/analytics.ts` | none |
| `AttachmentInsights` | Shows attachment metrics | `stats` | `app/dashboard/page.tsx` | `types/analytics.ts` | none |
| `CleanupCandidates` | Shows cleanup candidate groups | `candidates` | `app/dashboard/page.tsx` | `types/analytics.ts` | none |
| `EmailTable` | Recent inbox table with selected archive/delete | `emails`, `onDeleteSelected`, `onArchiveSelected` | `app/dashboard/page.tsx` | `useRouter`, `EmailActionResult` | inline dashboard server actions |
| `FilterBuilder` | Builds structured Gmail filter and starts preview | `onPreview`, `onArchive`, `onDelete` | `app/dashboard/page.tsx` | `FilterPreview`, React state | `previewFilterAction`; archive/delete props are passed but not destructured |
| `FilterPreview` | Search-result table, selection, AI analysis, execution, export, viewer | `totalMatches`, `emails`, `isLoading`, `error`, `onRefreshPreview` | `FilterBuilder` | `AIAnalysisCard`, `AIActionCard`, `EmailViewer`, `ExecutionConfirmationModal`, `ExecutionResultModal`, `ExportSelectedButton`, `executeBulkAction` | `POST /api/ai/analyze-search`; server action `executeBulkAction`; export/view APIs |
| `AIAnalysisCard` | Auto-runs AI analysis and renders result | `emails`, optional `onAnalysisComplete` | `FilterPreview` | `AIRiskBadge`, `AIEmailBreakdown`, `AIWarningsList` | `POST /api/ai/analyze-search` |
| `AIRiskBadge` | Risk badge details | `risk` | `AIAnalysisCard` | `RiskResult` | none |
| `AIEmailBreakdown` | Themes, patterns, suggestions | `analysis` | `AIAnalysisCard` | `AnalysisResult` | none |
| `AIWarningsList` | Risk concerns list | `risk` | `AIAnalysisCard` | `RiskResult` | none |
| `AIActionCard` | Displays recommendation and archive/delete result actions | `analysis`, `risk`, `summary`, `totalEmailsFound`, `emailsAnalyzed`, `analyzedAt`, `isExecuting`, `onArchiveSearchResults`, `onMoveSearchResultsToTrash` | `FilterPreview` | action callbacks | server action `executeBulkAction` via parent |
| `ExecutionConfirmationModal` | Confirms archive/delete execution | `open`, `action`, `emailCount`, `riskLevel`, `isExecuting`, `onCancel`, `onConfirm` | `FilterPreview` | `ActionType` | server action via parent |
| `ExecutionResultModal` | Shows execution result and retry | `open`, `action`, `result`, `error`, `onClose`, `onRetry` | `FilterPreview` | `ExecuteActionResult` | server action via parent |
| `EmailViewer` | Full email side panel and single export | `messageId`, `onClose` | `FilterPreview` | `AttachmentList` | `GET /api/emails/[messageId]`, `POST /api/export/email` |
| `AttachmentList` | Lists attachment download links | `messageId`, `attachments` | `EmailViewer` | `Attachment` | `GET /api/emails/[messageId]/attachments/[attachmentId]` |
| `ExportSelectedButton` | Exports selected message IDs as ZIP | `selectedMessageIds` | `FilterPreview` | browser blob download | `POST /api/export/selected` |

Evidence: imports and prop type declarations in each listed file.

## Task Components

These components form a task-library/preview subsystem. Active route integration is not proven from repository except internal imports.

| Component | Purpose | Props | Parent | Children / Dependencies | Related APIs |
|---|---|---|---|---|---|
| `SaveTaskButton` | Manages local saved tasks | `query`, `currentAction`, `onRunTask` | Not proven from active route | `CreateTaskModal`, `RunTaskModal`, `TaskCard`, `lib/tasks/task-storage.ts` | none |
| `CreateTaskModal` | Saves a task to browser localStorage | `open`, `query`, `initialAction`, `onClose`, `onTaskCreated` | `SaveTaskButton` | `saveTask()` | none |
| `TaskCard` | Displays saved task and run/delete buttons | `task`, `onRun`, `onDelete` | `SaveTaskButton` | none | none |
| `RunTaskModal` | Placeholder task execution confirmation | `open`, `task`, `onClose`, `onExecute` | `SaveTaskButton` | imports `AIAnalysisCard` but does not render it; imports missing `@/lib/types` | none |
| `TaskPreviewCard` | Preview card with confirmation and local execution log | `taskName`, `action`, `emails`, `analysis`, `hasGoogleSession`, `onCancel`, `onExecuteAction`, `onExecutionSuccess` | Not proven from active route | `TaskConfirmationDialog`, `TaskExecutionResult`, localStorage log | parent-supplied handler |
| `TaskConfirmationDialog` | Confirms task execution | `open`, `taskName`, `action`, `foundCount`, `analyzedCount`, `riskLevel`, `warnings`, `isExecuting`, `onCancel`, `onConfirm` | `TaskPreviewCard` | none | none |
| `TaskExecutionResult` | Renders task execution success/error | `result`, `onClose`, `onRetry`, `isRetrying` | `TaskPreviewCard` | none | none |
| `TaskImpactSummary` | Renders task preview impact summary | `result` | Not proven from active route | `types/task-preview.ts` | none |

Evidence: `components/SaveTaskButton.tsx`, `components/CreateTaskModal.tsx`, `components/RunTaskModal.tsx`, `components/TaskPreviewCard.tsx`, `components/TaskImpactSummary.tsx`.

## Other Components / Pages

| Component/Page | Purpose | Evidence |
|---|---|---|
| `LogoutButton` | Client sign-out button using `next-auth/react`; active route usage is not proven because dashboard uses an inline sign-out form | `components/LogoutButton.tsx`, `app/dashboard/page.tsx` |
| `app/ai-playground/page.tsx` | Client AI playground importing `lib/ai` directly | `app/ai-playground/page.tsx` |
| `app/test-ai/page.tsx` | Manual AI endpoint test UI | `app/test-ai/page.tsx` |
| `app/error.tsx`, `app/not-found.tsx` | Error/not-found UI | files under `app/` |

