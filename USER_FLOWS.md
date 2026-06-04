# User Flows

## 1. Email Search

- Entry point: `/dashboard`, `FilterBuilder` form. Evidence: `app/dashboard/page.tsx`, `components/FilterBuilder.tsx`.
- UI components: `FilterBuilder` builds `EmailFilter`; `FilterPreview` displays results. Evidence: `components/FilterBuilder.tsx`, `components/FilterPreview.tsx`.
- Services used: `previewFilterAction()` -> `searchEmails()` -> Gmail API `users.messages.list/get`. Evidence: `app/actions/filter-actions.ts`, `lib/gmail.ts`.
- API endpoints: No route handler; this uses a Next.js server action.
- Database operations: Not proven from repository.
- State changes: `FilterBuilder` stores sender/subject/older-than/attachment inputs, preview data, preview filter, error/message in React state. `FilterPreview` initializes selection/view/analysis/execution state from returned emails. Evidence: `components/FilterBuilder.tsx`, `components/FilterPreview.tsx`.

## 2. AI Summary

- Entry point: Search preview renders `AIAnalysisCard` automatically when emails exist. Evidence: `components/FilterPreview.tsx`, `components/AIAnalysisCard.tsx`.
- UI components: `AIAnalysisCard`, `AIRiskBadge`, `AIEmailBreakdown`, `AIWarningsList`, then `AIActionCard`. Evidence: `components/AIAnalysisCard.tsx`, `components/AIActionCard.tsx`.
- Services used: `/api/ai/analyze-search` calls `summarizeEmails()` along with `analyzeEmails()` and `detectRisk()`. Evidence: `app/api/ai/analyze-search/route.ts`, `lib/ai/index.ts`, `lib/ai/controllers/summary-controller.ts`.
- API endpoints: `POST /api/ai/analyze-search` with `{ emails: EmailMetadata[] }`.
- Database operations: Not proven from repository; uses process-local cache.
- State changes: `AIAnalysisCard` stores `result`, `isAnalyzing`, `error`; invokes `onAnalysisComplete` so `FilterPreview` stores `analysisResult`. Evidence: `components/AIAnalysisCard.tsx`, `components/FilterPreview.tsx`.

## 3. Email Analysis

- Entry point: Same as AI Summary, after search preview data changes.
- UI components: `AIAnalysisCard` displays summary, risk, themes, patterns, suggestions, warnings. `AIActionCard` displays recommendation and action buttons. Evidence: `components/AIAnalysisCard.tsx`, `components/AIEmailBreakdown.tsx`, `components/AIWarningsList.tsx`, `components/AIActionCard.tsx`.
- Services used: `analyzeEmails()` builds analysis prompt, provider factory selects provider, provider sends HTTP request, JSON is parsed/validated. Evidence: `lib/ai/controllers/analysis-controller.ts`, `lib/ai/prompts.ts`, `lib/ai/provider-factory.ts`, `lib/ai/providers/*.ts`, `lib/ai/controller-utils.ts`.
- API endpoints: `POST /api/ai/analyze-search`; debug/test endpoints are dev-oriented (`GET /api/ai/debug`, `POST /api/ai/test-analyze`).
- Database operations: Not proven from repository; in-memory caches/rate-limit maps only.
- State changes: AI response moves from route JSON to `AIAnalysisCard.result` and `FilterPreview.analysisResult`. Evidence: `components/AIAnalysisCard.tsx`, `components/FilterPreview.tsx`.

## 4. Bulk Delete

- Entry points: Recent inbox table `Delete Selected`; search preview `Move Selected To Trash`; AI action `Move Results To Trash`. Evidence: `components/EmailTable.tsx`, `components/FilterPreview.tsx`, `components/AIActionCard.tsx`.
- UI components: `EmailTable` for recent emails; `FilterPreview`, `ExecutionConfirmationModal`, `ExecutionResultModal` for search results. Evidence: component files.
- Services used:
  - Recent inbox: inline `deleteSelectedEmails()` in `app/dashboard/page.tsx` -> `deleteEmails()` -> Gmail `users.messages.trash`.
  - Search preview: `executeBulkAction()` -> `executeAction()` -> `deleteHandler` -> `deleteEmails()`.
- API endpoints: No route handler; uses server actions.
- Database operations: Not proven from repository.
- State changes:
  - `EmailTable` selected IDs clear on success and `router.refresh()` runs. Evidence: `components/EmailTable.tsx`.
  - `FilterPreview` sets `executionTarget`, then `executionResult` or `executionError`; clears selected IDs and refreshes preview when all succeeded. Evidence: `components/FilterPreview.tsx`.

## 5. Archive

- Entry points: Recent inbox table `Archive Selected`; search preview `Archive Selected`; AI action `Archive Results`. Evidence: `components/EmailTable.tsx`, `components/FilterPreview.tsx`, `components/AIActionCard.tsx`.
- UI components: Same as Bulk Delete.
- Services used:
  - Recent inbox: inline `archiveSelectedEmails()` -> `archiveEmails()`.
  - Search preview: `executeBulkAction()` -> `executeAction()` -> `archiveHandler` -> `archiveEmails()`.
- API endpoints: No route handler; uses server actions.
- Database operations: Not proven from repository.
- Gmail operation: `archiveEmails()` calls Gmail `users.messages.modify` with `removeLabelIds: ["INBOX"]`. Evidence: `lib/gmail.ts`.
- State changes: Same pattern as Bulk Delete.

## 6. Authentication

- Entry point: `/` login page with `LoginButton`. Evidence: `app/page.tsx`, `components/LoginButton.tsx`.
- UI components: `LoginButton`; dashboard sign-out form in `app/dashboard/page.tsx`; `LogoutButton` exists but active route usage is not proven.
- Services used: `signIn("google")`, `signOut()`, `auth()`, NextAuth Google provider. Evidence: `components/LoginButton.tsx`, `app/dashboard/page.tsx`, `lib/auth.ts`.
- API endpoints: `GET/POST /api/auth/[...nextauth]`.
- Database operations: Not proven from repository.
- State changes: NextAuth JWT callback stores `account.access_token` as `token.accessToken`; session callback exposes `session.accessToken`. Evidence: `lib/auth.ts`, `types/next-auth.d.ts`.

## 7. User Settings

- Entry point: Not proven from repository.
- UI components: Not proven from repository.
- Services used: Not proven from repository.
- API endpoints: Not proven from repository.
- Database operations: Not proven from repository.
- State changes: Not proven from repository.

## 8. Billing

- Entry point: Not proven from repository.
- UI components: Not proven from repository.
- Services used: Not proven from repository.
- API endpoints: Not proven from repository.
- Database operations: Not proven from repository.
- State changes: Not proven from repository.

## Related Export Flow

- Entry point: `EmailViewer` export button or `ExportSelectedButton`. Evidence: `components/EmailViewer.tsx`, `components/ExportSelectedButton.tsx`.
- UI components: `EmailViewer`, `AttachmentList`, `ExportSelectedButton`.
- Services used: `getEmailDetails()`, `getAttachment()`, `buildSingleEmailZip()`, `buildMultipleEmailsZip()`.
- API endpoints: `GET /api/emails/[messageId]`, `GET /api/emails/[messageId]/attachments/[attachmentId]`, `POST /api/export/email`, `POST /api/export/selected`.
- Database operations: Not proven from repository.
- State changes: Client stores loading/exporting/error state and downloads blobs via browser object URLs.

