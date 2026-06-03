# UI_ARCHITECTURE

## 1. Dashboard Composition (actual composition from code)

### Entry point: `app/dashboard/page.tsx`

Dashboard page renders these top-level sections:

Dashboard (`/dashboard`)
├─ `<header>` (inline in `app/dashboard/page.tsx`)
│  ├─ App title + signed-in email (`session.user?.email`)
│  └─ Sign out form calling server action
│     └─ `signOut({ redirectTo: "/" })` via `lib/auth`
│
├─ `<main>` (`app/dashboard/page.tsx`, `space-y-6`)
│  ├─ Analytics section (`<section className="mb-8 space-y-6">`)
│  │  ├─ If `analyticsError`: render error box (inline)
│  │  └─ Else if `analytics`: render (fragment)
│  │     ├─ `<AnalyticsOverview stats={analytics.overview} ... />`
│  │     ├─ `<TopSenders senders={analytics.topSenders} />`
│  │     ├─ `<AttachmentInsights stats={analytics.attachmentStats} />`
│  │     └─ `<CleanupCandidates candidates={analytics.cleanupCandidates} />`
│  │
│  ├─ Filter/Search section:
│  │  └─ `<FilterBuilder onPreview onArchive onDelete />`
│  │     ├─ `onPreview` prop: `previewFilterAction` imported from `app/actions/filter-actions.ts`
│  │     ├─ `onArchive` prop: `archiveFilterAction` imported from `app/actions/filter-actions.ts`
│  │     └─ `onDelete` prop: `deleteFilterAction` imported from `app/actions/filter-actions.ts`
│  │
│  └─ Recent Inbox table section:
│     └─ `<EmailTable emails={emails} onDeleteSelected onArchiveSelected />`
│        ├─ `emails` data loaded in `DashboardPage()` from:
│        │  `getRecentEmails(session.accessToken, 20)` (`lib/gmail.ts`)
│        ├─ `onDeleteSelected` prop: local server function `deleteSelectedEmails(ids)`
│        │  └─ calls `deleteEmails(accessToken, ids)` from `lib/gmail.ts`
│        │  └─ `revalidatePath("/dashboard")`
│        └─ `onArchiveSelected` prop: local server function `archiveSelectedEmails(ids)`
│           └─ calls `archiveEmails(accessToken, ids)` from `lib/gmail.ts`
│           └─ `revalidatePath("/dashboard")`

### Important note about AIAnalysisCard placement
- `components/AIAnalysisCard.tsx` exists and is implemented, but **it is not imported in `app/dashboard/page.tsx`**.
- Therefore: **AIAnalysisCard is not currently composed in `app/dashboard/page.tsx`** based on code evidence we opened.
- Any AI card rendering in the dashboard is therefore **unknown** from current composition evidence (it may be elsewhere in the dashboard tree, but `app/dashboard/page.tsx` does not show it).

## 2. Data Flow (dashboard components → props → state → APIs/actions → services)

