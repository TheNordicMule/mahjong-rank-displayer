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
import { getDb, games, gamePlayers } from '../../_db';
import type { Env } from '../../types';
import type { Game, Player } from '../../../src/types';

/***** Defaults used when request body omits uma / returnScore *****/
const DEFAULT_UMA = [30, 10, -10, -30];
const DEFAULT_RETURN_SCORE = 25000;

type GameRow = typeof games.$inferSelect;
type GamePlayerRow = typeof gamePlayers.$inferSelect;

/**
 * Build a Game object from a games row and its associated player rows.
 */
function buildGame(gameRow: GameRow, playerRows: GamePlayerRow[]): Game {
  return {
    id: gameRow.id,
    timestamp: gameRow.timestamp,
    uma: JSON.parse(gameRow.uma) as number[],
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
function validatePlayers(players: unknown): string | null {
  if (!Array.isArray(players) || players.length !== 4) {
    return 'Exactly 4 players are required.';
  }
  const names = new Set<string>();
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

export async function onRequestGet(context: EventContext<Env, string, unknown>): Promise<Response> {
  try {
    const { env, request } = context;
    const db = getDb(env);
    const url = new URL(request.url);
    const startParam = url.searchParams.get('start');
    const endParam = url.searchParams.get('end');
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');

    const [gamesRows, playerRows] = await Promise.all([
      db.select().from(games).orderBy(asc(games.timestamp)),
      db.select().from(gamePlayers).orderBy(asc(gamePlayers.position)),
    ]);

    let gamesList = gamesRows.map((g) => buildGame(g, playerRows));

    // Apply start/end filter (1-based inclusive index range) only when both are present
    if (startParam !== null && endParam !== null) {
      const start = parseInt(startParam, 10);
      const end = parseInt(endParam, 10);
      if (!isNaN(start) && !isNaN(end) && start >= 1 && end >= start) {
        gamesList = gamesList.slice(start - 1, end);
      }
    }

    // Apply startDate/endDate filter (inclusive timestamp range) when either is present
    if (startDateParam !== null || endDateParam !== null) {
      const startDate = startDateParam !== null ? parseInt(startDateParam, 10) : NaN;
      const endDate = endDateParam !== null ? parseInt(endDateParam, 10) : NaN;
      const hasValidStart = !isNaN(startDate);
      const hasValidEnd = !isNaN(endDate);
      if (hasValidStart || hasValidEnd) {
        gamesList = gamesList.filter((g) => {
          if (hasValidStart && g.timestamp < startDate) return false;
          if (hasValidEnd && g.timestamp > endDate) return false;
          return true;
        });
      }
    }

    return new Response(JSON.stringify({ games: gamesList }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function validateUma(uma: unknown): string | null {
  if (!Array.isArray(uma) || uma.length !== 4) {
    return 'uma must be an array of exactly 4 numbers.';
  }
  for (const v of uma) {
    if (typeof v !== 'number') {
      return 'All uma values must be numbers.';
    }
  }
  return null;
}

export async function onRequestPost(
  context: EventContext<Env, string, unknown>,
): Promise<Response> {
  try {
    const { env, request } = context;
    const db = getDb(env);

    const body = (await request.json()) as { players?: unknown; uma?: unknown; returnScore?: unknown };
    const players = body && body.players;
    const requestedUma = body && body.uma;
    const requestedReturnScore = body && body.returnScore;

    const validationError = validatePlayers(players);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (requestedUma !== undefined) {
      const umaErr = validateUma(requestedUma);
      if (umaErr) {
        return new Response(JSON.stringify({ error: umaErr }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (requestedReturnScore !== undefined && typeof requestedReturnScore !== 'number') {
      return new Response(JSON.stringify({ error: 'returnScore must be a number.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validPlayers = players as Player[];
    const uma: number[] = (requestedUma as number[]) ?? DEFAULT_UMA;
    const returnScore: number = (requestedReturnScore as number) ?? DEFAULT_RETURN_SCORE;

    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = Date.now();

    // Batch — first statement is game insert, rest are player inserts
    await db.batch([
      db.insert(games).values({ id, timestamp, uma: JSON.stringify(uma), returnScore }),
      ...validPlayers.map((p, i) =>
        db.insert(gamePlayers).values({
          gameId: id,
          position: i,
          name: p.name,
          rawScore: p.rawScore,
          chombo: p.chombo ? 1 : 0,
        }),
      ),
    ]);

    const game = {
      id,
      timestamp,
      uma,
      returnScore,
      players: validPlayers.map((p) => ({
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
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestDelete(
  context: EventContext<Env, string, unknown>,
): Promise<Response> {
  try {
    const { env } = context;
    const db = getDb(env);

    // Delete game_players first, then games (or rely on CASCADE)
    await db.batch([db.delete(gamePlayers), db.delete(games)]);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
