import { sqliteTable, text, integer, primaryKey, foreignKey, index } from 'drizzle-orm/sqlite-core';

export const games = sqliteTable(
  'games',
  {
    id: text('id').primaryKey(),
    timestamp: integer('timestamp').notNull(),
    uma: text('uma').notNull(), // JSON-encoded array string
    returnScore: integer('return_score').notNull(),
  },
  (table) => ({
    timestampIdx: index('idx_games_timestamp').on(table.timestamp),
  }),
);

export const gamePlayers = sqliteTable(
  'game_players',
  {
    gameId: text('game_id').notNull(),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    rawScore: integer('raw_score').notNull(),
    chombo: integer('chombo').notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.gameId, table.position] }),
    gameFk: foreignKey({
      columns: [table.gameId],
      foreignColumns: [games.id],
    }).onDelete('cascade'),
    nameIdx: index('idx_game_players_name').on(table.name),
  }),
);
