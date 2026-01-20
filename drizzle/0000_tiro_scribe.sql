CREATE TABLE `encounters` (
	`id` text PRIMARY KEY NOT NULL,
	`uuid` text NOT NULL,
	`subject_id` text NOT NULL,
	`therapist_id` text NOT NULL,
	`status` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`therapist_id`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `encounters_uuid_unique` ON `encounters` (`uuid`);--> statement-breakpoint
CREATE INDEX `encounters_uuid_idx` ON `encounters` (`uuid`);--> statement-breakpoint
CREATE INDEX `encounters_subject_idx` ON `encounters` (`subject_id`);--> statement-breakpoint
CREATE INDEX `encounters_therapist_idx` ON `encounters` (`therapist_id`);--> statement-breakpoint
CREATE INDEX `encounters_status_idx` ON `encounters` (`status`);--> statement-breakpoint
CREATE TABLE `queue_items` (
	`id` text PRIMARY KEY NOT NULL,
	`encounter_uuid` text NOT NULL,
	`file_path` text NOT NULL,
	`status` text NOT NULL,
	`pipeline_stage` text NOT NULL,
	`progress_percent` integer DEFAULT 0 NOT NULL,
	`auto_process` integer DEFAULT true NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`error_log` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `queue_items_encounter_idx` ON `queue_items` (`encounter_uuid`);--> statement-breakpoint
CREATE INDEX `queue_items_status_idx` ON `queue_items` (`status`);--> statement-breakpoint
CREATE INDEX `queue_items_stage_idx` ON `queue_items` (`pipeline_stage`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`uuid` text NOT NULL,
	`biocode` text NOT NULL,
	`therapist_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`therapist_id`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_uuid_unique` ON `subjects` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_biocode_unique` ON `subjects` (`biocode`);--> statement-breakpoint
CREATE INDEX `subjects_uuid_idx` ON `subjects` (`uuid`);--> statement-breakpoint
CREATE INDEX `subjects_biocode_idx` ON `subjects` (`biocode`);--> statement-breakpoint
CREATE INDEX `subjects_therapist_idx` ON `subjects` (`therapist_id`);--> statement-breakpoint
CREATE TABLE `therapists` (
	`id` text PRIMARY KEY NOT NULL,
	`uuid` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `therapists_uuid_unique` ON `therapists` (`uuid`);--> statement-breakpoint
CREATE INDEX `therapists_uuid_idx` ON `therapists` (`uuid`);--> statement-breakpoint
CREATE TABLE `transcription_segments` (
	`id` text PRIMARY KEY NOT NULL,
	`uuid` text NOT NULL,
	`encounter_id` text NOT NULL,
	`text` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`confidence` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transcription_segments_uuid_unique` ON `transcription_segments` (`uuid`);--> statement-breakpoint
CREATE INDEX `transcription_segments_uuid_idx` ON `transcription_segments` (`uuid`);--> statement-breakpoint
CREATE INDEX `transcription_segments_encounter_idx` ON `transcription_segments` (`encounter_id`);