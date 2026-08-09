const INTERNAL_AD_SECONDS = 5;
const INTERNAL_AD_TTL_MS = 2 * 60 * 1000;
const MAX_REVIVES = 3;
const REVIVE_COSTS_FLAPPYCOIN = Object.freeze([500, 500, 500]);

let schemaPromise = null;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function getCookie(request, name) {
  const cookie = String(request.headers.get("Cookie") || "");
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  if (!match) return "";
  try { return decodeURIComponent(match[1]); }
  catch (_) { return match[1]; }
}

function decodeBase64Url(value) {
  const input = String(value || "");
  const normalized = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");
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

async function userIdFromSession(request, env) {
  const token = getCookie(request, "session");
  if (!token) return null;
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    return payload?.sub ? String(payload.sub) : null;
  } catch (_) {
    return null;
  }
}

async function gameContext(request, env, body) {
  const userId = await userIdFromSession(request, env);
  if (!userId) return { error: json({ ok: false, code: "UNAUTHORIZED" }, 401) };

  const token = String(body?.gameToken || "").trim();
  if (!token) return { error: json({ ok: false, code: "GAME_TOKEN_REQUIRED" }, 400) };

  let payload;
  try { payload = await verifyJWT(token, env.JWT_SECRET); }
  catch (_) { return { error: json({ ok: false, code: "INVALID_GAME_TOKEN" }, 401) }; }

  if (String(payload?.sub || "") !== userId || payload?.type !== "game" || !payload?.game_uid) {
    return { error: json({ ok: false, code: "INVALID_GAME_CONTEXT" }, 401) };
  }

  return {
    userId,
    gameUid: String(payload.game_uid),
    gameType: String(payload.game_type || body?.game_type || "game"),
    levelId: Number(payload.level_id || 0),
    payload
  };
}

