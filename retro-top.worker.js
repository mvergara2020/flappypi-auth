const RETRO_GAME_TYPE = "flappy_retro";
const RETRO_SEASON_ID = "S5";

function normalizeGameType(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function allowedOrigin(request) {
  const origin = request.headers.get("Origin") || "";
  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.81:3000",
    "https://192.168.1.81:3000",
    "https://qa.classic.flappypi.com",
    "https://classic.flappypi.com"
  ].includes(origin) ? origin : "";
}

function json(request, body, status = 200) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  const origin = allowedOrigin(request);
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export async function routeRetroGameTop(request, env, url = new URL(request.url)) {
  if (request.method !== "GET" || url.pathname !== "/tops/game") return null;
  const gameType = normalizeGameType(url.searchParams.get("game_type"));
  if (gameType !== RETRO_GAME_TYPE) return null;

  const limit = Math.max(1, Math.min(20, Number(url.searchParams.get("limit")) || 3));
  const rows = await env.DB.prepare(`
    SELECT
      u.name,
      u.user_name,
      u.bird_color,
      s.game_type,
      COALESCE(s.season_points, 0) AS season_points,
      COALESCE(s.total_points, 0) AS total_points,
      COALESCE(s.best_score, 0) AS best_score,
      COALESCE(s.games_played, 0) AS games_played
    FROM user_game_stats s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.game_type = ?
      AND s.season_id = ?
      AND COALESCE(s.season_points, 0) > 0
    ORDER BY s.season_points DESC, s.updated_at ASC
    LIMIT ?
  `).bind(RETRO_GAME_TYPE, RETRO_SEASON_ID, limit).all();

  return json(request, {
    ok: true,
    game_type: RETRO_GAME_TYPE,
    season_id: RETRO_SEASON_ID,
    top: rows?.results || []
  });
}
