# PROJECT_CONTEXT

## Product Overview
**What the product does**
- **Gmail Hygiene** is a Next.js web app that helps users clean up their inbox.
- Users authenticate with **Google OAuth** to obtain a **Gmail access token**.
- The app then enables:
  - Viewing recent inbox emails
  - Building a Gmail search filter and previewing matching emails
  - **Archiving** (removing `INBOX` label) or **deleting** (moving to Trash) selected emails
  - Displaying Gmail-derived **analytics** and heuristic **cleanup candidates**
  - (Phase 8) Running **AI analysis** (themes/patterns/suggestions, risk assessment, summary) over the **metadata/snippets** of the currently visible email search results

**Main user workflow**
1. Open `/`:
   - If not authenticated: shows `LoginButton`.
   - If authenticated: redirects to `/dashboard`.
2. Open `/dashboard`:
   - Loads recent inbox emails (`lib/gmail.ts#getRecentEmails`).
   - Loads analytics (`lib/analytics.ts#getEmailAnalytics`).
   - Lets user build a filter and preview (`app/actions/filter-actions.ts#previewFilterAction` → `lib/gmail.ts#searchEmails`).
   - Lets user archive/delete selected emails (`archiveFilterAction`/`deleteFilterAction` → `lib/gmail.ts#archiveEmails`/`deleteEmails`), then refreshes dashboard via `revalidatePath("/dashboard")`.
3. (Phase 8) AI analysis:
   - `components/AIAnalysisCard.tsx` auto-posts the visible email metadata to `POST /api/ai/analyze-search`.
   - UI renders AI summary/risk/warnings from the API response.

**Current project status**
- Core Gmail UX is implemented:
  - Auth + protected dashboard + inbox listing + filter preview + archive/delete + export endpoints.
- Phase 8 AI analysis layer and UI/API exist:
  - `lib/ai/*` (controllers/providers/prompts) and `app/api/ai/analyze-search/route.ts`.
  - `components/AIAnalysisCard.tsx` triggers the analysis API.
- **Task automation integration (Phase 8.3)** is described as “Later” in docs (`PHASE_8_ARCHITECTURE.md`), and some type-check issues exist in task-related components (observed during `npm run type-check`).

---

## Current Features

### 1) Google OAuth Authentication (NextAuth)
- **Purpose**: Authenticate users and obtain a Gmail OAuth access token.
- **Key files**
  - `lib/auth.ts`
  - `app/page.tsx` (redirect behavior)
  - `app/dashboard/layout.tsx` (route protection)
- **Important components**
  - `components/LoginButton.tsx` (not opened in this session, but used by `app/page.tsx`)
- **Important routes**
  - NextAuth handler route is under `app/api/auth/[...nextauth]/` (configured by `NextAuth` in `lib/auth.ts`)

### 2) Protected Dashboard
- **Purpose**: Show dashboard UI only for authenticated users.
- **Key files**
  - `app/dashboard/layout.tsx`
  - `app/dashboard/page.tsx`
- **Important routes**
  - `/dashboard`

### 3) Recent Inbox Emails (INBOX listing)
- **Purpose**: Load and render recent inbox emails on dashboard.
- **Key files**
  - `lib/gmail.ts#getRecentEmails`
  - `app/dashboard/page.tsx` (calls `getRecentEmails(accessToken, 20)`)
- **Important components**
  - `components/EmailTable.tsx` (renders selectable rows)

### 4) Filter Builder + Preview
- **Purpose**: Let user build Gmail search query via structured fields, then preview matches.
- **Key files**
  - `components/FilterBuilder.tsx`
  - `app/actions/filter-actions.ts#previewFilterAction`
  - `lib/gmail.ts#searchEmails`
  - `types/filter.ts` (EmailFilter shape; used by FilterBuilder)
- **Important components**
  - `components/FilterPreview.tsx` (render preview results; used by FilterBuilder)
- **Important routes/services**
  - Server Actions (not REST routes):
    - `previewFilterAction(filter)` in `app/actions/filter-actions.ts`

### 5) Archive Selected Emails
- **Purpose**: Move messages out of Inbox by removing `INBOX` label.
- **Key files**
  - `components/EmailTable.tsx` (calls `onArchiveSelected(ids)`)
  - `app/actions/filter-actions.ts#archiveFilterAction`
  - `lib/gmail.ts#archiveEmails`
