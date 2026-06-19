import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    image: text("image"),
    googleId: text("google_id").unique(),
    createdAt: text("created_at").notNull(),
    lastLoginAt: text("last_login_at").notNull(),
  },
  (table) => ({
    emailIdx: index("idx_users_email").on(table.email),
    googleIdIdx: index("idx_users_google_id").on(table.googleId),
  })
);

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    metadata: text("metadata", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    userCreatedIdx: index("idx_activities_user_created").on(
      table.userId,
      table.createdAt
    ),
    actionIdx: index("idx_activities_action").on(table.action),
  })
);

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
    scheduleType: text("schedule_type", {
      enum: ["once", "daily", "weekly", "monthly", "interval"],
    }),
    scheduleValue: text("schedule_value", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    conditionJson: text("condition_json", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    actionJson: text("action_json", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    lastRunAt: text("last_run_at"),
    nextRunAt: text("next_run_at"),
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
    dueIdx: index("idx_automations_due").on(table.enabled, table.nextRunAt),
  })
);

export const automationRuns = sqliteTable(
  "automation_runs",
  {
    id: text("id").primaryKey(),
    automationId: text("automation_id")
      .notNull()
      .references(() => automations.id, { onDelete: "cascade" }),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    status: text("status", {
      enum: ["pending", "running", "completed", "failed"],
    }).notNull(),
    emailsMatched: integer("emails_matched").notNull().default(0),
    emailsProcessed: integer("emails_processed").notNull().default(0),
    executionId: text("execution_id"),
    commitId: text("commit_id"),
    error: text("error"),
  },
  (table) => ({
    automationIdx: index("idx_automation_runs_automation").on(
      table.automationId
    ),
    startedIdx: index("idx_automation_runs_started").on(table.startedAt),
    statusIdx: index("idx_automation_runs_status").on(table.status),
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
      enum: ["archive", "delete", "export", "mark_read", "unsubscribe", "ai_cleanup"],
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

export const usersRelations = relations(users, ({ many }) => ({
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const automationsRelations = relations(automations, ({ many }) => ({
  runs: many(automationRuns),
}));

export const automationRunsRelations = relations(automationRuns, ({ one }) => ({
  automation: one(automations, {
    fields: [automationRuns.automationId],
    references: [automations.id],
  }),
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
