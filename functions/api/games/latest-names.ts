/**
 * GET /api/games/latest-names — return the 4 player names from the most recent game
 */

import { eq, asc, desc } from 'drizzle-orm';
import { getDb, games, gamePlayers } from '../../_db';
import type { Env } from '../../types';

export async function onRequestGet(context: EventContext<Env, string, unknown>): Promise<Response> {
  try {
    const { env } = context;
    const db = getDb(env);

    // Get the most recent game's id (highest timestamp)
    const [latest] = await db
      .select({ id: games.id })
      .from(games)
      .orderBy(desc(games.timestamp))
      .limit(1);

    if (!latest) {
      return new Response(JSON.stringify({ names: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rows = await db
      .select({ name: gamePlayers.name })
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, latest.id))
      .orderBy(asc(gamePlayers.position));

    const names = rows.map((r) => r.name);

    return new Response(JSON.stringify({ names }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
