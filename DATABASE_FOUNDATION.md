# DATABASE FOUNDATION

## Persistence Layer

Emailair now uses Turso with Drizzle for durable execution and commit history.

Environment variables:

```env
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your-token"
```

Local development may use:

```env
TURSO_DATABASE_URL="file:local.db"
```

Commands:

```bash
npm run db:generate
npm run db:migrate
```

## Tables

### automations

Purpose: persistent automation rules.

Primary fields:

- `id`
- `user_id`
- `name`
- `description`
- `enabled`
- `schedule`
- `configuration`
- `status`
- `created_at`
- `updated_at`

Indexes:

- `idx_automations_user`
- `idx_automations_user_enabled`

### executions

Purpose: every execution attempt, including failures and no-op runs.

Primary fields:

- `id`
- `user_id`
- `automation_id`
- `source`
- `status`
- `started_at`
- `finished_at`
- `duration_ms`
- `emails_processed`
- `emails_succeeded`
- `emails_failed`
- `metadata`

Indexes:

- `idx_executions_user_started`
- `idx_executions_automation`
- `idx_executions_status`

### commits

Purpose: immutable history of successful actions.

Primary fields:

- `id`
- `user_id`
- `execution_id`
- `source`
- `action_type`
- `title`
- `email_count`
- `status`
- `duration_ms`
- `created_at`
- `automation_id`
- `metadata`

Relationships:

- `commits.execution_id` references `executions.id`

Indexes:

- `idx_commits_user_created`
- `idx_commits_execution`
- `idx_commits_automation`
- `idx_commits_status`

### commit_items

Purpose: affected email snapshots captured before mutation.

Primary fields:

- `id`
- `commit_id`
- `email_id`
- `sender`
- `subject`

Relationships:

- `commit_items.commit_id` references `commits.id`

Indexes:

- `idx_commit_items_commit`
- `idx_commit_items_sender`

## Execution Flow

```text
User action or automation
  -> commit service creates execution row
  -> commit service snapshots Gmail metadata before mutation
  -> existing executor or route action runs unchanged
  -> execution row is marked completed or failed
  -> successful non-empty execution creates commit + commit_items
```

## Commit Flow

Successful archive/delete/export:

```text
Execution row
  -> Commit row
  -> Commit item rows
```

Failed execution:

```text
Execution row only
```

No-op execution:

```text
Execution row only
```

## Mutation Coverage

Commit recording is integrated into:

- `lib/executor/executor.ts`
- `app/actions/execution-actions.ts`
- `app/actions/filter-actions.ts`
- `app/dashboard/inbox/page.tsx`
- `app/api/export/email/route.ts`
- `app/api/export/selected/route.ts`

Metadata snapshots are captured by:

- `lib/gmail.ts` `getEmailsMetadataByIds()`

Central service:

- `lib/commits/commit-service.ts`

## Automation Flow

Current automation UI still stores draft task definitions in browser storage. The database now has an `automations` table designed as the durable destination.

Migration strategy:

1. Add server actions/API for CRUD operations on `automations`.
2. On first authenticated automation page load, read localStorage tasks on the client.
3. Submit local tasks to the server for the authenticated user.
4. Write each task into `automations.configuration`.
5. After successful migration, mark a client migration flag and stop reading localStorage as the source of truth.
6. Remove localStorage task writes after database CRUD is live.

Until that cutover is implemented, localStorage remains the existing source for saved task drafts and the database table is the target schema for migration. Execution history is already database-backed through `executions`, `commits`, and `commit_items`.

## Future Analytics Flow

Future analytics can derive durable metrics from:

- `executions`: attempted runs, failures, no-op runs, duration, source
- `commits`: successful actions, action type, email count, source
- `commit_items`: sender-level and subject-level action history

Examples:

- archived count
- deleted count
- exported count
- automation success rate
- average execution duration
- top affected senders
- manual vs automation action volume

## File-by-File Modification List

Created:

- `db/client.ts`
- `db/schema.ts`
- `drizzle.config.ts`
- `drizzle/0001_commit_system.sql`
- `lib/commits/types.ts`
- `lib/commits/session.ts`
- `lib/commits/commit-service.ts`
- `app/api/commits/route.ts`
- `app/api/commits/[id]/route.ts`
- `app/dashboard/commits/page.tsx`
- `components/CommitCard.tsx`
- `components/CommitGroup.tsx`
- `DATABASE_FOUNDATION.md`

Modified:

- `package.json`
- `package-lock.json`
- `lib/gmail.ts`
- `lib/executor/types.ts`
- `lib/executor/executor.ts`
- `app/actions/execution-actions.ts`
- `app/actions/filter-actions.ts`
- `app/dashboard/inbox/page.tsx`
- `app/api/export/email/route.ts`
- `app/api/export/selected/route.ts`
- `app/dashboard/DashboardShell.tsx`

## Testing Plan

1. Configure `TURSO_DATABASE_URL`.
2. Run `npm install`.
3. Run `npm run db:migrate`.
4. Start the app with `npm run dev -- -p 3000`.
5. Archive selected inbox emails.
6. Visit `/dashboard/commits`.
7. Confirm a completed archive commit appears.
8. Expand the commit and confirm sender/subject snapshots are present.
9. Delete selected inbox emails.
10. Confirm delete commit appears.
11. Export a single email and selected emails.
12. Confirm export commits appear while ZIP downloads still work.
13. Force a Gmail execution failure.
14. Confirm an execution row exists with `failed` status and no completed commit was created.

SQL checks:

```sql
SELECT * FROM executions ORDER BY started_at DESC;
SELECT * FROM commits ORDER BY created_at DESC;
SELECT * FROM commit_items ORDER BY rowid DESC;
```
