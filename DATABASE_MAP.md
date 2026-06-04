# Database Map

## Database

No server-side database is proven from repository.

Evidence:

- `package.json` contains no Prisma, Drizzle, Mongoose, Supabase, Firebase, SQLite, Postgres, MySQL, Redis, or Stripe dependency.
- Repository source uses Gmail as the system of record for email data. Evidence: `lib/gmail.ts`, `lib/analytics.ts`.
- Browser task persistence uses `window.localStorage`. Evidence: `lib/tasks/task-storage.ts`.
- AI caches/rate limiters use process-local `Map`. Evidence: `lib/ai/controllers/*.ts`, `app/api/ai/analyze-search/route.ts`.

## Tables

Not proven from repository.

## Relationships

No relational schema is proven from repository.

Runtime entity relationships inferred from TypeScript types:

- A Google-authenticated session includes an `accessToken` used to access Gmail. Evidence: `types/next-auth.d.ts`, `lib/auth.ts`.
- An `EmailDetails` has many `Attachment` records in memory after Gmail fetch. Evidence: `types/email.ts`, `lib/gmail.ts`.
- A browser-local `Task` has `id`, `name`, `query`, `action`, timestamps. Evidence: `lib/tasks/task-types.ts`.
- A `TaskRunResult` includes task metadata, matching emails, analysis, risk, and summary. Evidence: `types/task-preview.ts`.

## Data Lifecycle

### Gmail Email Data

1. OAuth access token is stored on the NextAuth JWT/session. Evidence: `lib/auth.ts`.
2. Dashboard fetches latest inbox messages with `getRecentEmails()`. Evidence: `app/dashboard/page.tsx`, `lib/gmail.ts`.
3. Search preview calls Gmail `users.messages.list` with `q`. Evidence: `app/actions/filter-actions.ts`, `lib/gmail.ts`.
4. Message details and attachments are fetched on demand. Evidence: `app/api/emails/[messageId]/route.ts`, `app/api/emails/[messageId]/attachments/[attachmentId]/route.ts`.
5. Archive removes `INBOX` label; delete moves messages to Trash. Evidence: `archiveEmails()` and `deleteEmails()` in `lib/gmail.ts`.

### Browser Task Data

1. Tasks are created through `saveTask()`. Evidence: `lib/tasks/task-storage.ts`, `components/CreateTaskModal.tsx`.
2. Tasks are serialized to `localStorage` key `email-cleaner-tasks`. Evidence: `TASK_STORAGE_KEY` in `lib/tasks/task-types.ts`.
3. Tasks can be read, updated, and deleted in browser storage. Evidence: `lib/tasks/task-storage.ts`.
4. Active route integration is not proven from repository.

### AI Cache Data

1. `/api/ai/analyze-search` hashes email metadata and stores complete response in module-level `Map` for 1 hour. Evidence: `app/api/ai/analyze-search/route.ts`.
2. Individual controllers use module-level `Map` caches and rate-limit maps. Evidence: `lib/ai/controllers/analysis-controller.ts`, `summary-controller.ts`, `risk-controller.ts`, `intent-controller.ts`.
3. Distributed persistence is not implemented; TODO comments mention Redis later. Evidence: `lib/ai/controllers/*.ts`.

## Critical Entities

| Entity | Shape | Storage | Evidence |
|---|---|---|---|
| Session access token | `session.accessToken?: string` | NextAuth JWT/session | `types/next-auth.d.ts`, `lib/auth.ts` |
| Email | `id`, `sender`, `subject`, `date`, optional `snippet` | Gmail API response mapped in memory | `types/email.ts`, `lib/gmail.ts` |
| EmailDetails | Email metadata, `body`, `attachments` | Gmail API response mapped in memory | `types/email.ts`, `lib/gmail.ts` |
| Attachment | `attachmentId`, `filename`, `mimeType`, `size` | Gmail API response mapped in memory | `types/email.ts`, `lib/gmail.ts` |
| EmailFilter | `sender`, `subject`, `olderThanDays`, `hasAttachment` | Component state/server action input | `types/filter.ts`, `components/FilterBuilder.tsx` |
| AI result | analysis/risk/summary objects | In-memory response state/cache | `types/ai.ts`, `components/AIAnalysisCard.tsx`, `lib/ai/controllers/*.ts` |
| Task | `id`, `name`, `query`, `action`, timestamps | Browser `localStorage` | `lib/tasks/task-types.ts`, `lib/tasks/task-storage.ts` |

