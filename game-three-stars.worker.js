const DECORATED_PATHS = new Set(["/game/stage/finish", "/game/stage/score", "/game/stage-stars"]);
const POINT_GAMES = new Set(["tetriz_999", "flappypi_999", "fusion_999", "pollito_lanzador_2d_retro", "pollito_lanzador_3d", "sumas_arcade", "finger_shape_precision", "slice_percent", "ninja_chicken_999"]);
const ALLOWED_BOOSTS = new Set([1, 3, 5, 8]);
const CURRENT_SEASON_ID = "S5";
let starSchemaPromise = null;
let runSchemaPromise = null;

function normalizeGameType(value) {
  return String(value || "").trim().toLowerCase().replace(/-/g, "_").replace(/[^a-z0-9_]/g, "");
}

function normalizeScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(1000000, Math.floor(score)));
}

function decodeBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(String(value || "").length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), char => char.charCodeAt(0));
}

async function verifyJWT(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("JWT_FORMAT");
  const [header64, payload64, signature64] = parts;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret || "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    decodeBase64Url(signature64),
    new TextEncoder().encode(`${header64}.${payload64}`)
  );
  if (!valid) throw new Error("JWT_SIGNATURE");
  const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload64)));
  if (payload?.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) throw new Error("JWT_EXPIRED");
  return payload;
}

function ensureStarSchema(env) {
  if (starSchemaPromise) return starSchemaPromise;
  starSchemaPromise = env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS game_stage_star_rewards (
      game_uid TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      game_type TEXT NOT NULL,
      level_id INTEGER NOT NULL,
      stars INTEGER NOT NULL,
      performance TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      applied_at INTEGER
    )
  `).run().catch(error => {
    starSchemaPromise = null;
    throw error;
  });
  return starSchemaPromise;
}

function ensureRunSchema(env) {
  if (runSchemaPromise) return runSchemaPromise;
  runSchemaPromise = env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS game_stage_run_scores (
      run_nonce TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      game_type TEXT NOT NULL,
      stage INTEGER NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      applied_at INTEGER
    )
  `).run().catch(error => {
    runSchemaPromise = null;
    throw error;
  });
  return runSchemaPromise;
}

function boostFrom(data = {}, existing = null) {
  const explicit = Number(data.boost_multiplier || 0);
  if (ALLOWED_BOOSTS.has(explicit)) return explicit;
  const rating = Math.max(1, Number(data.rating_stars || data.stars || 0));
  const awarded = Number(data.stars_awarded || existing?.stars || 0);
  const inferred = awarded > 0 ? awarded / rating : 1;
  if (ALLOWED_BOOSTS.has(inferred)) return inferred;
  const stored = Number(existing?.stars || 0);
  const storedMultiplier = stored > 0 && stored % 3 === 0 ? stored / 3 : 1;
  return ALLOWED_BOOSTS.has(storedMultiplier) ? storedMultiplier : 1;
}

async function requestBody(request) {
  try { return await request.clone().json(); }
  catch (_) { return {}; }
}

async function resolveContext(request, env, path, data = {}) {
  const body = await requestBody(request);
  let gameUid = String(data?.game_uid || body?.game_uid || "").trim();
  let userId = "";
  let gameType = normalizeGameType(data?.game_type);
  let stage = Math.max(0, Number(data?.completed_stage || data?.stage || data?.level_id || 0));
  let nonce = "";

  if (path === "/game/stage/finish" || path === "/game/stage/score") {
    const token = body?.stage_token || body?.token;
    if (token) {
      try {
        const payload = await verifyJWT(token, env.JWT_SECRET);
        userId = String(payload?.sub || "");
        gameType = normalizeGameType(payload?.game_type || gameType);
        stage = Math.max(1, Number(payload?.stage || payload?.level_id || stage || 1));
        nonce = String(payload?.nonce || "").trim();
        if (!gameUid && nonce) gameUid = `${gameType}:${nonce}`;
      } catch (_) {}
    }
  }

  let existing = null;
  if (gameUid) {
    existing = await env.DB.prepare(`
      SELECT game_uid,user_id,game_type,level_id,stars,performance,attempts,applied_at
      FROM game_stage_star_rewards WHERE game_uid = ? LIMIT 1
    `).bind(gameUid).first();
  }

  if (existing) {
    userId ||= String(existing.user_id || "");
    gameType ||= normalizeGameType(existing.game_type);
    stage ||= Math.max(1, Number(existing.level_id || 1));
  }

  if (!gameUid || !userId || !gameType || stage < 1) return null;
  return { gameUid, userId, gameType, stage, nonce, body, existing };
}

