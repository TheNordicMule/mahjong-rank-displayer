import type { Game, PlayerStats, LeaderboardEntry, TrendPoint, Placement } from '../types';
import { processGame } from './scoring';

// Returns the player's rank for their x most recent games,
// with the most recent on the left and the oldest of the x on the right.
// `games` is expected to be sorted oldest→newest (timestamp ASC).
export function getLastRanks(games: Game[], playerName: string, x: number): number[] {
  const ranks: number[] = [];
  for (let i = games.length - 1; i >= 0 && ranks.length < x; i--) {
    const processed = processGame(games[i]);
    const entry = processed.find((p) => p.name === playerName);
    if (entry) {
      ranks.push(entry.rank);
    }
  }
  return ranks;
}

// Returns cumulative points trend oldest→newest.
// Each entry: { points (that game), cumulative, timestamp }.
// `games` is expected to be sorted oldest→newest (timestamp ASC).
export function getPointsTrend(games: Game[], playerName: string): TrendPoint[] {
  const trend: TrendPoint[] = [];
  let cumulative = 0;
  for (const game of games) {
    const processed = processGame(game);
    const entry = processed.find((p) => p.name === playerName);
    if (entry) {
      cumulative += entry.points;
      trend.push({
        points: entry.points,
        cumulative,
        timestamp: game.timestamp,
      });
    }
  }
  return trend;
}

export function getPlayerStats(games: Game[], playerName: string): PlayerStats {
  const relevant: {
    name: string;
    rawScore: number;
    rank: number;
    chombo: boolean;
    points: number;
  }[] = [];
  for (const game of games) {
    const processed = processGame(game);
    const entry = processed.find((p) => p.name === playerName);
    if (entry) {
      relevant.push(entry);
    }
  }

  const totalGames = relevant.length;

  if (totalGames === 0) {
    return {
      totalGames: 0,
      avgRank: 0,
      placement: { 1: 0, 2: 0, 3: 0, 4: 0 } as Placement,
      avgScore: 0,
      totalPoints: 0,
      lastRanks: [],
      totalChombos: 0,
      top2Rate: 0,
      bestPoints: 0,
      worstPoints: 0,
    };
  }

  const placementCount: Placement = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let sumRank = 0;
  let sumScore = 0;
  let sumPoints = 0;
  let sumChombos = 0;
  let bestPoints = -Infinity;
  let worstPoints = Infinity;

  relevant.forEach((e) => {
    placementCount[e.rank] = (placementCount[e.rank] || 0) + 1;
    sumRank += e.rank;
    sumScore += e.rawScore;
    sumPoints += e.points;
    if (e.chombo) sumChombos += 1;
    if (e.points > bestPoints) bestPoints = e.points;
    if (e.points < worstPoints) worstPoints = e.points;
  });

  const avgRank = Math.round((sumRank / totalGames) * 100) / 100;
  const avgScore = Math.round((sumScore / totalGames) * 100) / 100;
  const totalPoints = Math.round(sumPoints * 100) / 100;
  const top2Count = (placementCount[1] || 0) + (placementCount[2] || 0);
  const top2Rate = Math.round((top2Count / totalGames) * 1000) / 10;

  const placement: Placement = {};
  for (const r of [1, 2, 3, 4]) {
    placement[r] = Math.round((placementCount[r] / totalGames) * 1000) / 10;
  }

  const lastRanks = getLastRanks(games, playerName, 10);

  return {
    totalGames,
    avgRank,
    placement,
    avgScore,
    totalPoints,
    lastRanks,
    totalChombos: sumChombos,
    top2Rate,
    bestPoints,
    worstPoints,
  };
}

export function getLeaderboard(games: Game[]): LeaderboardEntry[] {
  const playerMap: Record<
    string,
    { name: string; games: number; sumRank: number; sumPoints: number; placementCount: Placement; chomboCount: number }
  > = {};

  for (const game of games) {
    const processed = processGame(game);
    processed.forEach((e) => {
      if (!playerMap[e.name]) {
        playerMap[e.name] = {
          name: e.name,
          games: 0,
          sumRank: 0,
          sumPoints: 0,
          placementCount: { 1: 0, 2: 0, 3: 0, 4: 0 },
          chomboCount: 0,
        };
      }
      playerMap[e.name].games += 1;
      playerMap[e.name].sumRank += e.rank;
      playerMap[e.name].sumPoints += e.points;
      playerMap[e.name].placementCount[e.rank] += 1;
      if (e.chombo) playerMap[e.name].chomboCount += 1;
    });
  }

  const leaderboard = Object.values(playerMap).map((p) => {
    const avgRank = p.games > 0 ? Math.round((p.sumRank / p.games) * 100) / 100 : 0;
    const totalPoints = Math.round(p.sumPoints * 100) / 100;
    const placement: Placement = {};
    for (const r of [1, 2, 3, 4]) {
      placement[r] = p.games > 0 ? Math.round((p.placementCount[r] / p.games) * 1000) / 10 : 0;
    }
    const top2Count = (p.placementCount[1] || 0) + (p.placementCount[2] || 0);
    const top2Rate = p.games > 0 ? Math.round((top2Count / p.games) * 1000) / 10 : 0;
    return {
      name: p.name,
      games: p.games,
      avgRank,
      totalPoints,
      placement,
      totalChombos: p.chomboCount,
      top2Rate,
    };
  });

  leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
  return leaderboard;
}