> Legend:
> - **State** = React local state owned by the component (client component)
> - **Props** = values passed from parent (server or client component)
> - **Calls** = server actions / API routes called
> - **Services** = underlying “lib/*” functions

### 2.1 Analytics UI components (props-driven, no local state known yet)
Parent: `app/dashboard/page.tsx` loads `analytics` server-side.

- **Component**: `AnalyticsOverview`
  - **Props**:
    - `stats={analytics.overview}`
    - `analyzedEmailCount={analytics.analyzedEmailCount}`
    - `maxAnalyzed={analytics.maxAnalyzed}`
  - **State**: unknown (not opened in this session)
  - **Calls**: none shown (not opened)
  - **Services**: source data comes from `getEmailAnalytics(session.accessToken, 200)` in `lib/analytics.ts`

- **Component**: `TopSenders`
  - **Props**: `senders={analytics.topSenders}`
  - **State/Calls**: unknown (not opened)

- **Component**: `AttachmentInsights`
  - **Props**: `stats={analytics.attachmentStats}`
  - **State/Calls**: unknown (not opened)

- **Component**: `CleanupCandidates`
  - **Props**: `candidates={analytics.cleanupCandidates}`
  - **State/Calls**: unknown (not opened)

- **Service** (upstream):
  - `lib/analytics.ts#getEmailAnalytics(accessToken, limit)`
    - uses Gmail client via `getGmailClient(accessToken)` (from `lib/gmail.ts`)
    - computes overview/top senders/attachment stats/cleanup candidates

### 2.2 Filter/Search UI
Parent: `app/dashboard/page.tsx`

- **Component**: `FilterBuilder` (`components/FilterBuilder.tsx`)
  - **Props**:
    - `onPreview(filter)` → `previewFilterAction` (server action in `app/actions/filter-actions.ts`)
    - `onArchive(filter, emailIds)` → `archiveFilterAction`
    - `onDelete(filter, emailIds)` → `deleteFilterAction`
  - **State** (from evidence in opened file earlier):
    - sender, subject, olderThanDays, hasAttachment
    - preview + previewFilter
    - error/message
    - pending state via `useTransition`
  - **Calls / APIs**:
    - calls the provided server actions on “Preview”
    - uses `startTransition(async () => await onPreview(filter))`
  - **Services** (server action internals):
    - `previewFilterAction` → `searchEmails(accessToken, filter, 50)` in `lib/gmail.ts`
    - `archiveFilterAction` → `archiveEmails` then re-fetch `searchEmails` for updated preview
    - `deleteFilterAction` → `deleteEmails` then re-fetch `searchEmails`

### 2.3 Recent Inbox table UI
Parent: `app/dashboard/page.tsx`

- **Component**: `EmailTable` (`components/EmailTable.tsx`)
  - **Props**:
    - `emails: Email[]` loaded in dashboard from `getRecentEmails(accessToken, 20)`
    - `onDeleteSelected(ids)` → local server action `deleteSelectedEmails` (defined inline in `app/dashboard/page.tsx`)
    - `onArchiveSelected(ids)` → local server action `archiveSelectedEmails`
  - **State**:
    - selectedIds
    - message (EmailActionResult)
    - isPending via `useTransition`
  - **Calls / APIs**:
    - on “Delete Selected”: calls `onDeleteSelected([...selectedIds])`
    - on success: clears selection and `router.refresh()`
  - **Services** (inside server actions in `app/dashboard/page.tsx`):
    - `deleteSelectedEmails(ids)`:
      - `auth()` from `lib/auth.ts`
      - `deleteEmails(session.accessToken, ids)` from `lib/gmail.ts`
      - `revalidatePath("/dashboard")`
    - `archiveSelectedEmails(ids)`:
      - `auth()`
      - `archiveEmails(accessToken, ids)`
      - `revalidatePath("/dashboard")`

### 2.4 AI Analysis UI
- **Component**: `AIAnalysisCard` (`components/AIAnalysisCard.tsx`)
  - **Props**:
    - `emails: EmailMetadata[]`
    - optional `onAnalysisComplete`
  - **State**:
    - result, isAnalyzing, error
    - computed `analysisSignature` from `emails` (memo)
  - **Calls / APIs**:
    - `fetch("/api/ai/analyze-search", { method: "POST", body: JSON.stringify({ emails }) })`
    - auto-triggers in `useEffect` when `analysisSignature` changes
    - manual “Refresh Analysis” button appears only when `result` exists
  - **Services**:
    - no direct services; it calls the API route which calls `lib/ai/*`

- **API route**: `app/api/ai/analyze-search/route.ts`
  - accepts `{ emails: EmailMetadata[] }`
  - truncates to `MAX_EMAILS_TO_ANALYZE = 50`
  - hashes input and checks in-memory cache
  - runs:
    - `lib/ai#index.ts#analyzeEmails`
    - `lib/ai#index.ts#detectRisk`
    - `lib/ai#index.ts#summarizeEmails`

> Because `AIAnalysisCard` is not imported/composed in `app/dashboard/page.tsx`, the AI card’s placement in the dashboard UI is **not proven** by the code we opened. It may be composed in a different file or in a future split.

## 3. User Journeys (complete UI flow maps)

### 3.1 Email Search (Filter Preview)
User Action: build filters → click **Preview**
↓
UI: `FilterBuilder`
↓
Server Actions: `previewFilterAction(filter)` (`app/actions/filter-actions.ts`)
↓
Service: `lib/gmail.ts#searchEmails(accessToken, filter, 50)`
↓
UI: `FilterPreview` receives preview data (rendering)
**Note**: `FilterPreview` file not opened in this session.

### 3.2 Archive
User Action: select emails in table → click **Archive Selected**
↓
UI: `EmailTable`
↓
Server Action: `archiveSelectedEmails(ids)` (local in `app/dashboard/page.tsx`)
↓
Service: `lib/gmail.ts#archiveEmails(accessToken, ids)`
↓
Next: `revalidatePath("/dashboard")`, then `router.refresh()` in UI

### 3.3 Delete (Trash)
User Action: select emails → click **Delete Selected**
↓
UI: `EmailTable`
↓
Server Action: `deleteSelectedEmails(ids)`
↓
Service: `lib/gmail.ts#deleteEmails(accessToken, ids)`
↓
Next: `revalidatePath("/dashboard")`, then `router.refresh()` in UI

### 3.4 AI Analysis
User Action: (unknown placement) `AIAnalysisCard` appears for a set of emails → waits for auto-analysis
↓
UI: `AIAnalysisCard` (auto-trigger on `analysisSignature`)
↓
API: `POST /api/ai/analyze-search`
↓
Services: `lib/ai/index.ts` controllers/providers
↓
UI: renders summary/risk/breakdown/warnings via subcomponents
**Note**: exact trigger point (which page supplies `emails` prop) is unknown from the opened dashboard composition.

### 3.5 Export
- Export buttons exist in the repository (`components/ExportSelectedButton.tsx`), but **the dashboard composition for export is not shown in the opened `app/dashboard/page.tsx`**.
- Export likely occurs via dedicated UI components/routes not opened in this session.

## 4. Dashboard Split Impact Analysis (proposed `/dashboard/*` split)

Given current dashboard composition (`app/dashboard/page.tsx`), we can map components:

### Likely belongs to Analytics (`/dashboard/analytics`)
From `app/dashboard/page.tsx` analytics section:
- `AnalyticsOverview`
- `TopSenders`
- `AttachmentInsights`
- `CleanupCandidates`

Data source:
- `getEmailAnalytics(accessToken, 200)` in `lib/analytics.ts`

### Likely belongs to Search & AI (`/dashboard/search` and `/dashboard/search` + optional AI)
From dashboard:
- `FilterBuilder` is clearly Search-related.
- AI (`AIAnalysisCard`) is **not currently composed here** (evidence: missing import in `app/dashboard/page.tsx`).
  - Therefore:
    - If you add AI to the split in the future, it would belong in the Search & AI section.
  - Current evidence only proves `FilterBuilder` belongs here.

So:
- Search & (currently only Search) components:
  - `FilterBuilder`

- AI component likely belongs to Search & AI **if/when composed**:
  - `AIAnalysisCard` (requires `emails` metadata prop)

### Likely belongs to Automation (`/dashboard/automation`)
Current dashboard composition does **not** show any automation/task UI.
However, components related to automation exist in repo:
- `RunTaskModal.tsx`
- `TaskImpactSummary.tsx`
- `ExecutionConfirmationModal.tsx`
- `ExecutionResultModal.tsx`
- `CreateTaskModal.tsx`
- `TaskCard.tsx` etc.

Because `app/dashboard/page.tsx` does not import/compose these, mapping for `/dashboard/automation` is **unknown** from current evidence alone.

## 5. Shared Components (should remain shared between pages)
Based on current dashboard composition:
- `FilterBuilder` (Search UI shared between `/dashboard` and `/dashboard/search`)
- `EmailTable` (Email mutation UI shared between Search/Aggregate views if you keep table on multiple routes)
- Potentially:
  - `LoginButton/LogoutButton` style components are not shown in dashboard header (dashboard uses `signOut` inline), so sharing is uncertain without further evidence.

AI Analysis component can be shared if/when placed:
- `AIAnalysisCard` (shared UI once it’s composed into a search/automation page)

## 6. Migration Plan (safest split approach, no code)

Goal: split dashboard into:
- `/dashboard/analytics`
- `/dashboard/search`
- `/dashboard/automation`
while preserving all current functionality.

Safest approach based on current composition evidence:
1. **Extract analytics section first**
   - Move only the rendering fragment currently inside:
     - `<section className="mb-8 space-y-6"> ... </section>`
   - Keep the data-loading call `getEmailAnalytics(session.accessToken, 200)` in the new analytics route component.
   - Ensure error/loading branches stay identical.

2. **Extract search/filter + email table into `/dashboard/search`**
   - Move:
     - `<FilterBuilder onPreview onArchive onDelete />`
     - the “Recent Inbox Emails” table section (`EmailTable`)
   - Preserve the exact server action functions passed to `EmailTable`:
     - `deleteSelectedEmails(ids)` and `archiveSelectedEmails(ids)` rely on `auth()` + `lib/gmail.ts` + `revalidatePath("/dashboard")`.
   - Important: if the new route changes the path, keep `revalidatePath` behavior consistent with current UX expectations.

3. **Keep automation page minimal until wired**
   - Since automation UI is not currently composed in `app/dashboard/page.tsx`, introduce `/dashboard/automation` as a route that only renders existing automation components **once the integration is proven**.
   - Do not change or reinterpret server action endpoints until you’ve mapped which existing automation components are currently connected.

4. **Preserve shared auth boundary**
   - Keep `app/dashboard/layout.tsx` as the auth guard (already protects the whole dashboard subtree).

5. **Avoid cross-route implicit coupling**
   - Current server actions call `revalidatePath("/dashboard")` (in `app/actions/filter-actions.ts` and local actions).
   - During split, preserve those calls until you explicitly decide to revalidate new paths—otherwise you risk stale UI.

6. **Do a “no behavior change” rollout**
   - Ensure that, from the user perspective, current `/dashboard` behavior remains unchanged until split is validated.
   - If you introduce `/dashboard/*` routes, consider whether `/dashboard` should:
     - redirect to `/dashboard/search`
     - or render a composition of the three split pages
   - The safest is to keep `/dashboard` stable and add new routes without altering `/dashboard` first.
