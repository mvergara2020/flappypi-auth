import baseWorker from "./worker.js";

const MAX_STAGE = 999;
const FINGER_GAME = "finger_trace";
const FLAPPY_GAMES = new Set(["flappy_classic", "webcam_flappy"]);
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "https://192.168.1.81:3000",
  "https://qa.classic.flappypi.com",
  "https://classic.flappypi.com"
]);

let fingerStarSchemaPromise = null;

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  };
}

function json(request, body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

function getCookie(request, name) {
  const cookie = String(request.headers.get("Cookie") || "");
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function decodeBase64Url(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(String(value || "").length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), char => char.charCodeAt(0));
}

function decodeUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}

async function verifyJWT(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("JWT_FORMAT");

  const [header64, payload64, signature64] = parts;
  const data = `${header64}.${payload64}`;
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
    new TextEncoder().encode(data)
  );

  if (!valid) throw new Error("JWT_SIGNATURE");
  const payload = JSON.parse(decodeUtf8(decodeBase64Url(payload64)));
  if (payload?.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) throw new Error("JWT_EXPIRED");
  return payload;
}

function fingerTarget(stage) {
  const value = Math.max(1, Math.min(MAX_STAGE, Number(stage) || 1));
  return Math.min(50, 5 + Math.floor((value - 1) / 20));
}

function flappyTarget(stage) {
  const value = Math.max(1, Math.min(MAX_STAGE, Number(stage) || 1));
  return value * 5;
}

function runDurationSec(payload) {
  const startedAt = Number(payload?.startedAt || payload?.started_at || 0);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return NaN;
  return Math.max(0, (Date.now() - startedAt) / 1000);
}

function normalizeGameType(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function hasFingerStartContext(body) {
  const gameType = normalizeGameType(body?.game_type);
  const stage = normalizeGameType(body?.stage);

  return (
    gameType === FINGER_GAME ||
    stage === FINGER_GAME ||
    stage.startsWith("finger_")
  );
}

async function readSessionUserId(request, env) {
  const token = getCookie(request, "session");
  if (!token) return null;
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    return payload?.sub ? String(payload.sub) : null;
  } catch (_) {
    return null;
  }
}

async function getMaxUnlocked(env, userId, gameType) {
  const row = await env.DB.prepare(`
    SELECT max_level_unlocked
    FROM user_game_progress
    WHERE user_id = ? AND game_type = ?
    LIMIT 1
  `).bind(userId, gameType).first();
  return Math.max(1, Math.min(MAX_STAGE, Number(row?.max_level_unlocked || 1)));
}

async function forceFingerStartContext(request, env, body) {
  if (!hasFingerStartContext(body)) {
    return { request, body };
  }

  const userId = await readSessionUserId(request, env);
  if (!userId) return { request, body };

  const maxUnlocked = await getMaxUnlocked(env, userId, FINGER_GAME);
  const nextBody = {
    ...body,
    game_type: FINGER_GAME,
    mode: "levels",
    level_id: maxUnlocked,
    selectedLevel: maxUnlocked,
    currentLevel: maxUnlocked,
    stage: `finger_stage_${maxUnlocked}`
  };

  return {
    body: nextBody,
    request: new Request(request, {
      body: JSON.stringify(nextBody),
      headers: request.headers
    })
  };
}

async function validateSignedGameType(request, env, body) {
  const bodyGameType = normalizeGameType(body?.game_type);
  if (!bodyGameType) {
    return { payload: null, rejection: null };
  }

  let payload;
  try {
    payload = await verifyJWT(body?.gameToken, env.JWT_SECRET);
  } catch (_) {
    return { payload: null, rejection: null };
  }

  const tokenGameType = normalizeGameType(payload?.game_type);

  if (!tokenGameType || tokenGameType === bodyGameType) {
    return { payload, rejection: null };
  }

  return {
    payload,
    rejection: json(request, {
      ok: false,
      code: "GAME_TYPE_MISMATCH",
      message: "Game type does not match signed game token",
      token_game_type: tokenGameType,
      body_game_type: bodyGameType
    }, 409)
  };
}

