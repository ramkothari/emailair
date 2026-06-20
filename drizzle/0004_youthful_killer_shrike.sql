CREATE TABLE `google_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`google_id` text NOT NULL,
	`encrypted_refresh_token` text NOT NULL,
	`encrypted_access_token` text,
	`access_token_expires_at` text,
	`scopes` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_credentials_user_id_unique` ON `google_credentials` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `google_credentials_google_id_unique` ON `google_credentials` (`google_id`);--> statement-breakpoint
CREATE INDEX `idx_google_credentials_user` ON `google_credentials` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_google_credentials_google_id` ON `google_credentials` (`google_id`);