/**
 * GET /api/players — return distinct player names sorted alphabetically
 */

import { asc } from 'drizzle-orm';
import { getDb, gamePlayers } from '../_db';
import type { Env } from '../types';

export async function onRequestGet(context: EventContext<Env, string, unknown>): Promise<Response> {
  try {
    const { env } = context;
    const db = getDb(env);

    const rows = await db
      .selectDistinct({ name: gamePlayers.name })
      .from(gamePlayers)
      .orderBy(asc(gamePlayers.name));

    const players = rows.map((r) => r.name);

    return new Response(JSON.stringify({ players }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
