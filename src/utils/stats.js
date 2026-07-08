import { processGame } from './scoring';

export function getLastRanks(games, playerName, x) {
  const ranks = [];
  for (const game of games) {
    if (ranks.length >= x) break;
    const processed = processGame(game);
    const entry = processed.find(p => p.name === playerName);
    if (entry) {
      ranks.push(entry.rank);
    }
  }
  return ranks.reverse();
}

export function getPlayerStats(games, playerName) {
  const relevant = [];
  for (const game of games) {
    const processed = processGame(game);
    const entry = processed.find(p => p.name === playerName);
    if (entry) {
      relevant.push(entry);
    }
  }

  const totalGames = relevant.length;

  if (totalGames === 0) {
    return {
      totalGames: 0,
      avgRank: 0,
      placement: { 1: 0, 2: 0, 3: 0, 4: 0 },
      avgScore: 0,
      totalPoints: 0,
      lastRanks: []
    };
  }

  const placementCount = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let sumRank = 0;
  let sumScore = 0;
  let sumPoints = 0;

  relevant.forEach(e => {
    placementCount[e.rank] = (placementCount[e.rank] || 0) + 1;
    sumRank += e.rank;
    sumScore += e.rawScore;
    sumPoints += e.points;
  });

  const avgRank = Math.round((sumRank / totalGames) * 100) / 100;
  const avgScore = Math.round((sumScore / totalGames) * 100) / 100;
  const totalPoints = Math.round(sumPoints * 100) / 100;

  const placement = {};
  for (const r of [1, 2, 3, 4]) {
    placement[r] = Math.round((placementCount[r] / totalGames) * 1000) / 10;
  }

  const lastRanks = getLastRanks(games, playerName, 10);

  return { totalGames, avgRank, placement, avgScore, totalPoints, lastRanks };
}

export function getLeaderboard(games) {
  const playerMap = {};

  for (const game of games) {
    const processed = processGame(game);
    processed.forEach(e => {
      if (!playerMap[e.name]) {
        playerMap[e.name] = {
          name: e.name,
          games: 0,
          sumRank: 0,
          sumPoints: 0,
          placementCount: { 1: 0, 2: 0, 3: 0, 4: 0 }
        };
      }
      playerMap[e.name].games += 1;
      playerMap[e.name].sumRank += e.rank;
      playerMap[e.name].sumPoints += e.points;
      playerMap[e.name].placementCount[e.rank] += 1;
    });
  }

  const leaderboard = Object.values(playerMap).map(p => {
    const avgRank = p.games > 0 ? Math.round((p.sumRank / p.games) * 100) / 100 : 0;
    const totalPoints = Math.round(p.sumPoints * 100) / 100;
    const placement = {};
    for (const r of [1, 2, 3, 4]) {
      placement[r] = p.games > 0 ? Math.round((p.placementCount[r] / p.games) * 1000) / 10 : 0;
    }
    return { name: p.name, games: p.games, avgRank, totalPoints, placement };
  });

  leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
  return leaderboard;
}
