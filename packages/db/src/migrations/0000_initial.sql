CREATE TABLE `upstream_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`last_success_at` integer NOT NULL,
	`last_changed_at` integer NOT NULL
);
