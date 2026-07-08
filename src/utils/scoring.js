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
      rank: i + 1,
      chombo: !!p.chombo
    }));
}

export function processGame(game) {
  const ranked = rankPlayers(game.players);
  const returnScore = game.returnScore ?? RETURN_SCORE;
  const uma = game.uma ?? UMA;
  const chomboCount = (game.players || []).filter(p => p.chombo).length;
  return ranked.map(p => {
    const normalPoints = (p.rawScore - returnScore) / 1000 + uma[p.rank - 1];
    let adjustment = 0;
    if (chomboCount > 0) {
      adjustment = p.chombo
        ? (-30 + 10 * (chomboCount - 1))
        : (10 * chomboCount);
    }
    return {
      name: p.name,
      rawScore: p.rawScore,
      rank: p.rank,
      chombo: p.chombo,
      // All point components are multiples of 0.1; round to 1 decimal to
      // avoid float artifacts like 5.299999999999997 from surfacing in the UI.
      points: Math.round((normalPoints + adjustment) * 10) / 10
    };
  });
}
