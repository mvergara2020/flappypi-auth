const AD_METHODS = new Set(["ad", "rewarded_ad"]);

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
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
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

async function readBody(request) {
  try { return await request.clone().json(); }
  catch (_) { return {}; }
}

async function contextFor(request, env, body) {
  const sessionToken = getCookie(request, "session");
  const gameToken = String(body?.gameToken || "").trim();
  if (!sessionToken || !gameToken) return null;

  try {
    const [session, game] = await Promise.all([
      verifyJWT(sessionToken, env.JWT_SECRET),
      verifyJWT(gameToken, env.JWT_SECRET)
    ]);

    if (!session?.sub || game?.type !== "game" || !game?.game_uid || String(session.sub) !== String(game.sub)) return null;

    return {
      userId: String(session.sub),
      gameUid: String(game.game_uid),
      gameType: String(game.game_type || body?.game_type || "game"),
      tid: String(body?.ad_tid || body?.tid || "").trim()
    };
  } catch (_) {
    return null;
  }
}

async function ensureSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS game_ad_revives (
      game_uid TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tid TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `).run();
}

async function alreadyUsed(env, context) {
  const row = await env.DB.prepare(`
    SELECT tid
    FROM game_ad_revives
    WHERE game_uid = ? AND user_id = ?
    LIMIT 1
  `).bind(context.gameUid, context.userId).first();
  return !!row;
}

function usedResponse() {
  return json({
    ok: false,
    code: "REWARDED_REVIVE_ALREADY_USED",
    message: "The rewarded-ad life has already been used for this game run. Use FlappyCoin for additional revives."
  }, 409);
}

export async function prepareSingleAdRevive(request, env, url = new URL(request.url)) {
  if (request.method !== "POST") return { handled: false };

  const isAdLifecycle = url.pathname === "/ads/internal/start" || url.pathname === "/ads/internal/complete";
  const isRevive = url.pathname === "/game/revive";
  if (!isAdLifecycle && !isRevive) return { handled: false };

  const body = await readBody(request);
  const method = String(body?.method || "").toLowerCase();
  if (isRevive && !AD_METHODS.has(method)) return { handled: false, body };

  const context = await contextFor(request, env, body);
  if (!context) return { handled: false, body };

  await ensureSchema(env);

  if (await alreadyUsed(env, context)) {
    return { handled: true, response: usedResponse(), body, context };
  }

  if (!isRevive) return { handled: false, body, context };
  if (!context.tid) return { handled: false, body, context };

  const result = await env.DB.prepare(`
    INSERT OR IGNORE INTO game_ad_revives (game_uid,user_id,tid,provider,created_at)
    VALUES (?,?,?,?,?)
  `).bind(context.gameUid, context.userId, context.tid, "rewarded_ad", Date.now()).run();

  if (Number(result?.meta?.changes || 0) !== 1) {
    return { handled: true, response: usedResponse(), body, context };
  }

  return {
    handled: false,
    body,
    context,
    reservation: {
      gameUid: context.gameUid,
      userId: context.userId,
      tid: context.tid
    }
  };
}

export async function releaseSingleAdReservation(env, reservation) {
  if (!reservation) return;
  await env.DB.prepare(`
    DELETE FROM game_ad_revives
    WHERE game_uid = ? AND user_id = ? AND tid = ?
  `).bind(reservation.gameUid, reservation.userId, reservation.tid).run().catch(() => {});
}
