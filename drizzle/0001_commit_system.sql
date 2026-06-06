CREATE TABLE IF NOT EXISTS automations (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled INTEGER NOT NULL DEFAULT 0,
  schedule TEXT,
  configuration TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_automations_user
ON automations (user_id);

CREATE INDEX IF NOT EXISTS idx_automations_user_enabled
ON automations (user_id, enabled);

CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  automation_id TEXT,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  emails_processed INTEGER NOT NULL DEFAULT 0,
  emails_succeeded INTEGER NOT NULL DEFAULT 0,
  emails_failed INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_executions_user_started
ON executions (user_id, started_at);

CREATE INDEX IF NOT EXISTS idx_executions_automation
ON executions (automation_id);

CREATE INDEX IF NOT EXISTS idx_executions_status
ON executions (status);

CREATE TABLE IF NOT EXISTS commits (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  source TEXT NOT NULL,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  email_count INTEGER NOT NULL,
  status TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  automation_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_commits_user_created
ON commits (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_commits_execution
ON commits (execution_id);

CREATE INDEX IF NOT EXISTS idx_commits_automation
ON commits (automation_id);

CREATE INDEX IF NOT EXISTS idx_commits_status
ON commits (status);

CREATE TABLE IF NOT EXISTS commit_items (
  id TEXT PRIMARY KEY NOT NULL,
  commit_id TEXT NOT NULL,
  email_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT NOT NULL,
  FOREIGN KEY (commit_id) REFERENCES commits(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_commit_items_commit
ON commit_items (commit_id);

CREATE INDEX IF NOT EXISTS idx_commit_items_sender
ON commit_items (sender);
