# API Reference

Covers **HTTP API routes** and **Server Actions**. All paths relative to app origin (e.g. `http://localhost:3000`).

**Global:** No `middleware.ts` in repository — route protection is per-handler only.

---

## HTTP API Routes

### Authentication

#### `GET/POST /api/auth/*`

| Field | Value |
|-------|-------|
| **File** | `app/api/auth/[...nextauth]/route.ts` |
| **Handler** | Re-exports `handlers` from `lib/auth.ts` |
| **Purpose** | NextAuth OAuth flow, session cookies |
| **Auth required** | N/A (auth endpoints) |
| **Consumers** | Browser OAuth redirect, session management |
| **Dependencies** | `lib/auth.ts`, Google OAuth env vars |

---

### AI

#### `POST /api/ai/analyze-search`

| Field | Value |
|-------|-------|
| **File** | `app/api/ai/analyze-search/route.ts` |
| **Purpose** | Run `analyzeEmails`, `detectRisk`, `summarizeEmails` in parallel on email metadata |
| **Request body** | `{ emails: EmailMetadata[] }` where `EmailMetadata` = `{ sender, subject, snippet, date }` (`types/ai.ts`) |
| **Response** | `{ analysis, risk, summary, analyzedCount, totalProvided, analyzedAt, cached }` |
| **Limits** | Truncates to `MAX_EMAILS_TO_ANALYZE = 50` |
| **Cache** | In-memory SHA-256 hash, TTL 1 hour |
| **Auth required** | **No** `auth()` in handler |
| **Consumers** | `components/AIAnalysisCard.tsx` (`fetch`) |
| **Dependencies** | `lib/ai/index.ts`, `crypto` |

**Errors:** `400` invalid/empty emails; `500` analysis failure.

---

#### `POST /api/ai/test-analyze`

| Field | Value |
|-------|-------|
| **File** | `app/api/ai/test-analyze/route.ts` |
| **Purpose** | Debug endpoint for `analyzeEmails` only |
| **Request body** | `{ emailBodies: string[] }` |
| **Response** | `EmailAnalysis` JSON |
| **Auth required** | **No** |
| **Consumers** | `app/test-ai/page.tsx` |
| **Dependencies** | `lib/ai/index.ts` |

---

#### `GET /api/ai/debug`

| Field | Value |
|-------|-------|
| **File** | `app/api/ai/debug/route.ts` |
| **Purpose** | Inspect AI provider configuration (masked key preview) |
| **Response** | `{ status, provider, apiKeySet, apiKeyPreview, providerName, model, environment }` |
| **Auth required** | **No** |
| **Consumers** | `app/test-ai/page.tsx` |
| **Dependencies** | `lib/ai/provider-factory.ts` |
| **Note** | Hardcodes `GROK_API_KEY` for preview and model string `llama-3.3-70b-versatile` in response — may not match active `AI_PROVIDER` |

---

### Emails

#### `GET /api/emails/[messageId]`

| Field | Value |
|-------|-------|
| **File** | `app/api/emails/[messageId]/route.ts` |
| **Runtime** | `nodejs` |
| **Purpose** | Full email details for viewer |
| **Auth required** | **Yes** — `session.accessToken` |
| **Response** | `EmailDetails` JSON (`types/email.ts`) |
| **Consumers** | `components/EmailViewer.tsx` |
| **Dependencies** | `lib/gmail.ts#getEmailDetails` |

---

#### `GET /api/emails/[messageId]/attachments/[attachmentId]`

| Field | Value |
|-------|-------|
| **File** | `app/api/emails/[messageId]/attachments/[attachmentId]/route.ts` |
| **Runtime** | `nodejs` |
| **Purpose** | Download attachment bytes |
| **Query params** | `filename`, `mimeType` (optional) |
| **Auth required** | **Yes** |
| **Response** | Binary `Response` with Content-Disposition |
| **Consumers** | `components/AttachmentList.tsx` (inferred from architecture) |
| **Dependencies** | `lib/gmail.ts#getAttachment` |

---

### Export

#### `POST /api/export/email`

| Field | Value |
|-------|-------|
| **File** | `app/api/export/email/route.ts` |
| **Runtime** | `nodejs` |
| **Purpose** | Single-email ZIP export |
| **Request body** | `{ messageId: string }` |
| **Auth required** | **Yes** |
| **Response** | `application/zip` binary |
| **Consumers** | `components/EmailViewer.tsx` |
| **Dependencies** | `lib/gmail.ts`, `lib/export.ts` |

---

#### `POST /api/export/selected`

