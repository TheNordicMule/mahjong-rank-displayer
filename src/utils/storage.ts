import type { Game, Player } from '../types';

const BASE: string = '';

interface GamesResponse {
  games: Game[];
}

interface GameResponse {
  game: Game;
}

interface PlayersResponse {
  players: string[];
}

interface NamesResponse {
  names: string[];
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getGames(): Promise<Game[]> {
  const data = await request<GamesResponse>('/api/games');
  return data.games;
}

export async function getGamesRange(start: number, end: number): Promise<Game[]> {
  const data = await request<GamesResponse>(`/api/games?start=${start}&end=${end}`);
  return data.games;
}

export async function addGame(players: Player[]): Promise<Game> {
  const data = await request<GameResponse>('/api/games', {
    method: 'POST',
    body: JSON.stringify({ players }),
  });
  return data.game;
}

export async function updateGame(id: string, players: Player[]): Promise<Game> {
  const data = await request<GameResponse>(`/api/games/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ players }),
  });
  return data.game;
}

export async function deleteGame(id: string): Promise<void> {
  await request(`/api/games/${id}`, { method: 'DELETE' });
}

export async function clearAll(): Promise<void> {
  await request('/api/games', { method: 'DELETE' });
}

export async function getPlayers(): Promise<string[]> {
  const data = await request<PlayersResponse>('/api/players');
  return data.players;
}

export async function getLatestNames(): Promise<string[]> {
  const data = await request<NamesResponse>('/api/games/latest-names');
  return data.names;
}
