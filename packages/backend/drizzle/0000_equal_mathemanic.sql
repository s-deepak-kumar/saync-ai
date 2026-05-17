CREATE TABLE `contract_results` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`contract_name` text NOT NULL,
	`component_name` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer NOT NULL,
	`error_message` text,
	`expected_value` text,
	`observed_value` text,
	`file_path` text,
	`line_number` integer,
	`stack_trace` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `issue_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`run_id` text NOT NULL,
	`result_id` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`result_id`) REFERENCES `contract_results`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `issues` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`contract_name` text NOT NULL,
	`component_name` text NOT NULL,
	`error_message` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`severity` text DEFAULT 'medium' NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`occurrence_count` integer DEFAULT 1 NOT NULL,
	`dedup_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `production_violations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`contract_name` text NOT NULL,
	`component_name` text NOT NULL,
	`error_message` text NOT NULL,
	`expected_value` text,
	`observed_value` text,
	`session_id` text NOT NULL,
	`user_agent` text NOT NULL,
	`viewport_width` integer NOT NULL,
	`viewport_height` integer NOT NULL,
	`url` text NOT NULL,
	`timestamp` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`total_contracts` integer NOT NULL,
	`passed_contracts` integer DEFAULT 0 NOT NULL,
	`failed_contracts` integer DEFAULT 0 NOT NULL,
	`environment` text NOT NULL,
	`viewport` text,
	`git_branch` text,
	`git_commit` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `issues_dedup_hash_unique` ON `issues` (`dedup_hash`);--> statement-breakpoint
CREATE INDEX `dedup_hash_idx` ON `issues` (`dedup_hash`);--> statement-breakpoint
CREATE INDEX `project_status_idx` ON `issues` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `project_timestamp_idx` ON `production_violations` (`project_id`,`timestamp`);