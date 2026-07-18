// Shared domain types used across the frontend and backend (Pages Functions).

/** A player's data within a game (API contract). */
export interface Player {
  name: string;
  rawScore: number;
  chombo: boolean;
}

/** A complete game record. */
export interface Game {
  id: string;
  timestamp: number;
  uma: number[];
  returnScore: number;
  players: Player[];
}

/** A player after scoring/ranking is applied. */
export interface ProcessedPlayer {
  name: string;
  rawScore: number;
  rank: number;
  chombo: boolean;
  points: number;
}

/** Placement distribution keyed by rank (1 = top, 4 = bottom). */
export type Placement = Record<number, number>;

/** Aggregated stats for a single player across games. */
export interface PlayerStats {
  totalGames: number;
  avgRank: number;
  placement: Placement;
  avgScore: number;
  totalPoints: number;
  lastRanks: number[];
  totalChombos: number;
  top2Rate: number;
  bestPoints: number;
  worstPoints: number;
}

/** A single leaderboard row. */
export interface LeaderboardEntry {
  name: string;
  games: number;
  avgRank: number;
  totalPoints: number;
  placement: Placement;
  totalChombos: number;
  top2Rate: number;
}

/** A point on the cumulative points trend. */
export interface TrendPoint {
  points: number;
  cumulative: number;
  timestamp: number;
}