function ensureSchema(env) {
  if (schemaPromise) return schemaPromise;
  schemaPromise = env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS internal_ad_sessions (
      tid TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      game_uid TEXT NOT NULL,
      promoted_game TEXT,
      status TEXT NOT NULL,
      ready_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_internal_ad_game
      ON internal_ad_sessions (user_id, game_uid, status)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS game_ad_revives (
      game_uid TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tid TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`)
  ]).catch(error => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

async function readJson(request) {
  try { return await request.clone().json(); }
  catch (_) { return {}; }
}

async function countRevives(env, gameUid, userId) {
  const row = await env.DB.prepare(`
    SELECT COUNT(*) AS cnt
    FROM game_revives
    WHERE game_uid = ? AND user_id = ?
  `).bind(gameUid, userId).first();
  return Number(row?.cnt || 0);
}

function reviveCostForNumber(reviveNo) {
  const index = Math.max(0, Math.min(REVIVE_COSTS_FLAPPYCOIN.length - 1, Number(reviveNo || 1) - 1));
  return Number(REVIVE_COSTS_FLAPPYCOIN[index] || 0);
}

async function verifyTurnstile(request, env, body) {
  if (env.ENV === "dev") return null;

  const token = String(body?.turnstile_token || "").trim();
  if (!token) return json({ ok: false, code: "TS_MISSING", message: "Turnstile token required" }, 400);

  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    undefined;

  const form = new FormData();
  form.append("secret", String(env.TURNSTILE_SECRET || ""));
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form
    });
    const result = await response.json();
    if (result?.success === true) return null;
    return json({ ok: false, code: "TS_INVALID", message: "Turnstile verification failed" }, 403);
  } catch (_) {
    return json({ ok: false, code: "TS_ERROR", message: "Turnstile verification unavailable" }, 503);
  }
}

async function startInternalAd(request, env, body) {
  await ensureSchema(env);
  const context = await gameContext(request, env, body);
  if (context.error) return context.error;

  const used = await countRevives(env, context.gameUid, context.userId);
  if (used >= MAX_REVIVES) {
    return json({
      ok: false,
      code: "REVIVE_LIMIT_REACHED",
      revives_used: used,
      max_revives: MAX_REVIVES
    }, 409);
  }

  const now = Date.now();
  const existing = await env.DB.prepare(`
    SELECT tid, ready_at, expires_at
    FROM internal_ad_sessions
    WHERE user_id = ? AND game_uid = ? AND status = 'pending' AND expires_at > ?
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(context.userId, context.gameUid, now).first();

  if (existing) {
    return json({
      ok: true,
      tid: existing.tid,
      duration_seconds: INTERNAL_AD_SECONDS,
      ready_at: Number(existing.ready_at),
      expires_at: Number(existing.expires_at),
      revives_used: used,
      max_revives: MAX_REVIVES,
      reused: true
    });
  }

  const tid = `internal_${crypto.randomUUID()}`;
  const readyAt = now + INTERNAL_AD_SECONDS * 1000;
  const expiresAt = now + INTERNAL_AD_TTL_MS;
  const promotedGame = String(body?.promoted_game || "").slice(0, 64);

  await env.DB.prepare(`
    INSERT INTO internal_ad_sessions (
      tid,user_id,game_uid,promoted_game,status,ready_at,expires_at,created_at,completed_at
    ) VALUES (?,?,?,?, 'pending', ?,?,?,NULL)
  `).bind(
    tid,
    context.userId,
    context.gameUid,
    promotedGame,
    readyAt,
    expiresAt,
    now
  ).run();

  return json({
    ok: true,
    tid,
    duration_seconds: INTERNAL_AD_SECONDS,
    ready_at: readyAt,
    expires_at: expiresAt,
    revives_used: used,
    max_revives: MAX_REVIVES,
    reused: false
  });
}

async function completeInternalAd(request, env, body) {
  await ensureSchema(env);
  const context = await gameContext(request, env, body);
  if (context.error) return context.error;

  const tid = String(body?.tid || "").trim();
  if (!tid) return json({ ok: false, code: "AD_TID_REQUIRED" }, 400);

  const now = Date.now();
  const row = await env.DB.prepare(`
    SELECT tid,status,ready_at,expires_at,promoted_game
    FROM internal_ad_sessions
    WHERE tid = ? AND user_id = ? AND game_uid = ?
    LIMIT 1
  `).bind(tid, context.userId, context.gameUid).first();

  if (!row) return json({ ok: false, code: "AD_SESSION_NOT_FOUND" }, 404);
  if (row.status === "completed" || row.status === "rewarded") {
    return json({ ok: true, tid, rewarded: true, duplicate: true });
  }
  if (now > Number(row.expires_at || 0)) {
    await env.DB.prepare(`UPDATE internal_ad_sessions SET status='expired' WHERE tid=?`).bind(tid).run();
    return json({ ok: false, code: "AD_SESSION_EXPIRED" }, 409);
  }
  if (now < Number(row.ready_at || 0)) {
    return json({
      ok: false,
      code: "AD_TIME_NOT_COMPLETE",
      remaining_ms: Number(row.ready_at) - now
    }, 409);
  }

  const used = await countRevives(env, context.gameUid, context.userId);
  if (used >= MAX_REVIVES) {
    return json({
      ok: false,
      code: "REVIVE_LIMIT_REACHED",
      revives_used: used,
      max_revives: MAX_REVIVES
    }, 409);
  }

  const existingReward = await env.DB.prepare(`
    SELECT tid,status FROM ad_rewards
    WHERE tid = ? AND user_id = ?
    LIMIT 1
  `).bind(tid, context.userId).first();

  if (!existingReward) {
    await env.DB.prepare(`
      INSERT INTO ad_rewards (
        id,provider,reward_type,tid,user_id,status,payload_json,rewarded_at,created_at
      ) VALUES (?, 'internal', 'revive', ?, ?, 'rewarded', ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      tid,
      context.userId,
      JSON.stringify({
        game_uid: context.gameUid,
        game_type: context.gameType,
        level_id: context.levelId,
        promoted_game: row.promoted_game || null,
        duration_seconds: INTERNAL_AD_SECONDS
      }),
      now,
      now
    ).run();
  }

  await env.DB.prepare(`
    UPDATE internal_ad_sessions
    SET status='completed', completed_at=?
    WHERE tid=? AND status='pending'
  `).bind(now, tid).run();

  return json({ ok: true, tid, rewarded: true, duplicate: !!existingReward });
}

async function rewardedRevive(request, env, body) {
  await ensureSchema(env);
  const context = await gameContext(request, env, body);
  if (context.error) return context.error;

  const tid = String(body?.ad_tid || body?.tid || "").trim();
  if (!tid) return json({ ok: false, code: "AD_TID_REQUIRED" }, 400);

  const reward = await env.DB.prepare(`
    SELECT tid,provider,status,reward_type
    FROM ad_rewards
    WHERE tid = ? AND user_id = ? AND reward_type = 'revive' AND status = 'rewarded'
    LIMIT 1
  `).bind(tid, context.userId).first();

  if (!reward) return json({ ok: false, code: "AD_REWARD_NOT_AVAILABLE" }, 409);

  const used = await countRevives(env, context.gameUid, context.userId);
  if (used >= MAX_REVIVES) {
    return json({
      ok: false,
      code: "REVIVE_LIMIT_REACHED",
      revives_used: used,
      max_revives: MAX_REVIVES
    }, 409);
  }

  const now = Date.now();
  const reviveNo = used + 1;
  const reviveId = crypto.randomUUID();

  const results = await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO game_revives (id,game_uid,user_id,revive_no,eggs_used,created_at)
      SELECT ?,?,?,?,?,?
      WHERE EXISTS (
        SELECT 1 FROM ad_rewards
        WHERE tid=? AND user_id=? AND reward_type='revive' AND status='rewarded'
      )
      AND (
        SELECT COUNT(*) FROM game_revives WHERE game_uid=? AND user_id=?
      ) < ?
    `).bind(
      reviveId,
      context.gameUid,
      context.userId,
      reviveNo,
      0,
      now,
      tid,
      context.userId,
      context.gameUid,
      context.userId,
      MAX_REVIVES
    ),
    env.DB.prepare(`
      UPDATE ad_rewards
      SET status='consumed', consumed_at=?
      WHERE tid=? AND user_id=? AND status='rewarded'
        AND EXISTS (SELECT 1 FROM game_revives WHERE id=?)
    `).bind(now, tid, context.userId, reviveId)
  ]);

  if (Number(results?.[0]?.meta?.changes || 0) !== 1) {
    return json({ ok: false, code: "AD_REWARD_NOT_AVAILABLE" }, 409);
  }

  const wallet = await env.DB.prepare(`
    SELECT COALESCE(eggs,0) AS eggs
    FROM users WHERE id=? LIMIT 1
  `).bind(context.userId).first();

  return json({
    ok: true,
    revive_no: reviveNo,
    revives_used: reviveNo,
    max_revives: MAX_REVIVES,
    flappycoin_used: 0,
    eggs_used: 0,
    flappycoin_left: Number(wallet?.eggs || 0),
    eggs_left: Number(wallet?.eggs || 0),
    method: "ad",
    provider: String(reward.provider || "ad")
  });
}

async function flappyCoinRevive(request, env, body) {
  const context = await gameContext(request, env, body);
  if (context.error) return context.error;

  const turnstileError = await verifyTurnstile(request, env, body);
  if (turnstileError) return turnstileError;

  const used = await countRevives(env, context.gameUid, context.userId);
  if (used >= MAX_REVIVES) {
    return json({
      ok: false,
      code: "REVIVE_LIMIT_REACHED",
      revives_used: used,
      max_revives: MAX_REVIVES
    }, 409);
  }

  const reviveNo = used + 1;
  const cost = reviveCostForNumber(reviveNo);
  const now = Date.now();
  const reviveId = crypto.randomUUID();

  const before = await env.DB.prepare(`
    SELECT COALESCE(eggs,0) AS eggs
    FROM users WHERE id=? LIMIT 1
  `).bind(context.userId).first();

  if (Number(before?.eggs || 0) < cost) {
    return json({
      ok: false,
      code: "NOT_ENOUGH_FLAPPYCOIN",
      required_flappycoin: cost,
      flappycoin_left: Number(before?.eggs || 0),
      revive_no: reviveNo
    }, 409);
  }

  const results = await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO game_revives (id,game_uid,user_id,revive_no,eggs_used,created_at)
      SELECT ?,?,?,?,?,?
      WHERE EXISTS (
        SELECT 1 FROM users WHERE id=? AND COALESCE(eggs,0) >= ?
      )
      AND (
        SELECT COUNT(*) FROM game_revives WHERE game_uid=? AND user_id=?
      ) < ?
    `).bind(
      reviveId,
      context.gameUid,
      context.userId,
      reviveNo,
      cost,
      now,
      context.userId,
      cost,
      context.gameUid,
      context.userId,
      MAX_REVIVES
    ),
    env.DB.prepare(`
      UPDATE users
      SET eggs = COALESCE(eggs,0) - ?
      WHERE id=?
        AND EXISTS (SELECT 1 FROM game_revives WHERE id=?)
    `).bind(cost, context.userId, reviveId)
  ]);

  if (Number(results?.[0]?.meta?.changes || 0) !== 1) {
    return json({ ok: false, code: "REVIVE_NOT_AVAILABLE" }, 409);
  }

  const wallet = await env.DB.prepare(`
    SELECT COALESCE(eggs,0) AS eggs
    FROM users WHERE id=? LIMIT 1
  `).bind(context.userId).first();

  return json({
    ok: true,
    revive_no: reviveNo,
    revives_used: reviveNo,
    max_revives: MAX_REVIVES,
    flappycoin_used: cost,
    eggs_used: cost,
    flappycoin_left: Number(wallet?.eggs || 0),
    eggs_left: Number(wallet?.eggs || 0),
    method: "flappycoin",
    revive_costs_flappycoin: REVIVE_COSTS_FLAPPYCOIN
  });
}

export async function routeInternalAds(request, env, url = new URL(request.url)) {
  if (request.method !== "POST") return null;

  if (url.pathname === "/ads/internal/start") {
    return startInternalAd(request, env, await readJson(request));
  }

  if (url.pathname === "/ads/internal/complete") {
    return completeInternalAd(request, env, await readJson(request));
  }

  if (url.pathname === "/game/revive") {
    const body = await readJson(request);
    const method = String(body?.method || "").toLowerCase();

    if (method === "ad" || method === "rewarded_ad") {
      return rewardedRevive(request, env, body);
    }

    if (method === "eggs" || method === "coins" || method === "flappycoin" || !method) {
      return flappyCoinRevive(request, env, body);
    }
  }

  return null;
}
