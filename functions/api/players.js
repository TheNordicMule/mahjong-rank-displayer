/**
 * GET /api/players — return distinct player names sorted alphabetically
 */

export async function onRequestGet(context) {
  try {
    const { env } = context;

    const result = await env.DB.prepare(
      'SELECT DISTINCT name FROM game_players ORDER BY name ASC'
    ).all();

    const players = result.results.map((r) => r.name);

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
