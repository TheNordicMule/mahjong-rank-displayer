/**
 * PUT /api/games/:id — update a game's players (preserves timestamp/uma/return_score)
 */

import { eq } from 'drizzle-orm';
import { getDb, games, gamePlayers } from '../../_db';
import type { Env } from '../../types';
import type { Player } from '../../../src/types';

/**
 * Validate PUT body: must contain exactly 4 players with valid fields.
 * (Duplicated from index.js to avoid refactoring.)
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

export async function onRequestPut(context: EventContext<Env, 'id', unknown>): Promise<Response> {
  try {
    const { env, params, request } = context;
    const id = params.id as string;
    const db = getDb(env);

    // Check the game exists and read its current data
    const [gameRow] = await db.select().from(games).where(eq(games.id, id)).limit(1);

    if (!gameRow) {
      return new Response(JSON.stringify({ error: 'not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
      if (!Array.isArray(requestedUma) || requestedUma.length !== 4 || requestedUma.some((v: unknown) => typeof v !== 'number')) {
        return new Response(JSON.stringify({ error: 'uma must be an array of exactly 4 numbers.' }), {
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

    // Use provided values or fall back to existing game row values
    const uma: number[] = (requestedUma as number[]) ?? (JSON.parse(gameRow.uma) as number[]);
    const returnScore: number = (requestedReturnScore as number) ?? gameRow.returnScore;

    // Batch: delete old players, insert new ones; update game uma/returnScore
    await db.batch([
      db.update(games)
        .set({ uma: JSON.stringify(uma), returnScore })
        .where(eq(games.id, id)),
      db.delete(gamePlayers).where(eq(gamePlayers.gameId, id)),
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
      timestamp: gameRow.timestamp,
      uma,
      returnScore,
      players: validPlayers.map((p) => ({
        name: p.name,
        rawScore: p.rawScore,
        chombo: p.chombo ? true : false,
      })),
    };

    return new Response(JSON.stringify({ game }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * DELETE /api/games/:id — delete a single game by id
 */

export async function onRequestDelete(
  context: EventContext<Env, 'id', unknown>,
): Promise<Response> {
  try {
    const { env, params } = context;
    const id = params.id as string;
    const db = getDb(env);

    // Check the game exists first
    const [existing] = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.id, id))
      .limit(1);

    if (!existing) {
      return new Response(JSON.stringify({ error: 'not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CASCADE will remove game_players automatically
    await db.delete(games).where(eq(games.id, id));

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
