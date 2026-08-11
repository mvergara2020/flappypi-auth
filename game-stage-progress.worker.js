const MAX_STAGE_DEFAULT = 999;
const CURRENT_GAME_STATS_SEASON_ID = "S5";

const GAME_STAGE_CONFIG = Object.freeze({
  flappy_classic: Object.freeze({ maxStage: 999, coreManaged: true }),
  webcam_flappy: Object.freeze({ maxStage: 999, coreManaged: true }),
  finger_trace: Object.freeze({ maxStage: 999, coreManaged: true }),
  fruits_memory: Object.freeze({ maxStage: 9, coreManaged: false }),
  snake_999: Object.freeze({ maxStage: 999, coreManaged: false }),
  jelly_fusion: Object.freeze({ maxStage: 9999, coreManaged: false }),
  tetriz_999: Object.freeze({ maxStage: 999, coreManaged: false }),
  flappypi_999: Object.freeze({ maxStage: 999, coreManaged: false }),
  fusion_999: Object.freeze({ maxStage: 999, coreManaged: false })
});

const GAME_ALIASES = Object.freeze({
  flappy: "flappy_classic",
  "flappy-classic": "flappy_classic",
  webcam: "webcam_flappy",
  "webcam-flappy": "webcam_flappy",
  finger: "finger_trace",
  "finger-trace": "finger_trace",
  memory: "fruits_memory",
  fruits: "fruits_memory",
  "fruits-memory": "fruits_memory",
  snake: "snake_999",
  "snake-999": "snake_999",
  jelly: "jelly_fusion",
  "jelly-fusion": "jelly_fusion",
  "jelly-geometry-fusion": "jelly_fusion",
  tetriz: "tetriz_999",
  tetris: "tetriz_999",
  "tetriz-999": "tetriz_999",
  "tetris-999": "tetriz_999",
  flappy999: "flappypi_999",
  "flappypi-999": "flappypi_999",
  "flappypi-999-worlds": "flappypi_999",
  fusion: "fusion_999",
  "fusion-999": "fusion_999"
});

let stageStatsSchemaPromise = null;

function normalizeGameType(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  const normalized = raw.replace(/-/g, "_").replace(/[^a-z0-9_]/g, "");
  return GAME_ALIASES[raw] || GAME_ALIASES[normalized] || normalized;
}

function fruitsMemoryStagePoints(stage) {
  const level = Math.max(1, Math.min(9, Number(stage) || 1));
  const base = Math.min(10, level + 1);
  let rows = base;
  let cols = base;
  if ((rows * cols) % 2 !== 0) cols = Math.min(10, cols + 1);
  return (rows * cols) / 2;
}

function officialStagePoints(gameType, stage) {
  if (gameType === "fruits_memory") return fruitsMemoryStagePoints(stage);
  return 0;
}

function ensureStageStatsSchema(env) {
  if (stageStatsSchemaPromise) return stageStatsSchemaPromise;

  stageStatsSchemaPromise = env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS game_stage_stats_claims (
      user_id TEXT NOT NULL,
      game_type TEXT NOT NULL,
      stage INTEGER NOT NULL,
      points INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      applied_at INTEGER,
      PRIMARY KEY (user_id, game_type, stage)
    )
  `).run().catch(error => {
    stageStatsSchemaPromise = null;
    throw error;
  });

  return stageStatsSchemaPromise;
}

async function applyStageStats(env, userId, gameType, stage, now = Date.now()) {
  const points = officialStagePoints(gameType, stage);

  if (!Number.isInteger(points) || points <= 0) {
    return {
      enabled: false,
      applied: false,
      duplicate: false,
      points: 0,
      season_id: CURRENT_GAME_STATS_SEASON_ID
    };
  }

  await ensureStageStatsSchema(env);

  const results = await env.DB.batch([
    env.DB.prepare(`
      INSERT OR IGNORE INTO game_stage_stats_claims (
        user_id,
        game_type,
        stage,
        points,
        created_at,
        applied_at
      ) VALUES (?, ?, ?, ?, ?, NULL)
    `).bind(
      String(userId),
      gameType,
      stage,
      points,
      now
    ),

    env.DB.prepare(`
      INSERT INTO user_game_stats (
        user_id,
        game_type,
        total_points,
        season_points,
        season_id,
        best_score,
        total_pipes,
        games_played,
        updated_at
      )
      SELECT ?, ?, ?, ?, ?, ?, 0, 1, ?
      WHERE EXISTS (
        SELECT 1
        FROM game_stage_stats_claims
        WHERE user_id = ?
          AND game_type = ?
          AND stage = ?
          AND applied_at IS NULL
      )

      ON CONFLICT(user_id, game_type)
      DO UPDATE SET
        total_points =
          user_game_stats.total_points +
          excluded.total_points,

        season_points = CASE
          WHEN user_game_stats.season_id =
            excluded.season_id
          THEN
            user_game_stats.season_points +
            excluded.season_points
          ELSE
            excluded.season_points
        END,

        season_id =
          excluded.season_id,

        best_score = CASE
          WHEN excluded.best_score >
            user_game_stats.best_score
          THEN excluded.best_score
          ELSE user_game_stats.best_score
        END,

        total_pipes =
          user_game_stats.total_pipes +
          excluded.total_pipes,

        games_played =
          user_game_stats.games_played +
          excluded.games_played,

        updated_at =
          excluded.updated_at
    `).bind(
      String(userId),
      gameType,
      points,
      points,
      CURRENT_GAME_STATS_SEASON_ID,
      points,
      now,
      String(userId),
      gameType,
      stage
    ),

    env.DB.prepare(`
      UPDATE game_stage_stats_claims
      SET applied_at = ?
      WHERE user_id = ?
        AND game_type = ?
        AND stage = ?
        AND applied_at IS NULL
    `).bind(
      now,
      String(userId),
      gameType,
      stage
    )
  ]);

  const applied = Number(results?.[1]?.meta?.changes || 0) === 1;

  return {
    enabled: true,
    applied,
    duplicate: !applied,
    points,
    season_id: CURRENT_GAME_STATS_SEASON_ID
  };
}

function base64UrlEncodeBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeJson(value) {
  return base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlDecodeBytes(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function signingKey(secret) {
  if (!secret) throw new Error("JWT_SECRET_NOT_CONFIGURED");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signStageToken(payload, secret) {
  const header = base64UrlEncodeJson({ alg: "HS256", typ: "JWT" });
  const body = base64UrlEncodeJson(payload);
  const input = `${header}.${body}`;
  const key = await signingKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return `${input}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
}