- **Important services/functions**
  - `archiveEmails(accessToken, ids)` → `gmail.users.messages.modify(... removeLabelIds: ["INBOX"])`

### 6) Delete Selected Emails (Trash)
- **Purpose**: Move messages to Trash.
- **Key files**
  - `components/EmailTable.tsx` (calls `onDeleteSelected(ids)`)
  - `app/actions/filter-actions.ts#deleteFilterAction`
  - `lib/gmail.ts#deleteEmails`
- **Important services/functions**
  - `deleteEmails(accessToken, ids)` → `gmail.users.messages.trash(...)`

### 7) Dashboard Analytics + Cleanup Candidates (heuristics)
- **Purpose**: Provide overview stats and candidate cleanup recommendations using Gmail metadata and label heuristics.
- **Key files**
  - `lib/analytics.ts#getEmailAnalytics`
  - `app/dashboard/page.tsx`
- **Important components**
  - `components/AnalyticsOverview.tsx`
  - `components/TopSenders.tsx`
  - `components/AttachmentInsights.tsx`
  - `components/CleanupCandidates.tsx`
- **Important services/functions**
  - `getOverviewStats`, `getTopSenders`, `getAttachmentStats`, `getCleanupCandidates`

### 8) Phase 8 AI Analysis Card (AI over email search results)
- **Purpose**: Analyze email metadata/snippets to produce:
  - Themes/patterns/suggestions/summary
  - Risk assessment (riskLevel, riskScore, safe, concerns, recommendation)
  - Key summary for quick review
- **Key files**
  - `components/AIAnalysisCard.tsx`
  - `app/api/ai/analyze-search/route.ts`
  - `lib/ai/index.ts`
  - `lib/ai/controllers/*`
  - `lib/ai/prompts.ts`
  - `lib/ai/provider-factory.ts`
  - `lib/ai/controller-utils.ts`
- **Important routes**
  - `POST /api/ai/analyze-search`
- **Important components**
  - `components/AIRiskBadge.tsx`
  - `components/AIEmailBreakdown.tsx`
  - `components/AIWarningsList.tsx`

### 9) AI Playground and Phase 8 API Test UI
- **Purpose**: Manually test AI controllers and the analysis endpoint.
- **Key files**
  - `app/ai-playground/page.tsx` (client UI for parseIntent/analyze/risk/summarize)
  - `app/test-ai/page.tsx` (client tests of `/api/ai/analyze-search`, `/api/ai/test-analyze`, `/api/ai/debug`)

### 10) Bulk Execution Engine (executor)
- **Purpose**: Batch execution with retry and progress reporting for actions like archive/delete.
- **Key files**
  - `app/actions/execution-actions.ts` → `executeBulkAction(input)`
  - `lib/executor/executor.ts` → `executeAction(...)` (core batching/retry)
  - `lib/executor/handlers.ts` → action handlers for archive/delete/download
- **Status**
  - Implemented infrastructure; UI wiring for “tasks” vs executor usage is not fully proven in evidence.

---

## Current Architecture

### Frontend architecture
- **Next.js App Router** with a mix of server and client components.
- Client components use `"use client"` and manage local UI state.

**Evidence**
- `app/page.tsx` is an async server component (uses `auth()` and `redirect`)
- `app/dashboard/page.tsx` is an async server component
- `components/FilterBuilder.tsx`, `components/EmailTable.tsx`, `components/AIAnalysisCard.tsx` are client components with local state and effects.

### Backend architecture
- No separate backend service; backend logic lives in:
  - **Server Actions** under `app/actions/*` for Gmail filtering/mutations.
  - **API Routes** under `app/api/*` for:
    - AI analysis (`app/api/ai/analyze-search/route.ts`, etc.)
    - Email detail and attachments
    - Export endpoints

**Evidence**
- `app/actions/filter-actions.ts` uses `"use server"`
- `app/api/ai/analyze-search/route.ts` exports `POST(...)`

### Authentication flow
- Implemented using **NextAuth** with Google provider.
- Access token is attached to `session.accessToken` via callbacks.