| Field | Value |
|-------|-------|
| **File** | `app/api/export/selected/route.ts` |
| **Runtime** | `nodejs` |
| **Purpose** | Multi-email ZIP export |
| **Request body** | `{ messageIds: string[] }` |
| **Auth required** | **Yes** |
| **Response** | `application/zip` (`emails-export.zip`) |
| **Consumers** | `components/ExportSelectedButton.tsx` |
| **Dependencies** | `lib/gmail.ts`, `lib/export.ts` |
| **Limits** | `lib/export.ts` — `MAX_EMAILS_PER_EXPORT = 50`, `MAX_EXPORT_SIZE_BYTES = 250MB` |

---

## Server Actions

Server Actions are invoked from client components or forms; not traditional REST.

### `app/actions/filter-actions.ts`

| Function | Purpose | Auth | Gmail calls | Revalidate |
|----------|---------|------|-------------|------------|
| `previewFilterAction(filter)` | Search up to 50 emails | `auth()` + token | `searchEmails` | No |
| `archiveFilterAction(filter, emailIds)` | Archive IDs, refresh search | Yes | `archiveEmails`, `searchEmails` | `revalidatePath("/dashboard")` |
| `deleteFilterAction(filter, emailIds)` | Trash IDs, refresh search | Yes | `deleteEmails`, `searchEmails` | `revalidatePath("/dashboard")` |

**Consumers:**

- `previewFilterAction` — `FilterBuilder` via `app/dashboard/page.tsx` props
- `archiveFilterAction` / `deleteFilterAction` — passed to `FilterBuilder` but **unused** in component (only `onPreview` used)

**Return type:** `FilterActionResult` (`ok` + `data` or `error`).

---

### `app/actions/execution-actions.ts`

| Function | Purpose | Auth | Limits |
|----------|---------|------|--------|
| `executeBulkAction({ action, emailIds })` | Run executor for `archive` or `delete` | Yes | 100 IDs per action |

**Consumers:** `components/FilterPreview.tsx`

**Dependencies:** `lib/executor/executor.ts`, handlers → `lib/gmail.ts`

**Return type:** `ExecuteBulkActionResponse`

---

### Inline Server Actions (`app/dashboard/page.tsx`)

| Function | Purpose | Auth | Revalidate |
|----------|---------|------|------------|
| `deleteSelectedEmails(ids)` | Trash selected recent emails | Yes | `/dashboard` |
| `archiveSelectedEmails(ids)` | Archive selected recent emails | Yes | `/dashboard` |

**Consumers:** `components/EmailTable.tsx`

---

### Other Server Actions

| Location | Function | Purpose |
|----------|----------|---------|
| `components/LoginButton.tsx` | `signIn("google")` | OAuth |
| `app/dashboard/page.tsx` | `signOut` | Logout |

---

## Library API (Non-HTTP)

Application code should import AI only from `lib/ai/index.ts`:

| Function | Controller | Input |
|----------|------------|-------|
| `parseIntent(prompt)` | intent-controller | `string` |
| `analyzeEmails(emailBodies)` | analysis-controller | `string[]` |
| `detectRisk(emailBodies)` | risk-controller | `string[]` |
| `summarizeEmails(emailBodies)` | summary-controller | `string[]` |

**Direct consumers:**

- `app/api/ai/*`
- `app/ai-playground/page.tsx` (client)

---

## Pages (Non-API Entry Points)

| Route | Method | File | Auth |
|-------|--------|------|------|
| `/` | GET | `app/page.tsx` | Public |
| `/dashboard` | GET | `app/dashboard/page.tsx` | layout + token |
| `/ai-playground` | GET | `app/ai-playground/page.tsx` | **UNKNOWN** |
| `/test-ai` | GET | `app/test-ai/page.tsx` | **UNKNOWN** |

---

## Environment Variables (API-related)

From `.env.example`:

| Variable | Used by |
|----------|---------|
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | NextAuth |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google provider |
| `AI_PROVIDER` | `ProviderFactory` |
| `OPENAI_API_KEY`, `GROK_API_KEY`, etc. | Respective providers |

---

## Security Summary

| Endpoint group | Session required in code |
|----------------|-------------------------|
| Gmail read/export | Yes |
| AI analyze/test/debug | **No** |
| Server actions (filter, execution) | Yes |
| Dashboard pages | layout checks `session.user` |

**Risk:** Unauthenticated AI endpoints may be abused for LLM quota consumption if deployed publicly — evidence: missing `auth()` in AI route files.

---

## Related Documents

- `docs/system-flows.md`
- `docs/feature-inventory.md`
- `docs/architecture.md`