async function validateFlappyFinish(request, env, body) {
  if (body?.complete_game !== true) return null;

  let payload;
  try { payload = await verifyJWT(body?.gameToken, env.JWT_SECRET); }
  catch (_) { return null; }

  const gameType = normalizeGameType(payload?.game_type || body?.game_type);
  if (!FLAPPY_GAMES.has(gameType) || String(payload?.mode || "") !== "levels") return null;

  const stage = Number(payload?.level_id || 0);
  if (!Number.isInteger(stage) || stage < 1 || stage > MAX_STAGE) return null;

  const target = flappyTarget(stage);
  const pipesPassed = Number(body?.pipes_passed ?? body?.difficulty_pipes_passed ?? 0);
  const durationSec = runDurationSec(payload);
  const minimumDurationSec = Math.max(Math.min(5, target), target * 0.35);

  if (!Number.isInteger(pipesPassed) || pipesPassed < target) {
    return json(request, {
      ok: false,
      code: "FLAPPY_PIPES_BELOW_STAGE_TARGET",
      message: "Stage target not reached",
      stage,
      target,
      pipes_passed: Math.max(0, Number(pipesPassed || 0))
    }, 409);
  }

  if (!Number.isFinite(durationSec) || durationSec < minimumDurationSec || pipesPassed > durationSec * 3 + 3) {
    return json(request, {
      ok: false,
      code: "FLAPPY_STAGE_TIME_ANOMALY",
      message: "Stage timing is not valid",
      stage,
      target,
      pipes_passed: pipesPassed,
      duration_sec: durationSec,
      minimum_duration_sec: minimumDurationSec
    }, 403);
  }

  return null;
}

async function validateFingerFinish(request, env, body) {
  if (normalizeGameType(body?.game_type) !== FINGER_GAME || body?.complete_game !== true) return { payload: null, rejection: null };

  let payload;
  try { payload = await verifyJWT(body?.gameToken, env.JWT_SECRET); }
  catch (_) { return { payload: null, rejection: null }; }

  if (normalizeGameType(payload?.game_type) !== FINGER_GAME || String(payload?.mode || "") !== "levels") {
    return {
      payload,
      rejection: json(request, { ok: false, code: "FINGER_STAGE_CONTEXT_INVALID" }, 409)
    };
  }

  const stage = Number(payload?.level_id || 0);
  const score = Number(body?.score || 0);
  const target = fingerTarget(stage);
  const durationSec = runDurationSec(payload);
  const minimumDurationSec = Math.max(2, target * 0.18);

  if (!Number.isInteger(stage) || stage < 1 || stage > MAX_STAGE || !Number.isInteger(score) || score < target) {
    return {
      payload,
      rejection: json(request, {
        ok: false,
        code: "FINGER_SCORE_BELOW_TARGET",
        stage,
        target,
        score
      }, 409)
    };
  }

  const maxUnlocked = await getMaxUnlocked(env, String(payload.sub), FINGER_GAME);
  if (stage !== maxUnlocked) {
    return {
      payload,
      rejection: json(request, {
        ok: false,
        code: "LEVEL_NOT_UNLOCKED",
        requested_level: stage,
        max_level_unlocked: maxUnlocked
      }, 409)
    };
  }

  if (!Number.isFinite(durationSec) || durationSec < minimumDurationSec || score > durationSec * 12 + 3) {
    return {
      payload,
      rejection: json(request, {
        ok: false,
        code: "FINGER_STAGE_TIME_ANOMALY",
        stage,
        target,
        score,
        duration_sec: durationSec,
        minimum_duration_sec: minimumDurationSec
      }, 403)
    };
  }

  return { payload, rejection: null };
}

async function applyFingerProgress(env, payload) {
  const userId = String(payload.sub);
  const completedStage = Number(payload.level_id);
  const currentMax = await getMaxUnlocked(env, userId, FINGER_GAME);

  if (completedStage !== currentMax) {
    return {
      completed: true,
      advanced: false,
      completed_level: completedStage,
      max_level_unlocked: currentMax,
      next_level: currentMax < MAX_STAGE ? currentMax : null
    };
  }

  const terminal = completedStage >= MAX_STAGE;
  const nextMax = terminal ? MAX_STAGE : completedStage + 1;
  const now = Date.now();

  await env.DB.prepare(`
    INSERT INTO user_game_progress (
      user_id, game_type, max_level_unlocked, last_selected_level, updated_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, game_type)
    DO UPDATE SET
      max_level_unlocked = CASE
        WHEN excluded.max_level_unlocked > user_game_progress.max_level_unlocked
        THEN excluded.max_level_unlocked
        ELSE user_game_progress.max_level_unlocked
      END,
      last_selected_level = excluded.last_selected_level,
      updated_at = excluded.updated_at
  `).bind(userId, FINGER_GAME, nextMax, nextMax, now).run();

  return {
    completed: true,
    advanced: !terminal,
    completed_level: completedStage,
    max_level_unlocked: nextMax,
    next_level: terminal ? null : nextMax
  };
}