**Evidence**
- `lib/auth.ts`:
  - `jwt` callback sets `token.accessToken = account.access_token`
  - `session` callback sets `session.accessToken = token.accessToken`

- Protected route:
  - `app/dashboard/layout.tsx` calls `auth()` and redirects to `/` if no user.

### Gmail integration flow
- Auth gives `accessToken`.
- Gmail operations use `googleapis` OAuth2 client.

**Evidence**
- `lib/gmail.ts`:
  - `getGmailClient(accessToken)` uses `google.auth.OAuth2` with `access_token`.
  - `getRecentEmails()` lists messages using `gmail.users.messages.list({ labelIds: ["INBOX"] })` then fetches metadata with `users.messages.get`.

### Analytics flow
- `app/dashboard/page.tsx` calls `getEmailAnalytics(session.accessToken, 200)`.
- `lib/analytics.ts` uses `react` `cache()` wrapper around an async Gmail metadata collector.

**Evidence**
- `lib/analytics.ts#getEmailAnalytics = cache(async (...) => { ... })`
- It fetches messages, computes overview/top senders/attachment stats/cleanup candidates.

### AI analysis flow
- UI: `components/AIAnalysisCard.tsx`
  - Computes a signature from email metadata
  - Calls `POST /api/ai/analyze-search` with `{ emails }`
- API route:
  - `app/api/ai/analyze-search/route.ts` hashes input emails and caches result for 1 hour (in-memory)
  - Converts metadata to prompt bodies
  - Runs `analyzeEmails`, `detectRisk`, `summarizeEmails` concurrently.

- AI layer:
  - `lib/ai/index.ts` exposes public functions:
    - `parseIntent`, `analyzeEmails`, `detectRisk`, `summarizeEmails`
  - Each controller:
    - has its own in-memory cache and rate-limiter
    - calls provider via `ProviderFactory.getProvider()`
    - extracts JSON from provider text (`extractJsonFromText`)
    - validates output (`validate*Result`)
    - returns typed results

**Evidence**
- `components/AIAnalysisCard.tsx` fetches `/api/ai/analyze-search`
- `app/api/ai/analyze-search/route.ts` uses `createHash("sha256")` and `Promise.all`
- `lib/ai/controllers/*-controller.ts` uses `Map` caches + rate-limit maps and calls `extractJsonFromText` and `validate*Result`
- `lib/ai/prompts.ts` defines JSON-only prompt templates.

### Bulk execution flow
- Server action `executeBulkAction` enforces selection limits.
- It calls executor core:
  - batches
  - retries
  - aggregates success/failure IDs
- Handlers call Gmail mutations.

**Evidence**
- `app/actions/execution-actions.ts`
- `lib/executor/executor.ts`
- `lib/executor/handlers.ts` (archive/delete implemented; download throws deferred error)

---

## Repository Structure

Tree (high-level):
- `app/`
  - `dashboard/` (dashboard UI)
  - `actions/` (server actions)
  - `api/` (API routes)
  - `ai-playground/`, `test-ai/`
- `components/`
  - UI: `EmailTable`, `FilterBuilder`, AI components
- `lib/`
  - Services: `gmail`, `analytics`, `export`, `executor`, `ai`
- `types/`
  - Type definitions shared across UI and services
- `tests/`
  - API tests

Important files (purpose + dependencies + related files)
- `lib/auth.ts`
  - NextAuth Google provider configuration
  - Related: `app/page.tsx`, `app/dashboard/layout.tsx`, server actions using `auth()`
- `lib/gmail.ts`
  - Gmail API calls via `googleapis`
  - Related: `app/actions/filter-actions.ts`, `app/api/emails/*`, `lib/analytics.ts`, `lib/executor/handlers.ts`
- `lib/analytics.ts`
  - Fetch Gmail metadata and compute heuristic analytics
  - Related: `app/dashboard/page.tsx`
- `lib/ai/*`
  - AI abstraction: providers/controllers/prompts/validation
  - Related: `components/AIAnalysisCard.tsx`, `app/api/ai/analyze-search/route.ts`
- `lib/executor/*`
  - Batch/retry orchestration for archive/delete actions
  - Related: `app/actions/execution-actions.ts`, `lib/executor/handlers.ts`

---

## Route Map

