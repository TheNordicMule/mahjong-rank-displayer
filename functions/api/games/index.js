/**
 * GET /api/games — return all games ordered by timestamp ASC
 * Supports optional `start` and `end` query params (1-based inclusive range)
 *
 * POST /api/games — create a new game
 * Body: { players: Player[] }  (exactly 4)
 *
 * DELETE /api/games — clear all games
 */

import { asc } from 'drizzle-orm';
import { getDb, games, gamePlayers } from '../../_db.js';

const DEFAULT_UMA = [30, 10, -10, -30];
const DEFAULT_RETURN_SCORE = 25000;

/**
 * Build a Game object from a games row and its associated player rows.
 */
function buildGame(gameRow, playerRows) {
  return {
    id: gameRow.id,
    timestamp: gameRow.timestamp,
    uma: JSON.parse(gameRow.uma),
    returnScore: gameRow.returnScore,
    players: playerRows
      .filter((p) => p.gameId === gameRow.id)
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        name: p.name,
        rawScore: p.rawScore,
        chombo: p.chombo === 1,
      })),
  };
}

/**
 * Validate POST body: must contain exactly 4 players with valid fields.
 */
function validatePlayers(players) {
  if (!Array.isArray(players) || players.length !== 4) {
    return 'Exactly 4 players are required.';
  }
  const names = new Set();
  for (const p of players) {
    if (typeof p.name !== 'string' || p.name.trim() === '') {
      return 'All players must have a non-empty name string.';
    }
    if (typeof p.rawScore !== 'number') {
      return 'All players must have a numeric rawScore.';
    }
    if (names.has(p.name)) {
      return 'Player names must be unique.';
    }
    names.add(p.name);
  }
  return null;
}

export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const db = getDb(env);
    const url = new URL(request.url);
    const startParam = url.searchParams.get('start');
    const endParam = url.searchParams.get('end');

    const [gamesRows, playerRows] = await Promise.all([
      db.select().from(games).orderBy(asc(games.timestamp)),
      db.select().from(gamePlayers).orderBy(asc(gamePlayers.position)),
    ]);

    let gamesList = gamesRows.map((g) => buildGame(g, playerRows));

    // Apply start/end filter (1-based inclusive) only when both are present
    if (startParam !== null && endParam !== null) {
      const start = parseInt(startParam, 10);
      const end = parseInt(endParam, 10);
      if (!isNaN(start) && !isNaN(end) && start >= 1 && end >= start) {
        gamesList = gamesList.slice(start - 1, end);
      }
    }

    return new Response(JSON.stringify({ games: gamesList }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context) {
  try {
    const { env, request } = context;
    const db = getDb(env);

    const body = await request.json();
    const players = body && body.players;

    const validationError = validatePlayers(players);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = Date.now();
    const uma = JSON.stringify(DEFAULT_UMA);
    const returnScore = DEFAULT_RETURN_SCORE;

    // Batch — first statement is game insert, rest are player inserts
    await db.batch([
      db.insert(games).values({ id, timestamp, uma, returnScore }),
      ...players.map((p, i) =>
        db.insert(gamePlayers).values({
          gameId: id,
          position: i,
          name: p.name,
          rawScore: p.rawScore,
          chombo: p.chombo ? 1 : 0,
        })
      ),
    ]);

    const game = {
      id,
      timestamp,
      uma: DEFAULT_UMA,
      returnScore: DEFAULT_RETURN_SCORE,
      players: players.map((p) => ({
        name: p.name,
        rawScore: p.rawScore,
        chombo: p.chombo || false,
      })),
    };

    return new Response(JSON.stringify({ game }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestDelete(context) {
  try {
    const { env } = context;
    const db = getDb(env);

    // Delete game_players first, then games (or rely on CASCADE)
    await db.batch([db.delete(gamePlayers), db.delete(games)]);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
