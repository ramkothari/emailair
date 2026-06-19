import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

function loadLocalEnv() {
  if (!existsSync(".env.local")) {
    return;
  }

  const envFile = readFileSync(".env.local", "utf8");

  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const databaseUrl = process.env.TURSO_DATABASE_URL ?? "file:local.db";

const client = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const executionId = `test_execution_${randomUUID()}`;
const commitId = `test_commit_${randomUUID()}`;
const itemId = `test_item_${randomUUID()}`;
const userId = `test_user_${randomUUID()}`;
const activityId = `test_activity_${randomUUID()}`;
const now = new Date().toISOString();

async function main() {
  await client.execute("select 1 as ok");
  console.log("Database Connected");

  await client.execute("pragma foreign_keys = on");

  await client.batch([
    {
      sql: `insert into users (
        id, email, name, image, google_id, created_at, last_login_at
      ) values (?, ?, 'Database Test User', null, ?, ?, ?)`,
      args: [userId, `${userId}@example.com`, userId, now, now],
    },
    {
      sql: `insert into activities (
        id, user_id, action, metadata, created_at
      ) values (?, ?, 'db_test', '{"source":"scripts/db-test.mjs"}', ?)`,
      args: [activityId, userId, now],
    },
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
    sql: `select c.id, ci.subject, u.email, a.action
      from commits c
      join commit_items ci on ci.commit_id = c.id
      join users u on u.id = c.user_id
      join activities a on a.user_id = u.id
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
    {
      sql: "delete from activities where user_id = ?",
      args: [userId],
    },
    {
      sql: "delete from users where id = ?",
      args: [userId],
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
