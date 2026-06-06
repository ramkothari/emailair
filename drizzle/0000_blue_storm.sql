CREATE TABLE `automations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`enabled` integer DEFAULT false NOT NULL,
	`schedule` text,
	`configuration` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_automations_user` ON `automations` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_automations_user_enabled` ON `automations` (`user_id`,`enabled`);--> statement-breakpoint
CREATE TABLE `commit_items` (
	`id` text PRIMARY KEY NOT NULL,
	`commit_id` text NOT NULL,
	`email_id` text NOT NULL,
	`sender` text NOT NULL,
	`subject` text NOT NULL,
	FOREIGN KEY (`commit_id`) REFERENCES `commits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_commit_items_commit` ON `commit_items` (`commit_id`);--> statement-breakpoint
CREATE INDEX `idx_commit_items_sender` ON `commit_items` (`sender`);--> statement-breakpoint
CREATE TABLE `commits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`execution_id` text NOT NULL,
	`source` text NOT NULL,
	`action_type` text NOT NULL,
	`title` text NOT NULL,
	`email_count` integer NOT NULL,
	`status` text NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`automation_id` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`execution_id`) REFERENCES `executions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_commits_user_created` ON `commits` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_commits_execution` ON `commits` (`execution_id`);--> statement-breakpoint
CREATE INDEX `idx_commits_automation` ON `commits` (`automation_id`);--> statement-breakpoint
CREATE INDEX `idx_commits_status` ON `commits` (`status`);--> statement-breakpoint
CREATE TABLE `executions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`automation_id` text,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`emails_processed` integer DEFAULT 0 NOT NULL,
	`emails_succeeded` integer DEFAULT 0 NOT NULL,
	`emails_failed` integer DEFAULT 0 NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_executions_user_started` ON `executions` (`user_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_executions_automation` ON `executions` (`automation_id`);--> statement-breakpoint
CREATE INDEX `idx_executions_status` ON `executions` (`status`);