import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";

const databaseUrl = process.env.TURSO_DATABASE_URL ?? "file:local.db";

const client = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const executionId = `test_execution_${randomUUID()}`;
const commitId = `test_commit_${randomUUID()}`;
const itemId = `test_item_${randomUUID()}`;
const userId = "db-test-user";
const now = new Date().toISOString();

async function main() {
  await client.execute("select 1 as ok");
  console.log("Database Connected");

  await client.execute("pragma foreign_keys = on");

  await client.batch([
    {
      sql: `insert into executions (
        id, user_id, automation_id, source, status, started_at, finished_at,
        duration_ms, emails_processed, emails_succeeded, emails_failed, metadata
      ) values (?, ?, null, 'manual', 'completed', ?, ?, 1, 1, 1, 0, '{}')`,
      args: [executionId, userId, now, now],
    },
    {
      sql: `insert into commits (
        id, user_id, execution_id, source, action_type, title, email_count,
        status, duration_ms, created_at, automation_id, metadata
      ) values (?, ?, ?, 'manual', 'archive', 'Database Test Commit', 1,
        'completed', 1, ?, null, '{}')`,
      args: [commitId, userId, executionId, now],
    },
    {
      sql: `insert into commit_items (
        id, commit_id, email_id, sender, subject
      ) values (?, ?, 'test-email-id', 'test@example.com', 'Database Test Subject')`,
      args: [itemId, commitId],
    },
  ]);
  console.log("Insert Success");

  const readResult = await client.execute({
    sql: `select c.id, ci.subject
      from commits c
      join commit_items ci on ci.commit_id = c.id
      where c.id = ?`,
    args: [commitId],
  });

  if (readResult.rows.length !== 1) {
    throw new Error("Inserted commit could not be read back.");
  }
  console.log("Read Success");

  await client.batch([
    {
      sql: "delete from commit_items where commit_id = ?",
      args: [commitId],
    },
    {
      sql: "delete from commits where id = ?",
      args: [commitId],
    },
    {
      sql: "delete from executions where id = ?",
      args: [executionId],
    },
  ]);
  console.log("Delete Success");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    client.close();
  });
