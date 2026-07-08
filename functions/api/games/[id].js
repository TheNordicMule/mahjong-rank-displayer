/**
 * DELETE /api/games/:id — delete a single game by id
 */

export async function onRequestDelete(context) {
  try {
    const { env, params } = context;
    const { id } = params;

    // Check the game exists first
    const existing = await env.DB.prepare('SELECT id FROM games WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return new Response(JSON.stringify({ error: 'not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CASCADE will remove game_players automatically
    await env.DB.prepare('DELETE FROM games WHERE id = ?').bind(id).run();

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
