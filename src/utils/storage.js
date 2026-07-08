import { RETURN_SCORE } from './scoring';

const STORAGE_KEY = 'mahjong_games';

function getStored() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setStored(games) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function getGames() {
  return getStored();
}

export function addGame(players) {
  const id = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const game = {
    id,
    timestamp: Date.now(),
    players: players.map(p => ({ name: p.name, rawScore: Number(p.rawScore) })),
    uma: [30, 10, -10, -30],
    returnScore: RETURN_SCORE
  };
  const games = getStored();
  games.unshift(game);
  setStored(games);
  return game;
}

export function deleteGame(id) {
  const games = getStored().filter(g => g.id !== id);
  setStored(games);
}

export function getPlayers() {
  const games = getStored();
  const nameSet = new Set();
  games.forEach(g => {
    g.players.forEach(p => {
      if (p.name && p.name.trim()) {
        nameSet.add(p.name.trim());
      }
    });
  });
  return Array.from(nameSet).sort();
}

export function clearAll() {
  setStored([]);
}