async function verifyStageToken(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("STAGE_TOKEN_FORMAT");
  const [header64, payload64, signature64] = parts;
  const key = await signingKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecodeBytes(signature64),
    new TextEncoder().encode(`${header64}.${payload64}`)
  );
  if (!valid) throw new Error("STAGE_TOKEN_SIGNATURE");
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecodeBytes(payload64)));
  const nowSec = Math.floor(Date.now() / 1000);
  if (Number(payload?.exp || 0) < nowSec) throw new Error("STAGE_TOKEN_EXPIRED");
  if (payload?.type !== "game_stage") throw new Error("STAGE_TOKEN_TYPE");
  return payload;
}

export function supportedGameStages() {
  return Object.keys(GAME_STAGE_CONFIG);
}

export async function ensureAllGameProgress(env, userId) {
  const id = String(userId || "").trim();
  if (!id) return {};
  const now = Date.now();
  const statements = Object.keys(GAME_STAGE_CONFIG).map(gameType => env.DB.prepare(`
    INSERT OR IGNORE INTO user_game_progress (
      user_id, game_type, max_level_unlocked, last_selected_level, updated_at
    ) VALUES (?, ?, 1, 1, ?)
  `).bind(id, gameType, now));
  if (statements.length) await env.DB.batch(statements);
  return readAllGameProgress(env, id);
}

export async function readAllGameProgress(env, userId) {
  const result = await env.DB.prepare(`
    SELECT game_type, max_level_unlocked, last_selected_level, updated_at
    FROM user_game_progress
    WHERE user_id = ?
    ORDER BY game_type
  `).bind(String(userId)).all();

  const progress = {};
  for (const row of result?.results || []) {
    const gameType = normalizeGameType(row.game_type);
    const config = GAME_STAGE_CONFIG[gameType];
    const maxStage = Number(config?.maxStage || MAX_STAGE_DEFAULT);
    progress[gameType] = {
      max_level_unlocked: Math.max(1, Math.min(maxStage, Number(row.max_level_unlocked || 1))),
      last_selected_level: Math.max(1, Math.min(maxStage, Number(row.last_selected_level || 1))),
      updated_at: Number(row.updated_at || 0)
    };
  }
  return progress;
}

async function currentProgress(env, userId, gameType) {
  const config = GAME_STAGE_CONFIG[gameType];
  if (!config) throw new Error("UNSUPPORTED_GAME_STAGE");
  await ensureAllGameProgress(env, userId);
  const row = await env.DB.prepare(`
    SELECT max_level_unlocked, last_selected_level, updated_at
    FROM user_game_progress
    WHERE user_id = ? AND game_type = ?
    LIMIT 1
  `).bind(String(userId), gameType).first();
  const maxStage = Number(config.maxStage || MAX_STAGE_DEFAULT);
  return {
    game_type: gameType,
    max_level_unlocked: Math.max(1, Math.min(maxStage, Number(row?.max_level_unlocked || 1))),
    last_selected_level: Math.max(1, Math.min(maxStage, Number(row?.last_selected_level || 1))),
    updated_at: Number(row?.updated_at || 0),
    max_stage: maxStage
  };
}

