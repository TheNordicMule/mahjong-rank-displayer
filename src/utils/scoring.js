export const UMA = [30, 10, -10, -30];
export const RETURN_SCORE = 25000;

export function computePoints(rawScore, rank) {
  return (rawScore - RETURN_SCORE) / 1000 + UMA[rank - 1];
}

export function rankPlayers(players) {
  return players
    .map((p, i) => ({ ...p, _index: i }))
    .sort((a, b) => {
      if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
      return a._index - b._index;
    })
    .map((p, i) => ({
      name: p.name,
      rawScore: p.rawScore,
      rank: i + 1
    }));
}

export function processGame(game) {
  const ranked = rankPlayers(game.players);
  const returnScore = game.returnScore ?? RETURN_SCORE;
  const uma = game.uma ?? UMA;
  return ranked.map(p => ({
    name: p.name,
    rawScore: p.rawScore,
    rank: p.rank,
    points: (p.rawScore - returnScore) / 1000 + uma[p.rank - 1]
  }));
}
