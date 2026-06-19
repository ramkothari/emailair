# Feature Inventory

Each feature lists **entry point**, **files**, **APIs**, **database entities**, and **status** based on repository evidence.

**Database entities:** N/A for all features — no application database exists (`package.json`, grep). External data = Gmail messages; local = browser storage for tasks.

**Status legend:**

- **Complete** — Implemented and wired to a user-facing route or flow
- **Partial** — Code exists but not fully integrated or has known defects
- **Stub** — Placeholder UI or deferred handler
- **Dev-only** — Test/playground routes

---

## 1. Google OAuth Authentication

| Field | Value |
|-------|-------|
| **Purpose** | Sign in with Google; obtain Gmail `access_token` for API calls |
| **Entry point** | `GET /` → `LoginButton`; `app/api/auth/[...nextauth]` |
| **Files** | `lib/auth.ts`, `components/LoginButton.tsx`, `app/page.tsx`, `types/next-auth.d.ts`, `app/api/auth/[...nextauth]/route.ts` |
| **APIs** | NextAuth `GET/POST` on `/api/auth/*` (framework convention) |
| **DB entities** | None (session/JWT only) |
| **Status** | **Complete** |

---

## 2. Protected Dashboard Shell

| Field | Value |
|-------|-------|
| **Purpose** | Restrict `/dashboard` to authenticated users |
| **Entry point** | `GET /dashboard` |
| **Files** | `app/dashboard/layout.tsx` |
| **APIs** | None |
| **Status** | **Complete** |

---

## 3. Recent Inbox Email List

| Field | Value |
|-------|-------|
| **Purpose** | Show up to 20 recent INBOX messages |
| **Entry point** | `GET /dashboard` |
| **Files** | `app/dashboard/page.tsx`, `lib/gmail.ts#getRecentEmails`, `components/EmailTable.tsx`, `types/email.ts` |
| **APIs** | None (server-side Gmail in page) |
| **Status** | **Complete** |

---

## 4. Inbox Bulk Archive / Delete (Recent Table)

| Field | Value |
|-------|-------|
| **Purpose** | Archive (remove INBOX label) or trash selected recent emails |
| **Entry point** | `EmailTable` buttons on dashboard |
| **Files** | `components/EmailTable.tsx`, inline server actions in `app/dashboard/page.tsx`, `lib/gmail.ts` |
| **APIs** | Server Actions (inline functions, not in `app/actions/`) |
| **Status** | **Complete** (direct Gmail, not executor) |

---

## 5. Filter Builder

| Field | Value |
|-------|-------|
| **Purpose** | Build Gmail search query from sender, subject, age, attachment flag |
| **Entry point** | Dashboard → `FilterBuilder` |
| **Files** | `components/FilterBuilder.tsx`, `types/filter.ts`, `lib/gmail.ts#buildGmailSearchQuery` (via search) |
| **APIs** | None until preview |
| **Status** | **Complete** for preview; **Partial** for archive/delete props (passed from dashboard but unused in `FilterBuilder` — only `onPreview` destructured, line 36 `components/FilterBuilder.tsx`) |

---

## 6. Filter Preview (Gmail Search Results)

| Field | Value |
|-------|-------|
| **Purpose** | Show up to 50 matching emails for a filter |
| **Entry point** | FilterBuilder → Preview → `previewFilterAction` |
| **Files** | `components/FilterBuilder.tsx`, `components/FilterPreview.tsx`, `app/actions/filter-actions.ts`, `lib/gmail.ts#searchEmails` |
| **APIs** | Server Action `previewFilterAction` |
| **Status** | **Complete** |

**Note:** `searchEmails` maps messages without `snippet` (`mapGmailMessageToEmail` in `lib/gmail.ts` lines 225–239), so AI metadata may have empty snippets in preview — **behavioral gap**.

---

## 7. Filter-Based Archive / Delete (Server Actions)

| Field | Value |
|-------|-------|
| **Purpose** | Archive/delete selected preview emails and refresh search |
| **Entry point** | Server actions wired on dashboard but **not** used by current `FilterBuilder` |
| **Files** | `app/actions/filter-actions.ts` (`archiveFilterAction`, `deleteFilterAction`) |
| **APIs** | Server Actions |
| **Status** | **Partial** — implemented; superseded in UI by executor path in `FilterPreview` |

---

## 8. Filter Preview Bulk Execution (Executor)

| Field | Value |
|-------|-------|
| **Purpose** | Batch archive/delete with retry, limits, confirmation modals |
| **Entry point** | `FilterPreview` → `executeBulkAction` |
| **Files** | `components/FilterPreview.tsx`, `components/ExecutionConfirmationModal.tsx`, `components/ExecutionResultModal.tsx`, `app/actions/execution-actions.ts`, `lib/executor/*`, `lib/gmail.ts` |
| **APIs** | Server Action `executeBulkAction` |
| **Status** | **Complete** (limit 100 emails, `EXECUTION_LIMIT` in `FilterPreview.tsx`) |

---

## 9. Email Analytics Dashboard

| Field | Value |
|-------|-------|
| **Purpose** | Overview, top senders, attachments, cleanup candidates from up to 200 inbox emails |
| **Entry point** | `GET /dashboard` |
| **Files** | `app/dashboard/page.tsx`, `lib/analytics.ts`, `components/AnalyticsOverview.tsx`, `TopSenders.tsx`, `AttachmentInsights.tsx`, `CleanupCandidates.tsx`, `types/analytics.ts` |
| **APIs** | None (server `getEmailAnalytics`) |
| **Status** | **Complete** |

---

## 10. AI Analysis (Search Results)