### Pages (App Router)
- `GET /` (`app/page.tsx`)
  - Purpose: login landing page + redirect authenticated users to `/dashboard`
  - Components: `components/LoginButton.tsx`
  - Services: `lib/auth.ts#auth()`

- `GET /dashboard` (`app/dashboard/page.tsx`)
  - Purpose: dashboard UI (emails, analytics, filter builder, table)
  - Components: `FilterBuilder`, `EmailTable`, analytics widgets, and AIAnalysisCard (composition inferred; file likely includes AI card)
  - Services:
    - `lib/gmail.ts#getRecentEmails`
    - `lib/analytics.ts#getEmailAnalytics`
  - Actions/Mutations:
    - `previewFilterAction`, `archiveFilterAction`, `deleteFilterAction` from `app/actions/filter-actions.ts`

- `GET /ai-playground` (`app/ai-playground/page.tsx`)
  - Purpose: manual UI to test AI controllers from the browser
  - Services: `lib/ai/index.ts`

- `GET /test-ai` (`app/test-ai/page.tsx`)
  - Purpose: button-driven browser tests of AI endpoints (`/api/ai/analyze-search`, `/api/ai/test-analyze`, `/api/ai/debug`)
  - Services: AI endpoints only

### API Routes
- `POST /api/ai/analyze-search` (`app/api/ai/analyze-search/route.ts`)
  - Purpose: run AI analysis/risk/summary over provided email metadata snippets
  - Components: none (API route)
  - Services:
    - `lib/ai/index.ts` methods:
      - `analyzeEmails`, `detectRisk`, `summarizeEmails`
    - In-memory caching in this route
  - Auth requirement: **unknown** from opened code (no `auth()` in this file).

- `POST /api/ai/test-analyze` (`app/api/ai/test-analyze/route.ts`)
  - Purpose: debugging endpoint for AI controller
  - Services: `lib/ai/index.ts#analyzeEmails`
  - Auth requirement: **unknown** from evidence (no auth checks reviewed here).

- `GET /api/ai/debug` (`app/api/ai/debug/route.ts`)
  - Purpose: provider configuration debugging (route exists; not opened in evidence session)

- `GET /api/emails/[messageId]` (`app/api/emails/[messageId]/route.ts`)
  - Purpose: email details (sender/recipient/subject/body/attachments metadata)
  - Services: `lib/gmail.ts#getEmailDetails`
  - Auth requirement: **required** per reference doc evidence.

- `GET /api/emails/[messageId]/attachments/[attachmentId]` (`app/api/emails/[messageId]/attachments/[attachmentId]/route.ts`)
  - Purpose: download an attachment binary
  - Services: `lib/gmail.ts#getAttachment`
  - Auth requirement: **required** per reference doc evidence.

- `POST /api/export/selected` (`app/api/export/selected/route.ts`)
  - Purpose: export multiple emails to ZIP (PDF + attachments)
  - Services:
    - `lib/gmail.ts#getEmailDetails`, `lib/gmail.ts#getAttachment`
    - `lib/export.ts#buildMultipleEmailsZip`
  - Auth requirement: **required** per reference doc evidence.

- `POST /api/export/email` (`app/api/export/email/route.ts`)
  - Purpose: export one email to ZIP
  - Services:
    - `lib/gmail.ts#getEmailDetails`, `lib/gmail.ts#getAttachment`
    - `lib/export.ts#buildSingleEmailZip`
  - Auth requirement: **required** per reference doc evidence.

---

## Component Map

Major components (purpose/props/state/dependencies)
- `components/FilterBuilder.tsx`
  - Purpose: build Gmail query filters and request preview
  - Props:
    - `onPreview(filter): Promise<FilterActionResult>`
    - `onArchive(filter, emailIds)`
    - `onDelete(filter, emailIds)`
  - State:
    - sender, subject, olderThanDays, hasAttachment
    - preview + previewFilter
    - error/message and pending state (`useTransition`)
  - Dependencies:
    - `types/filter.ts` (`EmailFilter`)
    - `components/FilterPreview.tsx` for rendering preview

- `components/EmailTable.tsx`
  - Purpose: list emails with selection and archive/delete actions
  - Props:
    - `emails: Email[]`
    - `onDeleteSelected(ids): Promise<EmailActionResult>`
    - `onArchiveSelected(ids): Promise<EmailActionResult>`
  - State:
    - selectedIds, message, isPending
  - Dependencies:
    - `useRouter` for `router.refresh()`

