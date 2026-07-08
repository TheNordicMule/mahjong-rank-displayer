/**
 * PUT /api/games/:id — update a game's players (preserves timestamp/uma/return_score)
 */

import { eq } from 'drizzle-orm';
import { getDb, games, gamePlayers } from '../../_db.js';

/**
 * Validate PUT body: must contain exactly 4 players with valid fields.
 * (Duplicated from index.js to avoid refactoring.)
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

export async function onRequestPut(context) {
  try {
    const { env, params, request } = context;
    const { id } = params;
    const db = getDb(env);

    // Check the game exists and read its current data
    const [gameRow] = await db
      .select()
      .from(games)
      .where(eq(games.id, id))
      .limit(1);

    if (!gameRow) {
      return new Response(JSON.stringify({ error: 'not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const players = body && body.players;

    const validationError = validatePlayers(players);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Batch: delete old players, insert new ones
    await db.batch([
      db.delete(gamePlayers).where(eq(gamePlayers.gameId, id)),
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
      timestamp: gameRow.timestamp,
      uma: JSON.parse(gameRow.uma),
      returnScore: gameRow.returnScore,
      players: players.map((p) => ({
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * DELETE /api/games/:id — delete a single game by id
 */

export async function onRequestDelete(context) {
  try {
    const { env, params } = context;
    const { id } = params;
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
