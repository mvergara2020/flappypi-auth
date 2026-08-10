const MAX_STAGE_DEFAULT = 999;

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

function normalizeGameType(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  const normalized = raw.replace(/-/g, "_").replace(/[^a-z0-9_]/g, "");
  return GAME_ALIASES[raw] || GAME_ALIASES[normalized] || normalized;
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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function fingerTarget(stage) {
  const n = Math.max(1, Math.min(999, Number(stage) || 1));
  return Math.min(50, 5 + Math.floor((n - 1) / 20));
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

async function finishFingerStage(request, env, user, body) {
  const gameUid = String(body?.game_uid || "").trim();
  if (!gameUid) return json({ ok:false, code:"FINGER_GAME_UID_REQUIRED" }, 400);

  const game = await env.DB.prepare(`
    SELECT game_uid, user_id, game_type, status,
           committed_metric, committed_points,
           started_at, finished_at
    FROM game_sessions
    WHERE game_uid = ?
    LIMIT 1
  `).bind(gameUid).first();

  if (!game) return json({ ok:false, code:"FINGER_GAME_NOT_FOUND" }, 404);
  if (String(game.user_id) !== String(user.id)) {
    return json({ ok:false, code:"FINGER_GAME_OWNER_MISMATCH" }, 403);
  }
  if (normalizeGameType(game.game_type) !== "finger_trace") {
    return json({ ok:false, code:"FINGER_GAME_TYPE_MISMATCH" }, 409);
  }

  const finishedAt = Number(game.finished_at || 0);
  const status = String(game.status || "").toLowerCase();
  if (finishedAt <= 0 && !["finished", "complete", "completed", "committed"].includes(status)) {
    return json({ ok:false, code:"FINGER_GAME_NOT_FINALIZED" }, 409);
  }

  const progress = await currentProgress(env, user.id, "finger_trace");
  const stage = progress.max_level_unlocked;
  const target = fingerTarget(stage);
  const committedMetric = Math.max(0, Number(game.committed_metric || 0));
  const committedPoints = Math.max(0, Number(game.committed_points || 0));
  const accepted = Math.max(committedMetric, committedPoints);

  if (accepted < target) {
    return json({
      ok:false,
      code:"FINGER_STAGE_TARGET_NOT_REACHED",
      stage,
      target,
      committed_points:committedPoints,
      committed_metric:committedMetric
    }, 409);
  }

  const startedAt = Number(game.started_at || 0);
  if (stage > 1 && startedAt > 0 && progress.updated_at > 0 && startedAt < progress.updated_at) {
    return json({
      ok:true,
      game_type:"finger_trace",
      game_uid:gameUid,
      accepted_run_points:committedPoints,
      duplicate:true,
      level:{
        completed:true,
        advanced:false,
        completed_level:Math.max(1, stage - 1),
        max_level_unlocked:stage,
        next_level:stage,
        terminal:stage >= 999
      }
    });
  }

  const terminal = stage >= 999;
  const nextStage = terminal ? 999 : stage + 1;
  const now = Date.now();

  if (!terminal) {
    await env.DB.prepare(`
      UPDATE user_game_progress
      SET max_level_unlocked = ?, last_selected_level = ?, updated_at = ?
      WHERE user_id = ? AND game_type = 'finger_trace' AND max_level_unlocked = ?
    `).bind(nextStage, nextStage, now, String(user.id), stage).run();
  } else {
    await env.DB.prepare(`
      UPDATE user_game_progress
      SET last_selected_level = 999, updated_at = ?
      WHERE user_id = ? AND game_type = 'finger_trace' AND max_level_unlocked = 999
    `).bind(now, String(user.id)).run();
  }

  const updated = await currentProgress(env, user.id, "finger_trace");
  const advanced = terminal || updated.max_level_unlocked > stage;

  return json({
    ok:true,
    game_type:"finger_trace",
    game_uid:gameUid,
    accepted_run_points:committedPoints,
    target,
    duplicate:!terminal && !advanced,
    level:{
      completed:true,
      advanced,
      completed_level:stage,
      max_level_unlocked:updated.max_level_unlocked,
      next_level:terminal ? null : updated.max_level_unlocked,
      terminal
    }
  });
}

export async function routeGameStageProgress(request, env, user) {
  const url = new URL(request.url);
  if (request.method !== "POST") return null;
  if (url.pathname !== "/game/stage/start" && url.pathname !== "/game/stage/finish") return null;

  if (!user?.id) return json({ ok:false, code:"UNAUTHORIZED" }, 401);

  let body = {};
  try { body = await request.json(); }
  catch (_) { return json({ ok:false, code:"INVALID_JSON" }, 400); }

  if (
    url.pathname === "/game/stage/finish" &&
    normalizeGameType(body?.game_type || body?.game) === "finger_trace" &&
    body?.game_uid
  ) {
    return finishFingerStage(request, env, user, body);
  }

  if (url.pathname === "/game/stage/start") {
    const gameType = normalizeGameType(body?.game_type || body?.game);
    const config = GAME_STAGE_CONFIG[gameType];
    if (!config || config.coreManaged) {
      return json({ ok:false, code:"GAME_STAGE_CORE_MANAGED" }, 409);
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

    return json(responsePayload(progress, {
      stage_token: token,
      core_managed: false
    }));
  }

  let payload;
  try { payload = await verifyStageToken(body?.stage_token || body?.token, env.JWT_SECRET); }
  catch (error) {
    return json({ ok:false, code:String(error?.message || "INVALID_STAGE_TOKEN") }, 401);
  }

  if (String(payload.sub) !== String(user.id)) {
    return json({ ok:false, code:"STAGE_TOKEN_OWNER_MISMATCH" }, 403);
  }

  const gameType = normalizeGameType(payload.game_type);
  const config = GAME_STAGE_CONFIG[gameType];
  if (!config || config.coreManaged) {
    return json({ ok:false, code:"UNSUPPORTED_GAME_STAGE" }, 409);
  }

  const stage = Number(payload.stage || 0);
  const maxStage = Number(config.maxStage || MAX_STAGE_DEFAULT);
  if (!Number.isInteger(stage) || stage < 1 || stage > maxStage) {
    return json({ ok:false, code:"INVALID_STAGE" }, 400);
  }

  const current = await currentProgress(env, user.id, gameType);
  if (current.max_level_unlocked > stage) {
    return json(responsePayload(current, {
      completed_stage: stage,
      advanced: false,
      duplicate: true,
      terminal: current.max_level_unlocked >= maxStage
    }));
  }

  if (current.max_level_unlocked !== stage) {
    return json({
      ok:false,
      code:"STAGE_PROGRESS_MISMATCH",
      expected_stage:current.max_level_unlocked,
      token_stage:stage
    }, 409);
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

  return json(responsePayload(updated, {
    completed_stage: stage,
    advanced,
    duplicate: !terminal && !advanced,
    terminal,
    next_stage: terminal ? null : updated.max_level_unlocked
  }));
}