function responsePayload(progress, extra = {}) {
  return {
    ok: true,
    game_type: progress.game_type,
    stage: progress.max_level_unlocked,
    max_level_unlocked: progress.max_level_unlocked,
    last_selected_level: progress.last_selected_level,
    max_stage: progress.max_stage,
    ...extra
  };
}

export async function routeGameStageProgress(request, env, user) {
  const url = new URL(request.url);
  if (request.method !== "POST") return null;
  if (url.pathname !== "/game/stage/start" && url.pathname !== "/game/stage/finish") return null;

  if (!user?.id) {
    return new Response(JSON.stringify({ ok: false, code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  let body = {};
  try { body = await request.json(); }
  catch (_) {
    return new Response(JSON.stringify({ ok: false, code: "INVALID_JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  if (url.pathname === "/game/stage/start") {
    const gameType = normalizeGameType(body?.game_type || body?.game);
    const config = GAME_STAGE_CONFIG[gameType];
    if (!config || config.coreManaged) {
      return new Response(JSON.stringify({ ok: false, code: "GAME_STAGE_CORE_MANAGED" }), {
        status: 409,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
      });
    }

    const progress = await currentProgress(env, user.id, gameType);
    const nowSec = Math.floor(Date.now() / 1000);
    const token = await signStageToken({
      type: "game_stage",
      sub: String(user.id),
      game_type: gameType,
      stage: progress.max_level_unlocked,
      nonce: crypto.randomUUID(),
      iat: nowSec,
      exp: nowSec + 6 * 60 * 60
    }, env.JWT_SECRET);

    return new Response(JSON.stringify(responsePayload(progress, {
      stage_token: token,
      core_managed: false
    })), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  let payload;
  try { payload = await verifyStageToken(body?.stage_token || body?.token, env.JWT_SECRET); }
  catch (error) {
    return new Response(JSON.stringify({ ok: false, code: String(error?.message || "INVALID_STAGE_TOKEN") }), {
      status: 401,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  if (String(payload.sub) !== String(user.id)) {
    return new Response(JSON.stringify({ ok: false, code: "STAGE_TOKEN_OWNER_MISMATCH" }), {
      status: 403,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  const gameType = normalizeGameType(payload.game_type);
  const config = GAME_STAGE_CONFIG[gameType];
  if (!config || config.coreManaged) {
    return new Response(JSON.stringify({ ok: false, code: "UNSUPPORTED_GAME_STAGE" }), {
      status: 409,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  const stage = Number(payload.stage || 0);
  const maxStage = Number(config.maxStage || MAX_STAGE_DEFAULT);
  if (!Number.isInteger(stage) || stage < 1 || stage > maxStage) {
    return new Response(JSON.stringify({ ok: false, code: "INVALID_STAGE" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  const current = await currentProgress(env, user.id, gameType);
  if (current.max_level_unlocked > stage) {
    const stats = await applyStageStats(env, user.id, gameType, stage);

    return new Response(JSON.stringify(responsePayload(current, {
      completed_stage: stage,
      advanced: false,
      duplicate: true,
      terminal: current.max_level_unlocked >= maxStage,
      stage_points: stats.points,
      stats_applied: stats.applied,
      stats_duplicate: stats.enabled ? stats.duplicate : false
    })), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  if (current.max_level_unlocked !== stage) {
    return new Response(JSON.stringify({
      ok: false,
      code: "STAGE_PROGRESS_MISMATCH",
      expected_stage: current.max_level_unlocked,
      token_stage: stage
    }), {
      status: 409,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  const terminal = stage >= maxStage;
  const nextStage = terminal ? maxStage : stage + 1;
  const now = Date.now();

  if (!terminal) {
    await env.DB.prepare(`
      UPDATE user_game_progress
      SET max_level_unlocked = ?, last_selected_level = ?, updated_at = ?
      WHERE user_id = ? AND game_type = ? AND max_level_unlocked = ?
    `).bind(nextStage, nextStage, now, String(user.id), gameType, stage).run();
  } else {
    await env.DB.prepare(`
      UPDATE user_game_progress
      SET last_selected_level = ?, updated_at = ?
      WHERE user_id = ? AND game_type = ? AND max_level_unlocked = ?
    `).bind(maxStage, now, String(user.id), gameType, stage).run();
  }

  const updated = await currentProgress(env, user.id, gameType);
  const advanced = !terminal && updated.max_level_unlocked > stage;
  const stats = await applyStageStats(env, user.id, gameType, stage, now);

  return new Response(JSON.stringify(responsePayload(updated, {
    completed_stage: stage,
    advanced,
    duplicate: !terminal && !advanced,
    terminal,
    next_stage: terminal ? null : updated.max_level_unlocked,
    stage_points: stats.points,
    stats_applied: stats.applied,
    stats_duplicate: stats.enabled ? stats.duplicate : false
  })), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