| Field | Value |
|-------|-------|
| **Purpose** | Themes, patterns, risk, summary for visible search metadata |
| **Entry point** | `FilterPreview` → `AIAnalysisCard` auto-fetch |
| **Files** | `components/AIAnalysisCard.tsx`, `components/AIRiskBadge.tsx`, `AIEmailBreakdown.tsx`, `AIWarningsList.tsx`, `app/api/ai/analyze-search/route.ts`, `lib/ai/*` |
| **APIs** | `POST /api/ai/analyze-search` |
| **Status** | **Complete** in filter preview path; **not** on dashboard root page |

---

## 11. AI Action Card (Decision Layer)

| Field | Value |
|-------|-------|
| **Purpose** | Show AI metrics and trigger archive/trash on full search result set |
| **Entry point** | `FilterPreview` after analysis completes |
| **Files** | `components/AIActionCard.tsx`, `components/FilterPreview.tsx` |
| **APIs** | Uses same analysis response; execution via `executeBulkAction` |
| **Status** | **Complete** (download button disabled — stub) |

---

## 12. Email Viewer

| Field | Value |
|-------|-------|
| **Purpose** | Full email body + attachments in modal |
| **Entry point** | `FilterPreview` → View |
| **Files** | `components/EmailViewer.tsx`, `components/AttachmentList.tsx`, `app/api/emails/[messageId]/route.ts`, `lib/gmail.ts#getEmailDetails` |
| **APIs** | `GET /api/emails/[messageId]` |
| **Status** | **Complete** |

---

## 13. Single Email Export (ZIP)

| Field | Value |
|-------|-------|
| **Purpose** | Export one email as ZIP (PDF + attachments) |
| **Entry point** | `EmailViewer` → Export Email |
| **Files** | `components/EmailViewer.tsx`, `app/api/export/email/route.ts`, `lib/export.ts` |
| **APIs** | `POST /api/export/email` |
| **Status** | **Complete** |

---

## 14. Multi-Email Export (ZIP)

| Field | Value |
|-------|-------|
| **Purpose** | Export selected message IDs as one ZIP |
| **Entry point** | `FilterPreview` → `ExportSelectedButton` |
| **Files** | `components/ExportSelectedButton.tsx`, `app/api/export/selected/route.ts`, `lib/export.ts` |
| **APIs** | `POST /api/export/selected` |
| **Status** | **Complete** (limits in `lib/export.ts`: max 50 emails, 250MB) |

---

## 15. Attachment Download

| Field | Value |
|-------|-------|
| **Purpose** | Download individual attachment binary |
| **Entry point** | `AttachmentList` links (component not fully traced here; uses API route) |
| **Files** | `app/api/emails/[messageId]/attachments/[attachmentId]/route.ts`, `lib/gmail.ts#getAttachment` |
| **APIs** | `GET /api/emails/:messageId/attachments/:attachmentId` |
| **Status** | **Complete** |

---

## 16. Universal AI Layer (Controllers + Providers)

| Field | Value |
|-------|-------|
| **Purpose** | Provider-agnostic LLM calls with validation |
| **Entry point** | Used by API routes and playground |
| **Files** | `lib/ai/**`, `types/ai.ts`, `PHASE_8_ARCHITECTURE.md` |
| **APIs** | Multiple (see AI endpoints) |
| **Status** | **Complete** (in-memory cache/rate limit per MVP design) |

---

## 17. AI Playground

| Field | Value |
|-------|-------|
| **Purpose** | Manual testing of `parseIntent`, `analyzeEmails`, `detectRisk`, `summarizeEmails` |
| **Entry point** | `GET /ai-playground` |
| **Files** | `app/ai-playground/page.tsx`, `lib/ai/index.ts` |
| **APIs** | Direct lib calls from client page |
| **Status** | **Dev-only** |

---

## 18. AI Test Page

| Field | Value |
|-------|-------|
| **Purpose** | Browser tests for AI HTTP endpoints |
| **Entry point** | `GET /test-ai` |
| **Files** | `app/test-ai/page.tsx` |
| **APIs** | `POST /api/ai/analyze-search`, `test-analyze`, `GET /api/ai/debug` |
| **Status** | **Dev-only** |

---

## 19. Bulk Executor Infrastructure

| Field | Value |
|-------|-------|
| **Purpose** | Reusable batch/retry engine for Gmail mutations |
| **Entry point** | `executeBulkAction` |
| **Files** | `lib/executor/*`, `app/actions/execution-actions.ts` |
| **Status** | **Complete** for archive/delete; **Stub** for download handler |

---

## 20. Sign Out

| Field | Value |
|-------|-------|
| **Purpose** | End session and redirect home |
| **Entry point** | Dashboard header form |
| **Files** | `app/dashboard/page.tsx` (`signOut`), `components/LogoutButton.tsx` (exists; dashboard uses inline form) |
| **Status** | **Complete** |

---

## 21. Error / Not Found Pages

| Field | Value |
|-------|-------|
| **Purpose** | Next.js error UI |
| **Files** | `app/error.tsx`, `app/not-found.tsx` |
| **Status** | **Complete** |

---

## Feature Coverage Matrix

| User-facing area | Route | Status |
|------------------|-------|--------|
| Login | `/` | Complete |
| Dashboard analytics | `/dashboard` | Complete |
| Dashboard recent inbox actions | `/dashboard` | Complete |
| Filter + AI + bulk ops | `/dashboard` (FilterPreview) | Complete |
| Tasks / automation | — | Not mounted |
| Playground | `/ai-playground` | Dev-only |
| AI tests | `/test-ai` | Dev-only |
