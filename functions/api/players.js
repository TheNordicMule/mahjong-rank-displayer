/**
 * GET /api/players — return distinct player names sorted alphabetically
 */

import { asc } from 'drizzle-orm';
import { getDb, gamePlayers } from '../_db.js';

export async function onRequestGet(context) {
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