function ensureFingerStarSchema(env) {
  if (fingerStarSchemaPromise) return fingerStarSchemaPromise;
  fingerStarSchemaPromise = env.DB.prepare(`
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
    fingerStarSchemaPromise = null;
    throw error;
  });
  return fingerStarSchemaPromise;
}

function performanceForAttempts(attempts) {
  const count = Math.max(1, Number(attempts || 1));
  if (count === 1) return { stars: 3, performance: "EXCELLENT" };
  if (count <= 3) return { stars: 2, performance: "GOOD" };
  return { stars: 1, performance: "CLEARED" };
}

async function maybeHandleFingerStageStars(request, env) {
  const url = new URL(request.url);
  if (request.method !== "POST" || url.pathname !== "/game/stage-stars") return null;

  const userId = await readSessionUserId(request, env);
  if (!userId) return null;

  let body = {};
  try { body = await request.clone().json(); }
  catch (_) { return null; }

  const gameUid = String(body?.game_uid || "").trim();
  if (!gameUid) return null;

  const game = await env.DB.prepare(`
    SELECT game_uid, game_type, level_id, mode, created_at
    FROM games
    WHERE game_uid = ? AND user_id = ?
    LIMIT 1
  `).bind(gameUid, userId).first();

  if (!game || normalizeGameType(game.game_type) !== FINGER_GAME) return null;
  await ensureFingerStarSchema(env);

  const existing = await env.DB.prepare(`
    SELECT stars, performance, attempts, level_id, game_type, applied_at
    FROM game_stage_star_rewards
    WHERE game_uid = ? AND user_id = ?
    LIMIT 1
  `).bind(gameUid, userId).first();

  if (existing?.applied_at) {
    const totals = await env.DB.prepare(`
      SELECT COALESCE(total_score,0) AS total_score, COALESCE(tops_season_score,0) AS tops_season_score
      FROM users WHERE id = ?
    `).bind(userId).first();
    return json(request, {
      ok: true,
      game_uid: gameUid,
      game_type: FINGER_GAME,
      stage: Number(existing.level_id || 0),
      stars: Number(existing.stars || 0),
      performance: existing.performance,
      attempts: Number(existing.attempts || 1),
      total_score: Number(totals?.total_score || 0),
      tops_season_score: Number(totals?.tops_season_score || 0),
      applied: true,
      duplicate: true
    });
  }

  const stage = Number(game.level_id || 0);
  const maxUnlocked = await getMaxUnlocked(env, userId, FINGER_GAME);
  const confirmed = maxUnlocked > stage || (stage === MAX_STAGE && maxUnlocked === MAX_STAGE);
  if (!confirmed || String(game.mode || "") !== "levels") {
    return json(request, { ok: false, code: "STAGE_NOT_CONFIRMED", stage, max_level_unlocked: maxUnlocked }, 409);
  }

  const attemptsRow = await env.DB.prepare(`
    SELECT COUNT(*) AS attempts
    FROM games
    WHERE user_id = ? AND game_type = ? AND level_id = ? AND mode = 'levels' AND created_at <= ?
  `).bind(userId, FINGER_GAME, stage, Number(game.created_at || Date.now())).first();

  const rating = performanceForAttempts(attemptsRow?.attempts);
  const attempts = Math.max(1, Number(attemptsRow?.attempts || 1));
  const now = Date.now();

  await env.DB.prepare(`
    INSERT OR IGNORE INTO game_stage_star_rewards (
      game_uid,user_id,game_type,level_id,stars,performance,attempts,created_at,applied_at
    ) VALUES (?,?,?,?,?,?,?,?,NULL)
  `).bind(gameUid, userId, FINGER_GAME, stage, rating.stars, rating.performance, attempts, now).run();

  await env.DB.batch([
    env.DB.prepare(`
      UPDATE users SET
        total_score = COALESCE(total_score,0) + (
          SELECT stars FROM game_stage_star_rewards
          WHERE game_uid = ? AND user_id = ? AND applied_at IS NULL
        ),
        tops_season_score = COALESCE(tops_season_score,0) + (
          SELECT stars FROM game_stage_star_rewards
          WHERE game_uid = ? AND user_id = ? AND applied_at IS NULL
        )
      WHERE id = ?
        AND EXISTS (
          SELECT 1 FROM game_stage_star_rewards
          WHERE game_uid = ? AND user_id = ? AND applied_at IS NULL
        )
    `).bind(gameUid, userId, gameUid, userId, userId, gameUid, userId),
    env.DB.prepare(`
      UPDATE game_stage_star_rewards SET applied_at = ?
      WHERE game_uid = ? AND user_id = ? AND applied_at IS NULL
    `).bind(now, gameUid, userId)
  ]);

  const [reward, totals] = await Promise.all([
    env.DB.prepare(`
      SELECT stars,performance,attempts,level_id,applied_at
      FROM game_stage_star_rewards WHERE game_uid = ? AND user_id = ? LIMIT 1
    `).bind(gameUid, userId).first(),
    env.DB.prepare(`
      SELECT COALESCE(total_score,0) AS total_score, COALESCE(tops_season_score,0) AS tops_season_score
      FROM users WHERE id = ?
    `).bind(userId).first()
  ]);

  return json(request, {
    ok: true,
    game_uid: gameUid,
    game_type: FINGER_GAME,
    stage,
    stars: Number(reward?.stars || rating.stars),
    performance: reward?.performance || rating.performance,
    attempts: Number(reward?.attempts || attempts),
    total_score: Number(totals?.total_score || 0),
    tops_season_score: Number(totals?.tops_season_score || 0),
    applied: Number(reward?.applied_at || 0) > 0,
    duplicate: false
  });
}

async function rewriteMeResponse(response) {
  if (!response.ok) return response;
  const contentType = String(response.headers.get("Content-Type") || "");
  if (!contentType.includes("application/json")) return response;

  let data;
  try { data = await response.clone().json(); }
  catch (_) { return response; }

  const levels = data?.LEVEL_DEFINITION;
  if (!levels || typeof levels !== "object") return response;

  for (let stage = 1; stage <= MAX_STAGE; stage++) {
    const row = levels[stage] || levels[String(stage)];
    if (row) row.pipes_target = flappyTarget(stage);
  }

  return new Response(JSON.stringify(data), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

async function handleFetch(request, env, ctx) {
  const url = new URL(request.url);

  const fingerStars = await maybeHandleFingerStageStars(request, env);
  if (fingerStars) return fingerStars;

  let workingRequest = request;
  let requestBody = null;

  if (request.method === "POST" && (url.pathname === "/game/start" || url.pathname === "/game/finish")) {
    try { requestBody = await request.clone().json(); }
    catch (_) { requestBody = null; }
  }

  if (url.pathname === "/game/start" && requestBody) {
    const forced = await forceFingerStartContext(request, env, requestBody);
    workingRequest = forced.request;
    requestBody = forced.body;
  }

  if (url.pathname === "/game/finish" && requestBody) {
    const signedContext = await validateSignedGameType(request, env, requestBody);
    if (signedContext.rejection) return signedContext.rejection;

    const fingerValidation = await validateFingerFinish(request, env, requestBody);
    if (fingerValidation.rejection) return fingerValidation.rejection;

    const flappyRejection = await validateFlappyFinish(request, env, requestBody);
    if (flappyRejection) return flappyRejection;

    const response = await baseWorker.fetch(workingRequest, env, ctx);
    if (!fingerValidation.payload || !response.ok) return response;

    let data;
    try { data = await response.clone().json(); }
    catch (_) { return response; }
    if (!data?.ok) return response;

    const level = await applyFingerProgress(env, fingerValidation.payload);
    data.level = level;
    data.finger_stage_target = fingerTarget(fingerValidation.payload.level_id);

    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }

  const response = await baseWorker.fetch(workingRequest, env, ctx);
  if (url.pathname === "/me") return rewriteMeResponse(response);
  return response;
}

export default {
  fetch: handleFetch,
  async queue(batch, env, ctx) {
    return baseWorker.queue(batch, env, ctx);
  }
};
