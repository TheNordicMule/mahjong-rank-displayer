/**
 * GET /api/games/latest-names — return the 4 player names from the most recent game
 */

export async function onRequestGet(context) {
  try {
    const { env } = context;

    // Get the most recent game's id (highest timestamp)
    const latest = await env.DB.prepare(
      'SELECT id FROM games ORDER BY timestamp DESC LIMIT 1'
    ).first();

    if (!latest) {
      return new Response(JSON.stringify({ names: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const playerRows = await env.DB.prepare(
      'SELECT name FROM game_players WHERE game_id = ? ORDER BY position ASC'
    )
      .bind(latest.id)
      .all();

    const names = playerRows.results.map((r) => r.name);

    return new Response(JSON.stringify({ names }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
