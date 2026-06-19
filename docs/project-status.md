# Project Status

Reconstructed from **git history**, **source code**, and **documentation files** in the repository.

---

## Executive Timeline (Git Commits)

| Commit / label | Scope | Evidence |
|----------------|-------|----------|
| Milestone 1 | Landing, OAuth, dashboard shell | `dfee790` |
| Milestone 2 | Gmail read, email table | `85b78a7` |
| Milestone 3 | Checkbox delete/archive | `417cee4` |
| Milestone 4 | Filter builder + search preview | `e425cc3` |
| Milestone 5 | Preview selection + selective actions | `c2ef3c1` |
| Milestone 6 | Email viewer + export | `b4290e4` |
| — | PDF encoding fix | `da9a021` |
| Phase 7 | Email analytics | `8e7708d` |
| Phase 8 | Universal AI layer | `e6a570d` |
| Phase 8.1 | AI playground | `634d73e` |
| Phase 8.2 | AI for search results | `6953972` |
| Phase 8.3 | Task builder + manual execution | `2c57163` |
| Phase 8.3.1 | Task preview engine | `614ce18` |
| Phase 8.3.2 | Confirmation + execution layer | `075c078` |
| Phase 9.1 | AI Action Card | `1886826` |
| Phase 9.2 | Executor infrastructure | `eaa0100` |
| Phase 9.4 | Bulk execution integration | `db5bfbd` (HEAD) |

---

## Completed Phases

### Milestones 1–6 — Core Gmail UX

**Status:** Complete and integrated on `/dashboard` and filter preview.

Includes: OAuth, inbox list, manual mutations, filter search, viewer, ZIP export.

### Phase 7 — Analytics

**Status:** Complete on dashboard.

Files: `lib/analytics.ts`, analytics components, `app/dashboard/page.tsx`.

### Phase 8 — AI Layer

**Status:** Complete (MVP architecture).

Files: `lib/ai/**`, `PHASE_8_ARCHITECTURE.md`, API routes, `AIAnalysisCard`.

### Phase 8.2 — AI on Search Results

**Status:** Complete in **FilterPreview** path (not dashboard root).

Files: `components/FilterPreview.tsx`, `components/AIAnalysisCard.tsx`, `app/api/ai/analyze-search/route.ts`.

### Phase 9.2 / 9.4 — Executor + Bulk Integration

**Status:** Complete for archive/delete in filter preview.

Files: `lib/executor/*`, `app/actions/execution-actions.ts`, `components/FilterPreview.tsx`, execution modals.

### Phase 9.1 — AI Action Card

**Status:** Complete in filter preview.

File: `components/AIActionCard.tsx`.

---

## In Progress / Partial

### Phase 8.3.2 — Confirmation Layer

**Status:** Complete for **filter preview** executor; not for task modal.

Files: `ExecutionConfirmationModal.tsx`, `ExecutionResultModal.tsx`.

---

## Not Started (Documented Only)

### Phase 10.1 — Dashboard Split

**Status:** Not started.

**Planned routes** (`PROJECT_CONTEXT.md`, `UI_ARCHITECTURE.md`):

- `/dashboard/analytics`
- `/dashboard/search`
- `/dashboard/automation`

**Evidence:** No `app/dashboard/analytics/` (or similar) directories exist.

**Constraint documented:** No business logic changes — UI split only.

---

## Missing Components

| Component | Evidence of gap |
|-----------|-----------------|
| Dashboard navigation / sub-routes | Only `app/dashboard/page.tsx` exists |
| Download executor | Handler throws in `lib/executor/handlers.ts` |
| Redis cache | TODOs only |
| CI/CD pipeline | No workflow files in git |
| API auth middleware | No `middleware.ts` |
| Database / user settings sync | No user settings table |
| Phase 10 automation page content | No automation components on dashboard |

---

## Current HEAD Capabilities (User-Visible)

What works today on production routes:

1. Sign in with Google
2. View analytics on dashboard
3. Build filter and preview emails
4. AI-analyze preview results (auto)
5. Archive/delete/export/view from preview with executor + modals
6. Manage recent inbox separately (simpler archive/delete)
7. Dev pages for AI testing

What does **not** work end-to-end for users:

1. Saved task run flow from dashboard
2. Download search results from AI Action Card
3. Filter-based server actions from FilterBuilder (bypassed by FilterPreview executor)

---

## Build Health

| Check | Result |
|-------|--------|
| `npm run type-check` | **Fails** (15 errors in task files) |
| `npm run build` | **UNKNOWN** (not run during this analysis) |
| Vitest executor tests | Present in `lib/executor/__tests__/executor.test.ts` |

---

## Recommended Next Development Tasks

Ordered by dependency and documented plan:

1. **Secure AI routes** with `auth()` if deploying beyond local dev.
2. **Phase 10.1 dashboard split** — extract sections from `app/dashboard/page.tsx` without logic changes; update `revalidatePath` targets.
3. **Unify or document** dual archive/delete paths (dashboard table vs executor).
4. **Add `snippet` to `searchEmails` results** for better AI input (`lib/gmail.ts`).
5. **Remove or implement** unused `archiveFilterAction`/`deleteFilterAction` props on `FilterBuilder`.
6. **Production hardening:** Redis cache, OAuth refresh, CI, deployment docs.

---

## Document Index

| Document | Contents |
|----------|----------|
| `docs/architecture.md` | System design |
| `docs/repository-map.md` | Folder map |
| `docs/feature-inventory.md` | Features |
| `docs/system-flows.md` | Flow diagrams |
| `docs/database.md` | Persistence model |
| `docs/api-reference.md` | APIs |
| `docs/technical-debt.md` | Debt register |
| `docs/project-status.md` | This file |

---

## UNKNOWN Summary

| Topic | Status |
|-------|--------|
| Production host / CI | UNKNOWN |
| NextAuth session storage backend | UNKNOWN |
| OAuth refresh token handling | UNKNOWN |
| Whether `npm run build` passes | UNKNOWN |
| AI playground client/server bundle behavior | UNKNOWN |
| AttachmentList consumer path | Partially evidenced |