- `components/AIAnalysisCard.tsx`
  - Purpose: render AI output for a set of visible email metadata
  - Props:
    - `emails: EmailMetadata[]`
    - `onAnalysisComplete?`
  - State:
    - result (typed response), isAnalyzing, error
  - Dependencies:
    - POST `/api/ai/analyze-search`
    - Uses subcomponents:
      - `AIRiskBadge`, `AIEmailBreakdown`, `AIWarningsList`

- `components/RunTaskModal.tsx` and `components/TaskImpactSummary.tsx`
  - Purpose: task automation UI (Phase 8.3)
  - Evidence note: these were involved in TypeScript errors during `tsc` run; exact behavior not verified here.
  - Files exist: `components/RunTaskModal.tsx`, `components/TaskImpactSummary.tsx`

---

## Service Map

### Gmail service (`lib/gmail.ts`)
Main functions:
- `getRecentEmails(accessToken, limit?)`
- `searchEmails(accessToken, filter, limit?)`
- `archiveEmails(accessToken, ids)`
- `deleteEmails(accessToken, ids)`
- `getEmailDetails(accessToken, messageId)`
- `getAttachment(accessToken, messageId, attachmentId)`
- `getGmailClient(accessToken)`

### Analytics service (`lib/analytics.ts`)
Main function:
- `getEmailAnalytics(accessToken, limit?)` (cached via `react/cache`)
Helper functions:
- `getOverviewStats`
- `getTopSenders`
- `getAttachmentStats`
- `getCleanupCandidates`

### AI services (`lib/ai/*`)
Public facade:
- `lib/ai/index.ts`:
  - `parseIntent(prompt)`
  - `analyzeEmails(emailBodies)`
  - `detectRisk(emailBodies)`
  - `summarizeEmails(emailBodies)`

Controllers:
- `lib/ai/controllers/intent-controller.ts`
- `lib/ai/controllers/analysis-controller.ts`
- `lib/ai/controllers/risk-controller.ts`
- `lib/ai/controllers/summary-controller.ts`

Utilities:
- `lib/ai/controller-utils.ts`
  - `extractJsonFromText(text)`
  - `validateIntentResult`, `validateAnalysisResult`, `validateRiskResult`, `validateSummaryResult`

Provider selection:
- `lib/ai/provider-factory.ts`
  - `ProviderFactory.getProvider()`
  - selects based on `process.env.AI_PROVIDER`

Prompt templates:
- `lib/ai/prompts.ts`
  - `createIntentPrompt`, `createAnalysisPrompt`, `createRiskPrompt`, `createSummaryPrompt`

### Executor services (`lib/executor/*`)
Core:
- `lib/executor/executor.ts#executeAction(...)`
- `lib/executor/handlers.ts` dispatches to:
  - `archiveEmails(...)`
  - `deleteEmails(...)`
  - `downloadHandler` throws deferred error
Wrapper:
- `app/actions/execution-actions.ts#executeBulkAction(...)`

### Authentication services (`lib/auth.ts`)
- Exports `handlers, auth, signIn, signOut` from NextAuth instance
- Session includes `session.accessToken`

---

## Data Flow

### Email search (filter preview)
User
→ UI: `components/FilterBuilder.tsx`
→ API/Server: `app/actions/filter-actions.ts#previewFilterAction(filter)`
→ Service: `lib/gmail.ts#searchEmails(accessToken, filter, 50)`
→ Response: `FilterActionResult` with:
- `totalMatches`
- `emails: Email[]`
→ UI: `components/FilterPreview.tsx` (renders preview)

### AI analysis
User
→ UI: `components/AIAnalysisCard.tsx` (auto-trigger on `emails` signature change)
→ API: `POST /api/ai/analyze-search` with `{ emails: EmailMetadata[] }`
→ Services:
- Route-level hashing + in-memory cache TTL
- Calls:
  - `lib/ai#index.ts#analyzeEmails`
  - `lib/ai#index.ts#detectRisk`
  - `lib/ai#index.ts#summarizeEmails`