async function stageMatches(env, context) {
  const progress = await env.DB.prepare(`
    SELECT max_level_unlocked FROM user_game_progress
    WHERE user_id = ? AND game_type = ? LIMIT 1
  `).bind(context.userId, context.gameType).first();
  return !progress || Number(progress.max_level_unlocked || 1) === Number(context.stage);
}

async function applyRunPoints(env, context, rawScore, completed, boostMultiplier = 1) {
  if (!POINT_GAMES.has(context.gameType) || !context.nonce) return null;
  await ensureRunSchema(env);
  const now = Date.now();
  const boost = ALLOWED_BOOSTS.has(Number(boostMultiplier)) ? Number(boostMultiplier) : 1;
  const basePoints = normalizeScore(rawScore);
  const points = Math.min(1000000, basePoints * boost);

  const results = await env.DB.batch([
    env.DB.prepare(`
      INSERT OR IGNORE INTO game_stage_run_scores (
        run_nonce,user_id,game_type,stage,points,completed,created_at,applied_at
      ) VALUES (?,?,?,?,?,?,?,NULL)
    `).bind(context.nonce, context.userId, context.gameType, context.stage, points, completed ? 1 : 0, now),
    env.DB.prepare(`
      INSERT INTO user_game_stats (
        user_id,game_type,total_points,season_points,season_id,
        best_score,total_pipes,games_played,updated_at
      )
      SELECT ?,?,?,?,?,?,0,1,?
      WHERE EXISTS (
        SELECT 1 FROM game_stage_run_scores
        WHERE run_nonce = ? AND user_id = ? AND applied_at IS NULL
      )
      ON CONFLICT(user_id,game_type) DO UPDATE SET
        total_points = user_game_stats.total_points + excluded.total_points,
        season_points = CASE
          WHEN user_game_stats.season_id = excluded.season_id
          THEN user_game_stats.season_points + excluded.season_points
          ELSE excluded.season_points
        END,
        season_id = excluded.season_id,
        best_score = MAX(user_game_stats.best_score,excluded.best_score),
        games_played = user_game_stats.games_played + 1,
        updated_at = excluded.updated_at
    `).bind(
      context.userId, context.gameType, points, points, CURRENT_SEASON_ID,
      points, now, context.nonce, context.userId
    ),
    env.DB.prepare(`
      UPDATE game_stage_run_scores SET applied_at = ?
      WHERE run_nonce = ? AND user_id = ? AND applied_at IS NULL
    `).bind(now, context.nonce, context.userId)
  ]);

  const applied = Number(results?.[1]?.meta?.changes || 0) === 1;
  const stats = await env.DB.prepare(`
    SELECT total_points,season_points,best_score,games_played
    FROM user_game_stats WHERE user_id = ? AND game_type = ? LIMIT 1
  `).bind(context.userId, context.gameType).first();

  return {
    score_points: points,
    base_score_points: basePoints,
    stats_applied: applied,
    stats_duplicate: !applied,
    total_points: Number(stats?.total_points || 0),
    season_points: Number(stats?.season_points || 0),
    best_score: Number(stats?.best_score || 0),
    games_played: Number(stats?.games_played || 0)
  };
}

