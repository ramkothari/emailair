# System Flows

End-to-end flows with file references. No database layer exists in any flow.

---

## Flow 1: Authentication & Dashboard Entry

```mermaid
sequenceDiagram
  participant User
  participant Home as app/page.tsx
  participant Auth as lib/auth.ts
  participant NextAuth as /api/auth/*
  participant Dash as app/dashboard/page.tsx

  User->>Home: GET /
  Home->>Auth: auth()
  alt session.user exists
    Home->>Dash: redirect /dashboard
  else not signed in
    User->>NextAuth: Connect Gmail (LoginButton)
    NextAuth->>Auth: Google OAuth
    Auth-->>Dash: session.accessToken
  end
  Dash->>Auth: auth()
  Note over Dash: layout.tsx already checked session.user
```

| Step | Component / file |
|------|------------------|
| Landing | `app/page.tsx` |
| Sign in | `components/LoginButton.tsx` → `signIn("google")` |
| OAuth config | `lib/auth.ts` |
| Handler | `app/api/auth/[...nextauth]/route.ts` |
| Guard | `app/dashboard/layout.tsx` |
| Dashboard load | `app/dashboard/page.tsx` |

---

## Flow 2: Load Dashboard Data (Server)

```mermaid
flowchart LR
  A[DashboardPage] --> B[getRecentEmails token 20]
  A --> C[getEmailAnalytics token 200]
  B --> D[lib/gmail.ts]
  C --> E[lib/analytics.ts]
  E --> D
  A --> F[Render analytics components]
  A --> G[FilterBuilder]
  A --> H[EmailTable]
```

| Data | Function | File |
|------|----------|------|
| Recent emails | `getRecentEmails` | `lib/gmail.ts` |
| Analytics | `getEmailAnalytics` (cached) | `lib/analytics.ts` |

---

## Flow 3: Filter Preview (Search)

```mermaid
sequenceDiagram
  participant User
  participant FB as FilterBuilder
  participant SA as previewFilterAction
  participant Gmail as lib/gmail.ts
  participant FP as FilterPreview

  User->>FB: Preview
  FB->>SA: previewFilterAction(filter)
  SA->>SA: auth()
  SA->>Gmail: searchEmails(token, filter, 50)
  Gmail-->>SA: totalMatches, emails
  SA-->>FB: FilterActionResult
  FB->>FP: render preview
```

**Files:** `components/FilterBuilder.tsx`, `app/actions/filter-actions.ts`, `lib/gmail.ts`, `components/FilterPreview.tsx`

---

## Flow 4: AI Analysis (Filter Preview)

```mermaid
sequenceDiagram
  participant FP as FilterPreview
  participant Card as AIAnalysisCard
  participant API as POST /api/ai/analyze-search
  participant AI as lib/ai/index.ts
  participant Ctrl as controllers
  participant LLM as Provider API

  FP->>Card: emails metadata max 100
  Card->>API: POST { emails }
  API->>API: slice 50, hash cache
  par parallel
    API->>AI: analyzeEmails(bodies)
    API->>AI: detectRisk(bodies)
    API->>AI: summarizeEmails(bodies)
  end
  AI->>Ctrl: cache, rate limit, prompt
  Ctrl->>LLM: provider.complete()
  LLM-->>Card: JSON validated results
  Card->>FP: onAnalysisComplete
  FP->>FP: AIActionCard
```

| Layer | File |
|-------|------|
| UI trigger | `components/AIAnalysisCard.tsx` (`useEffect` on signature) |
| API | `app/api/ai/analyze-search/route.ts` |
| Facade | `lib/ai/index.ts` |
| Controllers | `lib/ai/controllers/analysis-controller.ts`, `risk-controller.ts`, `summary-controller.ts` |
| Provider | `lib/ai/provider-factory.ts` → `lib/ai/providers/*.ts` |

**Auth:** API route does not call `auth()` — **UNKNOWN** if middleware protects it (no `middleware.ts` in repo).

---

## Flow 5: Bulk Archive/Delete (Filter Preview → Executor)