→ AI Controllers:
- cache + rate-limit in-memory
- provider.complete(prompt)
- extractJsonFromText
- validate*Result
→ Response: `{ analysis, risk, summary, analyzedCount, totalProvided, analyzedAt, cached }`
→ UI: renders summary/risk/warnings subcomponents

### Bulk delete
User
→ UI: `components/EmailTable.tsx` selection + Delete Selected button
→ Server Action: `app/actions/filter-actions.ts#deleteFilterAction(filter, emailIds)`
→ Service: `lib/gmail.ts#deleteEmails(accessToken, ids)`
→ Next: `revalidatePath("/dashboard")`
→ UI refresh

### Bulk archive
User
→ UI: `components/EmailTable.tsx` selection + Archive Selected button
→ Server Action: `app/actions/filter-actions.ts#archiveFilterAction(filter, emailIds)`
→ Service: `lib/gmail.ts#archiveEmails(accessToken, ids)`
→ Next: `revalidatePath("/dashboard")`
→ UI refresh

---

## AI System

### AI providers
Supported providers in `lib/ai/provider-factory.ts`:
- `openai`
- `grok`
- `gemini`
- `deepseek`
- `claude`

Evidence:
- `ProviderFactory.getProvider()` selects provider based on `process.env.AI_PROVIDER`
- provider instantiations:
  - `OpenAIProvider`, `GrokProvider`, `GeminiProvider`, `DeepSeekProvider`, `ClaudeProvider`

### Models
Mapped in `ProviderFactory.getModel(provider)`:
- openai: `gpt-4-turbo`
- grok: `llama-3.3-70b-versatile`
- gemini: `gemini-2.0-flash`
- deepseek: `deepseek-chat`
- claude: `claude-3-5-sonnet-20241022`

### Prompt flow
Prompt templates are centralized in `lib/ai/prompts.ts`:
- `createIntentPrompt(userInput)`
- `createAnalysisPrompt(emailBodies)`
- `createRiskPrompt(emailBodies)`
- `createSummaryPrompt(emailBodies)`

Controllers call:
- `const prompt = create*Prompt(emailBodies)`
- `const rawText = await provider.complete(prompt)`

### Analysis flow
- Endpoint: `POST /api/ai/analyze-search`
- Route converts metadata → bodies:
  - `From: ${email.sender}\nSubject: ${email.subject}\n\n${email.snippet}`
- Calls in parallel:
  - `lib/ai/controllers/analysis-controller.ts#analyzeEmails` (themes/patterns/suggestions/summary)

### Risk flow
- Same endpoint calls:
  - `lib/ai/controllers/risk-controller.ts#detectRisk`
- Validated by `validateRiskResult` in `lib/ai/controller-utils.ts`.

### Summary flow
- Same endpoint calls:
  - `lib/ai/controllers/summary-controller.ts#summarizeEmails`
- Validated by `validateSummaryResult` in `lib/ai/controller-utils.ts`.

### Context limits (known/observed)
- Known from code evidence:
  - `app/api/ai/analyze-search/route.ts` truncates to:
    - `MAX_EMAILS_TO_ANALYZE = 50`
- Unknown:
  - Provider-specific token/context truncation is not confirmed from this evidence set.
  - No explicit token budgeting logic is shown in opened prompt/controller files.

---

## Current Limitations
1) **In-memory caches** for AI
- AI controllers and analyze-search route use `Map` caches and TTL.
- Evidence: multiple `new Map()` in controllers and route.

2) **In-memory rate limiting** for AI
- Controllers implement `rateLimitMap` with window + max calls.
- Evidence: `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` in controllers.

3) **No centralized/distributed caching**
- TODOs indicate future Redis:
  - “TODO: Redis Later” in AI controllers
  - “MVP only” in `PHASE_8_ARCHITECTURE.md`

4) **AI endpoint auth coverage is unclear**
- `app/api/ai/analyze-search/route.ts` as opened does not show `auth()` checks.
- Therefore security requirements across all AI routes are **unknown** based on evidence alone.

5) **Type-check failures exist (task-related)**
- `npm run type-check` reported TS errors in:
  - `components/RunTaskModal.tsx`
  - `components/TaskImpactSummary.tsx`
  - `lib/task-preview.ts`
- This suggests parts of the task automation UI may be out of sync with types.

