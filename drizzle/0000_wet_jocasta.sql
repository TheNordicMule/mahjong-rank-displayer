CREATE TABLE `game_players` (
	`game_id` text NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`raw_score` integer NOT NULL,
	`chombo` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`game_id`, `position`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_game_players_name` ON `game_players` (`name`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
	`uma` text NOT NULL,
	`return_score` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_games_timestamp` ON `games` (`timestamp`);