import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const automations = sqliteTable(
  "automations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    schedule: text("schedule"),
    configuration: text("configuration", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    status: text("status", {
      enum: ["pending", "running", "completed", "failed"],
    })
      .notNull()
      .default("pending"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userIdx: index("idx_automations_user").on(table.userId),
    userEnabledIdx: index("idx_automations_user_enabled").on(
      table.userId,
      table.enabled
    ),
  })
);

export const executions = sqliteTable(
  "executions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    automationId: text("automation_id"),
    source: text("source", {
      enum: ["manual", "automation", "ai_agent", "system"],
    }).notNull(),
    status: text("status", {
      enum: ["pending", "running", "completed", "failed"],
    }).notNull(),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    durationMs: integer("duration_ms").notNull().default(0),
    emailsProcessed: integer("emails_processed").notNull().default(0),
    emailsSucceeded: integer("emails_succeeded").notNull().default(0),
    emailsFailed: integer("emails_failed").notNull().default(0),
    metadata: text("metadata", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
  },
  (table) => ({
    userStartedIdx: index("idx_executions_user_started").on(
      table.userId,
      table.startedAt
    ),
    automationIdx: index("idx_executions_automation").on(table.automationId),
    statusIdx: index("idx_executions_status").on(table.status),
  })
);

export const commits = sqliteTable(
  "commits",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    executionId: text("execution_id")
      .notNull()
      .references(() => executions.id, { onDelete: "cascade" }),
    source: text("source", {
      enum: ["manual", "automation", "ai_agent", "system"],
    }).notNull(),
    actionType: text("action_type", {
      enum: ["archive", "delete", "export", "unsubscribe", "ai_cleanup"],
    }).notNull(),
    title: text("title").notNull(),
    emailCount: integer("email_count").notNull(),
    status: text("status", {
      enum: ["pending", "running", "completed", "failed"],
    }).notNull(),
    durationMs: integer("duration_ms").notNull().default(0),
    createdAt: text("created_at").notNull(),
    automationId: text("automation_id"),
    metadata: text("metadata", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
  },
  (table) => ({
    userCreatedIdx: index("idx_commits_user_created").on(
      table.userId,
      table.createdAt
    ),
    executionIdx: index("idx_commits_execution").on(table.executionId),
    automationIdx: index("idx_commits_automation").on(table.automationId),
    statusIdx: index("idx_commits_status").on(table.status),
  })
);

export const commitItems = sqliteTable(
  "commit_items",
  {
    id: text("id").primaryKey(),
    commitId: text("commit_id")
      .notNull()
      .references(() => commits.id, { onDelete: "cascade" }),
    emailId: text("email_id").notNull(),
    sender: text("sender").notNull(),
    subject: text("subject").notNull(),
  },
  (table) => ({
    commitIdx: index("idx_commit_items_commit").on(table.commitId),
    senderIdx: index("idx_commit_items_sender").on(table.sender),
  })
);

export const executionsRelations = relations(executions, ({ many }) => ({
  commits: many(commits),
}));

export const commitsRelations = relations(commits, ({ one, many }) => ({
  execution: one(executions, {
    fields: [commits.executionId],
    references: [executions.id],
  }),
  items: many(commitItems),
}));

export const commitItemsRelations = relations(commitItems, ({ one }) => ({
  commit: one(commits, {
    fields: [commitItems.commitId],
    references: [commits.id],
  }),
}));