6) **Missing automation**
- AI-to-action/task integration described as “Phase 8.3 later”:
  - `PHASE_8_ARCHITECTURE.md` says tasker integration is not yet connected.

---

## Upcoming Work
**Next planned phase: Phase 10.1 — Dashboard Split**
- Target routes:
  - `/dashboard/analytics`
  - `/dashboard/search`
  - `/dashboard/automation`
- Requirements (from Phase plan context):
  - No business logic changes
  - No Gmail changes
  - No AI changes
  - Existing functionality must continue working
- Likely affected files (by role, not implementation):
  - `app/dashboard/page.tsx` (currently consolidates analytics, filter builder, email table)
  - Possibly components that are used in analytics/search/automation sections:
    - `components/AnalyticsOverview.tsx`, `TopSenders.tsx`, `AttachmentInsights.tsx`, `CleanupCandidates.tsx`
    - `components/FilterBuilder.tsx`, `components/EmailTable.tsx`
    - automation/task components (e.g., `RunTaskModal.tsx`, `TaskImpactSummary.tsx`) if referenced by `/dashboard/automation` (not verified)

---

## Critical Files (Read These Files First)

1. `app/dashboard/page.tsx`
   - Center of current user experience: loads emails, analytics, renders filter + table.
2. `app/dashboard/layout.tsx`
   - Route protection; establishes auth boundary for dashboard.
3. `lib/auth.ts`
   - NextAuth configuration and access token handling.
4. `lib/gmail.ts`
   - Gmail API logic: list/search/mutate/export/details/attachments.
5. `app/actions/filter-actions.ts`
   - Server actions for preview/archive/delete; the mutation entry point.
6. `components/FilterBuilder.tsx`
   - Frontend filter construction and preview triggers.
7. `components/EmailTable.tsx`
   - Email selection UI and archive/delete triggers.
8. `lib/analytics.ts`
   - Analytics extraction and cleanup candidate heuristic.
9. `components/AIAnalysisCard.tsx`
   - AI auto-trigger UI and rendering.
10. `app/api/ai/analyze-search/route.ts`
   - AI analysis endpoint orchestration, caching, and parallel pipelines.
11. `lib/ai/index.ts`
   - AI public interface used by API route and playground.
12. `lib/ai/provider-factory.ts`
   - Provider selection and model/API key mapping.
13. `lib/ai/controllers/analysis-controller.ts`
   - AI analysis controller: cache/rate limit/parse/validate.
14. `lib/ai/controllers/risk-controller.ts`
   - AI risk controller: cache/rate limit/parse/validate.
15. `lib/ai/controllers/summary-controller.ts`
   - AI summary controller: cache/rate limit/parse/validate.
16. `lib/ai/controller-utils.ts`
   - JSON extraction + runtime type validation.
17. `lib/ai/prompts.ts`
   - Prompt architecture: JSON-only responses.
18. `lib/executor/executor.ts`
   - Bulk/batch execution core logic.
19. `lib/executor/handlers.ts`
   - Action-specific execution (archive/delete/download).
20. `app/actions/execution-actions.ts`
   - Server action entry point for bulk execution.

---

## Unknowns (Things I Do Not Know Yet)
- **AI endpoint authentication requirements**
  - For `POST /api/ai/analyze-search`, `POST /api/ai/test-analyze`, and `GET /api/ai/debug`, auth guards are not verified from evidence set opened so far. Only dashboard auth is verified.

- **Where AIAnalysisCard is composed**
  - It is known the component exists and triggers analyze-search, but the exact placement within the dashboard/search results composition is not fully evidenced in opened files.

- **Task automation (Phase 8.3) wiring**
  - Type-check failures indicate task-related UI is present but not consistent.
  - Whether and how AI recommendations drive task execution remains unproven.

- **Provider implementation details**
  - `lib/ai/providers/*` were not opened in the evidence set. Token/context truncation, retry behavior, and error mapping are unknown.

- **Confirmation layer for mutations**
  - Components for confirmation exist in `components/ExecutionConfirmationModal.tsx` etc., but the end-to-end UI flow that uses them was not verified.

- **Exact AI context limits**
  - Aside from truncation to max 50 emails in the analyze-search route, provider-level context management is unknown.
