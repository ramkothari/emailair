# Technical Debt Report

Items backed by file evidence. Severity is engineering judgment for planning, not a measured metric.

---

## 1. TypeScript Compile Errors (Blocking CI-quality gate)

**Evidence:** `npm run type-check` (`package.json` script) previously reported task-system errors. The legacy task system has since been removed.

| File | Issue |
|------|-------|
| None currently documented here | Re-run `npm run type-check` for current status |

**Impact:** Task automation path cannot be considered type-safe or build-clean.

---

## 2. Dual Archive/Delete Code Paths

**Evidence:**

| Path | Entry | Implementation |
|------|-------|----------------|
| A | `EmailTable` on dashboard | Inline server actions → direct `lib/gmail.ts` |
| B | `FilterPreview` | `executeBulkAction` → `lib/executor` |

**Impact:** Inconsistent UX (confirmation modals only on path B); duplicate Gmail mutation logic; different limits (executor 100 vs table unbounded batch in gmail `Promise.all`).

---

## 4. Unused Server Action Props

**Evidence:** `app/dashboard/page.tsx` passes `archiveFilterAction` and `deleteFilterAction` to `FilterBuilder`; `FilterBuilder` only destructures `onPreview` (`components/FilterBuilder.tsx` line 36).

**Impact:** Dead API surface; confusion for maintainers.

---

## 5. AI Endpoints Without Authentication

**Evidence:** No `auth()` in:

- `app/api/ai/analyze-search/route.ts`
- `app/api/ai/test-analyze/route.ts`
- `app/api/ai/debug/route.ts`

No `middleware.ts` in repository.

**Impact:** Public deployment could expose paid LLM usage and email metadata injection attacks.

---

## 6. In-Memory Cache and Rate Limits

**Evidence:**

- `// TODO: Redis Later` in `lib/ai/controllers/*.ts`
- `analyzeCache` Map in `app/api/ai/analyze-search/route.ts`
- `PHASE_8_ARCHITECTURE.md` documents MVP in-memory approach

**Impact:** Not safe for multi-instance deployment; cache not shared; resets on restart.

---

## 7. Search Preview Missing Snippets for AI

**Evidence:**

- `mapGmailMessageToEmail` in `lib/gmail.ts` (search path) omits `snippet`
- `FilterPreview` builds `EmailMetadata` from `email.snippet || ""` (`components/FilterPreview.tsx`)

**Impact:** AI analysis in filter preview may run on empty snippets unless Gmail list includes them elsewhere.

---

## 8. Download Action Deferred

**Evidence:**

- `lib/executor/handlers.ts` `downloadHandler` throws error
- `components/AIActionCard.tsx` Download button `disabled`
- Task type allows `download` but executor cannot run it

**Impact:** Incomplete feature promise in types/UI.

---

## 9. AI Playground Imports Server AI from Client

**Evidence:** `app/ai-playground/page.tsx` is `"use client"` and imports `@/lib/ai` which pulls controllers and `ProviderFactory` (Node `process.env`).

**Impact:** **UNKNOWN** runtime failure modes in browser vs server bundle — needs verification. Potential architectural smell.

---

## 10. Stale / Misleading UI Copy

**Evidence:** `components/AIActionCard.tsx` line 67: `"Execution is not enabled yet."` — but `FilterPreview` wires archive/trash execution.

**Impact:** User confusion.

---

## 11. Documentation Drift

**Evidence:**

- `UI_ARCHITECTURE.md` states `AIAnalysisCard` not in dashboard (still true) but understates `FilterPreview` integration
- `PROJECT_CONTEXT.md` Phase 10.1 planned; no routes `app/dashboard/analytics` exist

**Impact:** Onboarding friction (mitigated by new `docs/` set).

---

## 12. No Automated E2E Test Suite

**Evidence:**

- `tests/phase-8-2-api-tests.js` — manual-style script
- `lib/executor/__tests__/executor.test.ts` — unit tests only
- No Playwright/Cypress in `package.json`

**Impact:** Regressions rely on manual testing.

---

## 13. Deployment / Ops Gaps

**Evidence:**

- Empty `next.config.ts`
- No Dockerfile, no CI config in git
- `.gitignore` includes `.vercel` only as hint

**Impact:** **UNKNOWN** production operational practices.

---

## 14. OAuth Token Refresh

**Evidence:** `lib/auth.ts` stores `account.access_token` on first sign-in; no `refresh_token` handling visible in callbacks.

**Impact:** **UNKNOWN** — sessions may expire without refresh; UI shows 401 messages (`app/dashboard/page.tsx` `getGmailErrorMessage`).

---

## 15. `revalidatePath` Hardcoded to `/dashboard`

**Evidence:** `app/actions/filter-actions.ts`, `app/dashboard/page.tsx` inline actions.

**Impact:** Will break cache coherence if Phase 10.1 split routes added without updating paths.

---

## Debt Priority Matrix (Recommended)

| Priority | Item |
|----------|------|
| P0 | AI route authentication (if public deploy) |
| P0 | Fix type-check errors before task integration |
| P1 | Wire or remove task automation components |
| P1 | Unify archive/delete paths or document intentional split |
| P2 | Redis/distributed cache for AI |
| P2 | Add snippets to search results for AI |
| P3 | Deployment CI, E2E tests, OAuth refresh |

---

## Related Documents

- `docs/project-status.md`
- `docs/feature-inventory.md`