```mermaid
sequenceDiagram
  participant User
  participant FP as FilterPreview
  participant Modal as ExecutionConfirmationModal
  participant SA as executeBulkAction
  participant Ex as lib/executor/executor.ts
  participant H as handlers.ts
  participant Gmail as lib/gmail.ts

  User->>FP: Archive Selected / Trash
  FP->>Modal: confirm
  User->>Modal: Confirm
  FP->>SA: executeBulkAction({ action, emailIds })
  SA->>SA: auth(), limit 100
  SA->>Ex: executeAction(...)
  loop batches of 5
    Ex->>H: archive or delete handler
    H->>Gmail: archiveEmails or deleteEmails
  end
  Ex-->>FP: ExecuteActionResult
  FP->>FP: ExecutionResultModal, refresh preview
```

**Files:** `components/FilterPreview.tsx`, `app/actions/execution-actions.ts`, `lib/executor/executor.ts`, `lib/executor/handlers.ts`, `lib/gmail.ts`

---

## Flow 6: Recent Inbox Archive/Delete (Dashboard Table)

```mermaid
sequenceDiagram
  participant User
  participant ET as EmailTable
  participant SA as deleteSelectedEmails / archiveSelectedEmails
  participant Gmail as lib/gmail.ts

  User->>ET: Delete/Archive Selected
  ET->>SA: server action(ids)
  SA->>SA: auth()
  SA->>Gmail: deleteEmails or archiveEmails
  SA->>SA: revalidatePath("/dashboard")
  ET->>ET: router.refresh()
```

**Files:** `components/EmailTable.tsx`, `app/dashboard/page.tsx` (inline `"use server"` functions)

**Difference from Flow 5:** No executor, no confirmation modal, no batch retry.

---

## Flow 7: Email Viewer

```mermaid
flowchart LR
  User --> FP[FilterPreview View]
  FP --> EV[EmailViewer]
  EV --> API["GET /api/emails/:id"]
  API --> Auth[auth]
  API --> Gmail[getEmailDetails]
  EV --> UI[Render body + AttachmentList]
```

**Files:** `components/FilterPreview.tsx`, `components/EmailViewer.tsx`, `app/api/emails/[messageId]/route.ts`

---

## Flow 8: Export Single Email

```mermaid
flowchart LR
  User --> EV[EmailViewer]
  EV --> API["POST /api/export/email"]
  API --> Gmail[getEmailDetails + getAttachment]
  API --> Exp[lib/export.ts buildSingleEmailZip]
  API --> Blob[ZIP Response]
  EV --> Download[browser download]
```

---

## Flow 9: Export Selected Emails

```mermaid
flowchart LR
  User --> FP[FilterPreview]
  FP --> Btn[ExportSelectedButton]
  Btn --> API["POST /api/export/selected"]
  API --> Exp[buildMultipleEmailsZip]
```

---

## Flow 10: Analytics Computation

```mermaid
flowchart TB
  Dash[app/dashboard/page.tsx] --> GA[getEmailAnalytics]
  GA --> Fetch[fetchLatestAnalyticsEmails paginated INBOX]
  Fetch --> Gmail[Gmail API full messages]
  GA --> O[getOverviewStats]
  GA --> T[getTopSenders]
  GA --> A[getAttachmentStats]
  GA --> C[getCleanupCandidates]
  Dash --> Widgets[Analytics components]
```

Heuristics: promotions, LinkedIn, unread age, large attachments — `lib/analytics.ts`.

---

## Flow 11: AI Playground (Dev)

```
User → app/ai-playground/page.tsx
     → import { parseIntent, analyzeEmails, ... } from @/lib/ai
     → controllers → provider → LLM
```

No API route; direct library invocation from client component.

---

## Flow Summary Table

| # | Workflow | Mutation? | Auth check |
|---|----------|-----------|------------|
| 1 | Login | No | OAuth |
| 2 | Dashboard load | No | layout + page token check |
| 3 | Filter preview | No | Server action |
| 4 | AI analysis | No | **None on API route** |
| 5 | Bulk archive/delete (preview) | Yes | Server action |
| 6 | Inbox archive/delete | Yes | Inline server action |
| 7 | View email | No | API route |
| 8–9 | Export | No | API route |
| 10 | Analytics | No | Server page |
| 11 | Tasks | **Not wired** | N/A |
