CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  uma TEXT NOT NULL,            -- JSON-encoded array, e.g. "[30,10,-10,-30]"
  return_score INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS game_players (
  game_id TEXT NOT NULL,
  position INTEGER NOT NULL,    -- 0-3 input order
  name TEXT NOT NULL,
  raw_score INTEGER NOT NULL,
  chombo INTEGER NOT NULL DEFAULT 0,  -- 0/1 boolean
  PRIMARY KEY (game_id, position),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_games_timestamp ON games(timestamp);
CREATE INDEX IF NOT EXISTS idx_game_players_name ON game_players(name);
