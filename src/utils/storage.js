const BASE = '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getGames() {
  const data = await request('/api/games');
  return data.games;
}

export async function getGamesRange(start, end) {
  const data = await request(`/api/games?start=${start}&end=${end}`);
  return data.games;
}

export async function addGame(players) {
  const data = await request('/api/games', {
    method: 'POST',
    body: JSON.stringify({ players }),
  });
  return data.game;
}

export async function deleteGame(id) {
  await request(`/api/games/${id}`, { method: 'DELETE' });
}

export async function clearAll() {
  await request('/api/games', { method: 'DELETE' });
}

export async function getPlayers() {
  const data = await request('/api/players');
  return data.players;
}

export async function getLatestNames() {
  const data = await request('/api/games/latest-names');
  return data.names;
}
