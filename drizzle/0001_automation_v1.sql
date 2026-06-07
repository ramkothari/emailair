ALTER TABLE `automations` ADD `schedule_type` text;
--> statement-breakpoint
ALTER TABLE `automations` ADD `schedule_value` text;
--> statement-breakpoint
ALTER TABLE `automations` ADD `condition_json` text;
--> statement-breakpoint
ALTER TABLE `automations` ADD `action_json` text;
--> statement-breakpoint
ALTER TABLE `automations` ADD `last_run_at` text;
--> statement-breakpoint
ALTER TABLE `automations` ADD `next_run_at` text;
--> statement-breakpoint
CREATE INDEX `idx_automations_due` ON `automations` (`enabled`,`next_run_at`);
--> statement-breakpoint
CREATE TABLE `automation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`automation_id` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL,
	`emails_matched` integer DEFAULT 0 NOT NULL,
	`emails_processed` integer DEFAULT 0 NOT NULL,
	`execution_id` text,
	`commit_id` text,
	`error` text,
	FOREIGN KEY (`automation_id`) REFERENCES `automations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_automation_runs_automation` ON `automation_runs` (`automation_id`);
--> statement-breakpoint
CREATE INDEX `idx_automation_runs_started` ON `automation_runs` (`started_at`);
--> statement-breakpoint
CREATE INDEX `idx_automation_runs_status` ON `automation_runs` (`status`);
