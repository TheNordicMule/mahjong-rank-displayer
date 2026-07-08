/**
 * GET /api/games — return all games ordered by timestamp ASC
 * Supports optional `start` and `end` query params (1-based inclusive range)
 *
 * POST /api/games — create a new game
 * Body: { players: Player[] }  (exactly 4)
 *
 * DELETE /api/games — clear all games
 */

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
    returnScore: gameRow.return_score,
    players: playerRows
      .filter((p) => p.game_id === gameRow.id)
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        name: p.name,
        rawScore: p.raw_score,
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
    const url = new URL(request.url);
    const startParam = url.searchParams.get('start');
    const endParam = url.searchParams.get('end');

    const [gamesRows, playerRows] = await Promise.all([
      env.DB.prepare('SELECT * FROM games ORDER BY timestamp ASC').all(),
      env.DB.prepare('SELECT * FROM game_players ORDER BY position ASC').all(),
    ]);

    let games = gamesRows.results.map((g) => buildGame(g, playerRows.results));

    // Apply start/end filter (1-based inclusive) only when both are present
    if (startParam !== null && endParam !== null) {
      const start = parseInt(startParam, 10);
      const end = parseInt(endParam, 10);
      if (!isNaN(start) && !isNaN(end) && start >= 1 && end >= start) {
        games = games.slice(start - 1, end);
      }
    }

    return new Response(JSON.stringify({ games }), {
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

    const insertGame = env.DB.prepare(
      'INSERT INTO games (id, timestamp, uma, return_score) VALUES (?, ?, ?, ?)'
    ).bind(id, timestamp, uma, returnScore);

    const insertPlayers = players.map((p, i) =>
      env.DB.prepare(
        'INSERT INTO game_players (game_id, position, name, raw_score, chombo) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, i, p.name, p.rawScore, p.chombo ? 1 : 0)
    );

    // Batch — first statement is game insert, rest are player inserts
    await env.DB.batch([insertGame, ...insertPlayers]);

    const game = {
      id,
      timestamp,
      uma: DEFAULT_UMA,
      returnScore: DEFAULT_RETURN_SCORE,
      players: players.map((p, i) => ({
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

    // Delete game_players first, then games (or rely on CASCADE)
    await env.DB.batch([
      env.DB.prepare('DELETE FROM game_players'),
      env.DB.prepare('DELETE FROM games'),
    ]);

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