async function applyThreeStars(env, context, data = {}) {
  await ensureStarSchema(env);
  const now = Date.now();
  let existing = context.existing;
  if (!existing) {
    existing = await env.DB.prepare(`
      SELECT game_uid,user_id,game_type,level_id,stars,performance,attempts,applied_at
      FROM game_stage_star_rewards WHERE game_uid = ? LIMIT 1
    `).bind(context.gameUid).first();
  }

  const boost = boostFrom(data, existing);
  const desiredAward = 3 * boost;
  if (!existing) {
    await env.DB.batch([
      env.DB.prepare(`
        INSERT OR IGNORE INTO game_stage_star_rewards (
          game_uid,user_id,game_type,level_id,stars,performance,attempts,created_at,applied_at
        ) VALUES (?,?,?,?,?,'EXCELLENT',1,?,NULL)
      `).bind(context.gameUid, context.userId, context.gameType, context.stage, desiredAward, now),
      env.DB.prepare(`
        UPDATE users SET
          total_score = COALESCE(total_score,0) + (
            SELECT stars FROM game_stage_star_rewards WHERE game_uid = ? AND user_id = ? AND applied_at IS NULL
          ),
          tops_season_score = COALESCE(tops_season_score,0) + (
            SELECT stars FROM game_stage_star_rewards WHERE game_uid = ? AND user_id = ? AND applied_at IS NULL
          )
        WHERE id = ? AND EXISTS (
          SELECT 1 FROM game_stage_star_rewards WHERE game_uid = ? AND user_id = ? AND applied_at IS NULL
        )
      `).bind(context.gameUid, context.userId, context.gameUid, context.userId, context.userId, context.gameUid, context.userId),
      env.DB.prepare(`
        UPDATE game_stage_star_rewards SET applied_at = ?
        WHERE game_uid = ? AND user_id = ? AND applied_at IS NULL
      `).bind(now, context.gameUid, context.userId)
    ]);
  } else {
    const stored = Math.max(0, Number(existing.stars || 0));
    const delta = Math.max(0, desiredAward - stored);
    const finalAward = Math.max(stored, desiredAward);
    if (delta > 0) {
      await env.DB.batch([
        env.DB.prepare(`
          UPDATE game_stage_star_rewards SET stars = ?,performance = 'EXCELLENT',attempts = MAX(1,attempts)
          WHERE game_uid = ? AND user_id = ?
        `).bind(finalAward, context.gameUid, context.userId),
        env.DB.prepare(`
          UPDATE users SET total_score = COALESCE(total_score,0) + ?,tops_season_score = COALESCE(tops_season_score,0) + ?
          WHERE id = ?
        `).bind(delta, delta, context.userId)
      ]);
    } else if (String(existing.performance || "") !== "EXCELLENT") {
      await env.DB.prepare(`
        UPDATE game_stage_star_rewards SET performance = 'EXCELLENT',attempts = MAX(1,attempts)
        WHERE game_uid = ? AND user_id = ?
      `).bind(context.gameUid, context.userId).run();
    }
  }

  const [reward, totals] = await Promise.all([
    env.DB.prepare(`
      SELECT stars,performance,attempts,applied_at FROM game_stage_star_rewards
      WHERE game_uid = ? AND user_id = ? LIMIT 1
    `).bind(context.gameUid, context.userId).first(),
    env.DB.prepare(`
      SELECT COALESCE(total_score,0) AS total_score,COALESCE(tops_season_score,0) AS tops_season_score
      FROM users WHERE id = ? LIMIT 1
    `).bind(context.userId).first()
  ]);

  return {
    game_uid: context.gameUid,
    stars: 3,
    rating_stars: 3,
    stars_awarded: Math.max(3, Number(reward?.stars || desiredAward)),
    boost_multiplier: boost,
    performance: "EXCELLENT",
    attempts: Math.max(1, Number(reward?.attempts || 1)),
    total_score: Number(totals?.total_score || 0),
    tops_season_score: Number(totals?.tops_season_score || 0),
    stars_applied: Number(reward?.applied_at || 0) > 0
  };
}

function jsonResponse(response, data, status = response?.status || 200, extraHeaders = {}) {
  const headers = new Headers(response?.headers || {});
  headers.delete("Content-Length");
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  Object.entries(extraHeaders).forEach(([key, value]) => headers.set(key, value));
  return new Response(JSON.stringify(data), { status, statusText: status === 200 ? "OK" : response?.statusText, headers });
}

export async function enforceThreeStarsResponse(request, response, env) {
  const path = new URL(request.url).pathname;
  if (request.method !== "POST" || !DECORATED_PATHS.has(path) || !env?.DB) return response;

  let data = {};
  try { data = await response.clone().json(); }
  catch (_) {}

  try {
    await ensureStarSchema(env);
    const context = await resolveContext(request, env, path, data);
    if (!context) return response;

    if (path === "/game/stage/score") {
      if (!POINT_GAMES.has(context.gameType)) return response;
      if (!(await stageMatches(env, context))) return response;
      const stats = await applyRunPoints(env, context, context.body?.score, false, 1);
      return jsonResponse(response, {
        ok: true,
        game_type: context.gameType,
        stage: context.stage,
        max_level_unlocked: context.stage,
        last_selected_level: context.stage,
        ...stats
      }, 200, {
        "X-FlappyPi-Points-Policy": "signed-stage-run-v1"
      });
    }

    if (!response?.ok || data?.ok === false) return response;
    if (path === "/game/stage/finish" && Number(data?.completed_stage || 0) < 1) return response;

    let stats = null;
    if (path === "/game/stage/finish" && POINT_GAMES.has(context.gameType)) {
      stats = await applyRunPoints(env, context, context.body?.score, true, Number(data?.boost_multiplier || 1));
    }
    const reward = await applyThreeStars(env, context, data);
    return jsonResponse(response, { ...data, ...(stats || {}), ...reward }, response.status, {
      "X-FlappyPi-Star-Policy": "always-3",
      ...(stats ? { "X-FlappyPi-Points-Policy": "signed-stage-run-v1" } : {})
    });
  } catch (error) {
    console.error("[STAGE REWARD] unable to enforce stars/points", error?.message || error);
    return response;
  }
}
