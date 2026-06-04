# API Map

## Route Handlers

### `GET /api/auth/[...nextauth]`

- Purpose: NextAuth auth handler.
- Request schema: NextAuth-managed.
- Response schema: NextAuth-managed.
- Auth requirement: Public auth callback/session route managed by NextAuth.
- Evidence: `app/api/auth/[...nextauth]/route.ts`, `lib/auth.ts`.

### `POST /api/auth/[...nextauth]`

- Purpose: NextAuth auth handler.
- Request schema: NextAuth-managed.
- Response schema: NextAuth-managed.
- Auth requirement: Public auth callback/sign-in route managed by NextAuth.
- Evidence: `app/api/auth/[...nextauth]/route.ts`, `lib/auth.ts`.

### `POST /api/ai/analyze-search`

- Purpose: Analyze visible/search-result email metadata with AI analysis, risk, and summary.
- Request schema: `{ emails: EmailMetadata[] }`; `EmailMetadata` has `sender`, `subject`, `snippet`, `date`. Evidence: `app/api/ai/analyze-search/route.ts`, `types/ai.ts`.
- Response schema: `{ analysis, risk, summary, analyzedCount, totalProvided, analyzedAt, cached }`. Evidence: `app/api/ai/analyze-search/route.ts`.
- Limits: Slices to first 50 emails; in-memory hash cache for 1 hour. Evidence: `MAX_EMAILS_TO_ANALYZE`, `analyzeCache` in `app/api/ai/analyze-search/route.ts`.
- Auth requirement: Not proven from repository; route does not call `auth()`.
- Consumers: `components/AIAnalysisCard.tsx`, `app/test-ai/page.tsx`.

### `GET /api/ai/debug`

- Purpose: Return provider configuration diagnostics.
- Request schema: none.
- Response schema: `{ status, provider, apiKeySet, apiKeyPreview, providerName, model, environment }` or `{ status: "error", error }`.
- Auth requirement: Not proven from repository; route does not call `auth()`.
- Evidence: `app/api/ai/debug/route.ts`.
- Consumers: `app/test-ai/page.tsx`.

### `POST /api/ai/test-analyze`

- Purpose: Debug endpoint calling `analyzeEmails()` directly.
- Request schema: `{ emailBodies: string[] }`.
- Response schema: `EmailAnalysis` or `{ error }`.
- Auth requirement: Not proven from repository; route does not call `auth()`.
- Evidence: `app/api/ai/test-analyze/route.ts`, `types/ai.ts`.
- Consumers: `app/test-ai/page.tsx`.

### `GET /api/emails/[messageId]`

- Purpose: Fetch full Gmail message details.
- Request schema: path param `messageId`.
- Response schema: `EmailDetails` or `{ error }`. `EmailDetails` has `id`, `sender`, `recipient`, `subject`, `date`, `body`, `attachments`.
- Auth requirement: Requires `auth()` session with `accessToken`; returns 401 if missing.
- Evidence: `app/api/emails/[messageId]/route.ts`, `lib/gmail.ts`, `types/email.ts`.
- Consumers: `components/EmailViewer.tsx`.

### `GET /api/emails/[messageId]/attachments/[attachmentId]`

- Purpose: Download a Gmail attachment.
- Request schema: path params `messageId`, `attachmentId`; query params `filename`, `mimeType`.
- Response schema: binary attachment response or `{ error }`.
- Auth requirement: Requires `auth()` session with `accessToken`; returns 401 if missing.
- Evidence: `app/api/emails/[messageId]/attachments/[attachmentId]/route.ts`.
- Consumers: `components/AttachmentList.tsx`.

### `POST /api/export/email`

- Purpose: Export one email as ZIP containing `email.pdf` and attachments.
- Request schema: `{ messageId: string }`.
- Response schema: `application/zip` or `{ error }`.
- Auth requirement: Requires `auth()` session with `accessToken`; returns 401 if missing.
- Evidence: `app/api/export/email/route.ts`, `lib/export.ts`.
- Consumers: `components/EmailViewer.tsx`.

### `POST /api/export/selected`

- Purpose: Export selected emails as a ZIP with per-email folders.
- Request schema: `{ messageIds: string[] }`, non-empty.
- Response schema: `application/zip` or `{ error }`.
- Auth requirement: Requires `auth()` session with `accessToken`; returns 401 if missing.
- Limits: `lib/export.ts` rejects more than 50 emails and cumulative export size over 250 MB.
- Evidence: `app/api/export/selected/route.ts`, `lib/export.ts`.
- Consumers: `components/ExportSelectedButton.tsx`.

## Server Actions

### `previewFilterAction(filter)`

- Purpose: Search Gmail with a structured filter and return up to 50 preview emails.
- Request schema: `EmailFilter` with optional `sender`, `subject`, `olderThanDays`, `hasAttachment`.
- Response schema: `{ ok: true, data: { totalMatches, emails } }` or `{ ok: false, error }`.
- Auth requirement: Requires `auth()` session with `accessToken`.
- Evidence: `app/actions/filter-actions.ts`, `lib/gmail.ts`, `types/filter.ts`.
- Consumer: `components/FilterBuilder.tsx` via `app/dashboard/page.tsx`.

### `archiveFilterAction(filter, emailIds)`

- Purpose: Legacy search-preview archive action, then refresh search results.
- Request schema: `EmailFilter`, `emailIds: string[]`.
- Response schema: same `FilterActionResult`.
- Auth requirement: Requires `auth()` session with `accessToken`.
- Evidence: `app/actions/filter-actions.ts`.
- Active use: Passed into `FilterBuilder` in `app/dashboard/page.tsx`, but `FilterBuilder` only destructures `onPreview`, so active UI usage is not proven.

### `deleteFilterAction(filter, emailIds)`

- Purpose: Legacy search-preview trash action, then refresh search results.
- Request schema: `EmailFilter`, `emailIds: string[]`.
- Response schema: same `FilterActionResult`.
- Auth requirement: Requires `auth()` session with `accessToken`.
- Evidence: `app/actions/filter-actions.ts`.
- Active use: Passed into `FilterBuilder` in `app/dashboard/page.tsx`, but `FilterBuilder` only destructures `onPreview`, so active UI usage is not proven.

### `executeBulkAction(input)`

- Purpose: Execute archive/delete in bulk through the executor.
- Request schema: `{ action: "archive" | "delete", emailIds: string[] }`.
- Response schema: `{ ok: true, result: ExecuteActionResult }` or `{ ok: false, error }`.
- Auth requirement: Requires `auth()` session with `accessToken`.
- Limits: 100 IDs for archive/delete.
- Evidence: `app/actions/execution-actions.ts`, `lib/executor/types.ts`.
- Consumer: `components/FilterPreview.tsx`.

### Inline dashboard actions

- Purpose: Delete/archive selected recent inbox emails from `EmailTable`.
- Request schema: `ids: string[]`.
- Response schema: `EmailActionResult` with `success`, `message`.
- Auth requirement: Requires `auth()` session with `accessToken`.
- Evidence: inline `deleteSelectedEmails` and `archiveSelectedEmails` in `app/dashboard/page.tsx`.
- Consumer: `components/EmailTable.tsx`.

