# Technical Debt

Only issues proven from repository evidence are listed.

## Build-Breaking Type Errors

`npm run type-check` previously failed on legacy task-system files that have since been removed. Re-run the command for current status.

Evidence from command output:

- Current verification should come from the latest `npm run type-check` output.

Impact: the project does not type-check under the configured `tsc --noEmit` script. Evidence: `package.json`, `tsconfig.json`, command output.

## Unauthenticated AI Endpoints

`POST /api/ai/analyze-search`, `POST /api/ai/test-analyze`, and `GET /api/ai/debug` do not call `auth()` and do not check a session in source.

Evidence:

- `app/api/ai/analyze-search/route.ts`
- `app/api/ai/test-analyze/route.ts`
- `app/api/ai/debug/route.ts`
- Contrast: Gmail/export routes call `auth()` and return 401 when no `accessToken` exists in `app/api/emails/[messageId]/route.ts`, `app/api/export/email/route.ts`, and `app/api/export/selected/route.ts`.

Impact: AI API usage and provider debug metadata are reachable without repository-proven authentication.

## Provider Debug Endpoint Exposes API Key Prefix

`app/api/ai/debug/route.ts` returns `apiKeyPreview` containing the first 10 characters of `GROK_API_KEY` when set.

Evidence: `const maskedKey = apiKey === "NOT SET" ? apiKey : apiKey.substring(0, 10) + "..."` and returned JSON in `app/api/ai/debug/route.ts`.

Impact: diagnostic route can disclose secret prefix. Combined with missing auth on that route, exposure risk is higher.

## Stale or Unused Props in Filter Builder

`FilterBuilderProps` includes `onArchive` and `onDelete`, and `app/dashboard/page.tsx` passes `archiveFilterAction` and `deleteFilterAction`, but `FilterBuilder` destructures only `{ onPreview }`.

Evidence: `components/FilterBuilder.tsx`, `app/dashboard/page.tsx`, `app/actions/filter-actions.ts`.

Impact: legacy archive/delete filter actions are currently not used by the component that receives them; active search-result mutations use `executeBulkAction()` from `FilterPreview`.

## In-Memory Cache and Rate Limiters

AI caches and rate-limit maps are module-local `Map` objects.

Evidence:

- `app/api/ai/analyze-search/route.ts` `analyzeCache`.
- `lib/ai/controllers/analysis-controller.ts`, `summary-controller.ts`, `risk-controller.ts`, `intent-controller.ts` cache and rate-limit `Map`s.
- TODO comments say `Redis Later`.

Impact: cache/rate-limit state is per process and not shared across server instances or restarts.

## Download Executor Is Deferred

`ActionType` includes `"download"`, but executor download handler always throws.

Evidence: `lib/executor/types.ts`, `lib/executor/handlers.ts`.

Impact: any caller using executor action `download` will fail; UI `AIActionCard` disables "Download Search Results".

## AI Playground Imports Server AI Layer in Client Component

`app/ai-playground/page.tsx` is a client component and imports `parseIntent`, `analyzeEmails`, `detectRisk`, `summarizeEmails` from `@/lib/ai`, which reaches provider code using environment variables and direct provider HTTP calls.

Evidence: `app/ai-playground/page.tsx`, `lib/ai/index.ts`, `lib/ai/provider-factory.ts`.

Impact: the route blurs client/server boundaries. Runtime/build impact beyond current type-check failures is not proven from repository.

## Encoding Artifacts in UI Strings

Several component strings contain mojibake characters such as `ðŸ”„`, `â€¢`, `âš `, `Â·`, `â†`, and `ðŸ§ª`.

Evidence:

- `components/AIAnalysisCard.tsx`
- `components/AIActionCard.tsx`
- `components/AttachmentList.tsx`
- `app/test-ai/page.tsx`
- `tests/phase-8-2-api-tests.js`

Impact: users may see corrupted characters in UI/test output.

## Performance Bottlenecks

- Gmail analytics fetches up to 200 message details concurrently with `Promise.allSettled`. Evidence: `lib/analytics.ts`.
- Search preview fetches metadata for all returned messages concurrently up to 50. Evidence: `lib/gmail.ts`.
- Export selected fetches every email and every attachment concurrently for selected IDs before ZIP generation. Evidence: `app/api/export/selected/route.ts`.

Impact: these can create bursty Gmail API calls and memory pressure for exports. Actual production performance impact is not proven from repository.

## Dead / Duplicate Code

- `LogoutButton` exists but active dashboard uses an inline sign-out form instead. Evidence: `components/LogoutButton.tsx`, `app/dashboard/page.tsx`.
- Legacy filter mutation actions are passed but not consumed by `FilterBuilder`. Evidence: `app/dashboard/page.tsx`, `components/FilterBuilder.tsx`.
- Task preview/task impact components are not imported by active routes and currently fail type checking. Evidence: repository import search, `npm run type-check`.

## Security Risks

- Unauthenticated AI endpoints. Evidence above.
- Debug endpoint exposes provider/key metadata. Evidence above.
- Gmail OAuth uses broad `https://www.googleapis.com/auth/gmail.modify` scope, required for archive/delete/trash but broader than read-only. Evidence: `lib/auth.ts`.

## Architectural Weaknesses

- No durable server-side persistence for AI cache or user settings. Evidence: AI `Map` caches.
- Email provider abstraction is absent; Gmail is hard-coded. Evidence: `lib/gmail.ts`.
- Search infrastructure is Gmail query only; no independent index. Evidence: `searchEmails()` in `lib/gmail.ts`.

## Missing Features / Incomplete Implementations

| Feature | Status | Evidence |
|---|---|---|
| User settings | Not proven from repository | no settings route/component/API found |
| Billing | Not proven from repository | no Stripe/billing route/dependency found |
| Durable database | Not proven from repository | no DB dependency/source usage found |
| Queue/background jobs | Not proven from repository | synchronous server actions/executor only |
| Executor download | Deferred | `lib/executor/handlers.ts` |
| Redis cache/rate-limit | Planned only | TODO comments in `lib/ai/controllers/*.ts` |
