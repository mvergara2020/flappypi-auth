var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-D8avqh/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// worker.js
var FRONTEND_ORIGIN = "http://localhost:3000";
var allowedColors = ["yellow", "red", "diamond", "black", "dragon-green", "dragon-blue", "dragon-red", "dragon-black"];
var BASE_BIRDS = ["yellow", "red", "diamond", "black"];
var BIRD_SHIELDS = {
  yellow: 1,
  red: 1,
  diamond: 1,
  black: 1,
  "dragon-green": 2,
  "dragon-blue": 2,
  "dragon-red": 2,
  "dragon-black": 2
};
var FREE_EGG_COOLDOWN = 8 * 60 * 60 * 1e3;
var LEVEL_TARGET = 100;
var MAX_LEVEL_CAP = 50;
var MIN_BASE_SEC = 5;
var MIN_SEC_PER_PIPE = 0.35;
var MAX_SCORE_PER_SEC = 3;
var EXTRA_ATTACK_COST = 6;
var MIN_FLAMES_TO_BE_ATTACKABLE = 50;
var MAX_STEAL = 75;
var DEV_PIPE_GAP = 1;
var LEVEL_DEFINITION = {
  0: { mode: "normal", label: "\u221E", isInfinity: true, pipes_target: 100 },
  1: { mode: "normal", estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 25 },
  2: { mode: "normal", estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 25 },
  3: { mode: "normal", vx: 1.3, estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 25 },
  //x2
  4: { mode: "normal", vx: 1.3, estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 25 },
  //x2
  5: { mode: "normal", vx: 1.8, estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 25 },
  //x3
  6: { mode: "normal", vx: 1.8, estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 25 },
  //x3
  7: { mode: "normal", estrecho: 0.79 * DEV_PIPE_GAP, pipes_target: 25 },
  8: { mode: "normal", estrecho: 0.79 * DEV_PIPE_GAP, pipes_target: 25 },
  9: { mode: "normal", estrecho: 0.79 * DEV_PIPE_GAP, vx: 1.3, pipes_target: 25 },
  //x2
  10: { mode: "normal", estrecho: 0.79 * DEV_PIPE_GAP, vx: 1.3, pipes_target: 25 },
  //x2
  11: { mode: "moving", estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 30 },
  12: { mode: "moving", estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 30 },
  13: { mode: "moving", estrecho: 0.82 * DEV_PIPE_GAP, vx: 1.3, pipes_target: 30 },
  //x2
  14: { mode: "moving", estrecho: 0.82 * DEV_PIPE_GAP, vx: 1.3, pipes_target: 30 },
  //x2
  15: { mode: "moving", estrecho: 0.82 * DEV_PIPE_GAP, vx: 1.8, pipes_target: 30 },
  //x3
  16: { mode: "moving", estrecho: 0.82 * DEV_PIPE_GAP, vx: 1.8, pipes_target: 30 },
  //x3
  17: { mode: "moving", estrecho: 0.79 * DEV_PIPE_GAP, pipes_target: 30 },
  18: { mode: "moving", estrecho: 0.79 * DEV_PIPE_GAP, pipes_target: 30 },
  19: { mode: "moving", estrecho: 0.79 * DEV_PIPE_GAP, vx: 1.3, pipes_target: 30 },
  //x2
  20: { mode: "moving", estrecho: 0.79 * DEV_PIPE_GAP, vx: 1.3, pipes_target: 30 },
  //x2
  21: { mode: "fade", estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 50 },
  22: { mode: "fade", estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 50 },
  23: { mode: "fade", vx: 1.3, estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 50 },
  //x2
  24: { mode: "fade", vx: 1.3, estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 50 },
  //x2
  25: { mode: "fade", vx: 1.8, estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 50 },
  //x3
  26: { mode: "fade", vx: 1.8, estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 50 },
  //x3
  27: { mode: "fade", estrecho: 0.79 * DEV_PIPE_GAP, pipes_target: 50 },
  28: { mode: "fade", estrecho: 0.79 * DEV_PIPE_GAP, pipes_target: 50 },
  29: { mode: "fade", estrecho: 0.79 * DEV_PIPE_GAP, vx: 1.3, pipes_target: 50 },
  //x2
  30: { mode: "fade", estrecho: 0.79 * DEV_PIPE_GAP, vx: 1.3, pipes_target: 50 },
  //x2
  31: { mode: "fade_moving", estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 50 },
  32: { mode: "fade_moving", estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 50 },
  33: { mode: "fade_moving", vx: 1.3, estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 50 },
  //x2
  34: { mode: "fade_moving", vx: 1.3, estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 50 },
  //x2
  35: { mode: "fade_moving", vx: 1.8, estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 50 },
  //x3
  36: { mode: "fade_moving", vx: 1.8, estrecho: 0.82 * DEV_PIPE_GAP, pipes_target: 50 },
  //x3
  37: { mode: "fade_moving", estrecho: 0.79 * DEV_PIPE_GAP, pipes_target: 50 },
  38: { mode: "fade_moving", estrecho: 0.79 * DEV_PIPE_GAP, pipes_target: 50 },
  39: { mode: "fade_moving", estrecho: 0.79 * DEV_PIPE_GAP, vx: 1.3, pipes_target: 50 },
  //x2
  40: { mode: "fade_moving", estrecho: 0.79 * DEV_PIPE_GAP, vx: 1.3, pipes_target: 50 },
  //x2
  41: { mode: "moving", estrecho: 0.76 * DEV_PIPE_GAP, pipes_target: 80 },
  42: { mode: "moving", estrecho: 0.76 * DEV_PIPE_GAP, pipes_target: 80 },
  43: { mode: "moving", estrecho: 0.76 * DEV_PIPE_GAP, vx: 1.3, pipes_target: 80 },
  //x2
  44: { mode: "moving", estrecho: 0.76 * DEV_PIPE_GAP, vx: 1.3, pipes_target: 80 },
  //x2
  45: { mode: "moving", estrecho: 0.76 * DEV_PIPE_GAP, vx: 1.5, pipes_target: 80 },
  //x3
  46: { mode: "moving", estrecho: 0.76 * DEV_PIPE_GAP, vx: 1.5, pipes_target: 100 },
  //x3
  47: { mode: "moving", estrecho: 0.76 * DEV_PIPE_GAP, vx: 1.8, pipes_target: 100 },
  48: { mode: "moving", estrecho: 0.76 * DEV_PIPE_GAP, vx: 1.8, pipes_target: 100 },
  49: { mode: "fade_moving", estrecho: 0.7 * DEV_PIPE_GAP, vx: 1.5, pipes_target: 100 },
  //x2
  50: { mode: "fade_moving", estrecho: 0.7 * DEV_PIPE_GAP, vx: 1.5, pipes_target: 100 },
  //x2
  /*2: { mode: "moving" },
  3: { mode: "fade" },
  4: { mode: "moving_x2" },
  5: { mode: "fade_moving" },
  6: { mode: "moving_x3" },
  7: { mode: "fade_moving_x2" },
  8: { mode: "fade_moving_x3" },*/
  // 🍼 BABY MODE
  99999: {
    mode: "normal",
    label: "\u{1F37C}",
    vx: 0.6,
    // juego más lento
    baby: true
    // flag especial
  }
};
var DUEL_PLATFORM_FEE_RATE = 0.15;
var DUEL_CREATE_COOLDOWN_MS = 60 * 1e3;
var DUEL_EXPIRE_HOURS = 72;
function makeDuelPublicId() {
  const rnd = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `DUEL-${rnd}`;
}
__name(makeDuelPublicId, "makeDuelPublicId");
function mapDevDuelEntry(entryTier, env) {
  const entry = Number(entryTier);
  if (env.ENV !== "dev" && env.ENV !== "qa") {
    return entry;
  }
  const devMap = {
    20: 1,
    50: 2,
    100: 3,
    200: 5,
    500: 8,
    1e3: 10
  };
  return devMap[entry] ?? 1;
}
__name(mapDevDuelEntry, "mapDevDuelEntry");
function buildDuelEconomy(entryTier, env) {
  const nominalEntryTier = Number(entryTier);
  const effectiveEntryTier = mapDevDuelEntry(nominalEntryTier, env);
  const totalPot = effectiveEntryTier * 2;
  const platformFee = totalPot * DUEL_PLATFORM_FEE_RATE;
  const winnerReward = totalPot - platformFee;
  return {
    nominal_entry_tier_pi: nominalEntryTier,
    effective_entry_tier_pi: effectiveEntryTier,
    total_pot_pi: totalPot,
    platform_fee_rate: DUEL_PLATFORM_FEE_RATE,
    platform_fee_pi: platformFee,
    winner_reward_pi: winnerReward
  };
}
__name(buildDuelEconomy, "buildDuelEconomy");
function isValidNominalDuelEntryTier(entryTier) {
  return [20, 50, 100, 200, 500, 1e3].includes(Number(entryTier));
}
__name(isValidNominalDuelEntryTier, "isValidNominalDuelEntryTier");
function isValidArenaSetup(arenaSetup) {
  if (!arenaSetup || typeof arenaSetup !== "object") return false;
  const chicks = Array.isArray(arenaSetup.chicks) ? arenaSetup.chicks : [];
  const rockets = Array.isArray(arenaSetup.rockets) ? arenaSetup.rockets : [];
  if (chicks.length !== 3) return false;
  if (rockets.length <= 0) return false;
  return true;
}
__name(isValidArenaSetup, "isValidArenaSetup");
async function assertDuelCreateCooldown(env, userId) {
  const row = await env.DB.prepare(`
    SELECT created_at
    FROM duels
    WHERE creator_user_id = ?
    ORDER BY id DESC
    LIMIT 1
  `).bind(userId).first();
  if (!row?.created_at) {
    return { ok: true };
  }
  const lastCreatedAt = new Date(row.created_at).getTime();
  const now = Date.now();
  const diff = now - lastCreatedAt;
  if (diff < DUEL_CREATE_COOLDOWN_MS) {
    return {
      ok: false,
      retry_after_ms: DUEL_CREATE_COOLDOWN_MS - diff
    };
  }
  return { ok: true };
}
__name(assertDuelCreateCooldown, "assertDuelCreateCooldown");
async function insertDuelEvent(env, duelId, eventType, actorUserId, eventJson = null) {
  await env.DB.prepare(`
    INSERT INTO duel_events (duel_id, event_type, actor_user_id, event_json)
    VALUES (?, ?, ?, ?)
  `).bind(
    duelId,
    eventType,
    actorUserId || null,
    eventJson ? JSON.stringify(eventJson) : null
  ).run();
}
__name(insertDuelEvent, "insertDuelEvent");
function cacheKey(path) {
  return new Request(`https://cache.flappypi/${path}`);
}
__name(cacheKey, "cacheKey");
function makeTid(prefix = "rv") {
  const rnd = new Uint8Array(16);
  crypto.getRandomValues(rnd);
  const hex = [...rnd].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${Date.now()}_${hex}`;
}
__name(makeTid, "makeTid");
async function readJsonSafe(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
__name(readJsonSafe, "readJsonSafe");
var SPIN_TABLE_V1 = {
  version: "v1",
  // Nota: weights en "porcentaje" entero para dejarlo legible
  items: [
    { type: "eggs", amount: 1, weight: 50 },
    { type: "eggs", amount: 2, weight: 30 },
    { type: "eggs", amount: 3, weight: 8 },
    { type: "eggs", amount: 4, weight: 2 },
    { type: "eggs", amount: 5, weight: 1 },
    { type: "hearts", amount: 1, weight: 50 },
    { type: "hearts", amount: 2, weight: 30 },
    { type: "hearts", amount: 3, weight: 8 },
    { type: "hearts", amount: 4, weight: 2 },
    { type: "hearts", amount: 5, weight: 1 }
  ]
};
function cryptoRandInt(maxExclusive) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % maxExclusive;
}
__name(cryptoRandInt, "cryptoRandInt");
function rollSpin(table = SPIN_TABLE_V1) {
  const items = table.items;
  const total = items.reduce((acc2, it) => acc2 + (it.weight || 0), 0);
  if (total <= 0) throw new Error("SPIN_TABLE_INVALID_TOTAL");
  const r = cryptoRandInt(total);
  let acc = 0;
  for (const it of items) {
    acc += it.weight;
    if (r < acc) {
      return {
        version: table.version,
        roll: r,
        total,
        reward: { type: it.type, amount: it.amount },
        // opcional: snapshot de probabilidades para transparencia
        probabilities: items.map((x) => ({
          type: x.type,
          amount: x.amount,
          weight: x.weight,
          pct: x.weight / total * 100
        }))
      };
    }
  }
  throw new Error("SPIN_ROLL_FAILED");
}
__name(rollSpin, "rollSpin");
function getLevelTargetPipes(level_id) {
  if (level_id === 0) return null;
  if (level_id === 99999) return null;
  const cfg = getLevelConfig(level_id);
  const target = Number(cfg?.pipes_target);
  if (Number.isInteger(target) && target > 0) return target;
  return LEVEL_TARGET;
}
__name(getLevelTargetPipes, "getLevelTargetPipes");
async function generateUniqueUsername(env, googleSub) {
  for (let i = 0; i < 5; i++) {
    const candidate = generateUsername(googleSub, i);
    const exists = await env.DB.prepare(
      "SELECT 1 FROM users WHERE user_name = ? LIMIT 1"
    ).bind(candidate).first();
    if (!exists) {
      return candidate;
    }
  }
  return `user_${googleSub.slice(-8)}`;
}
__name(generateUniqueUsername, "generateUniqueUsername");
function randomDigits(length = 10) {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (n) => n % 10).join("");
}
__name(randomDigits, "randomDigits");
var ORIGINS = /* @__PURE__ */ new Set([
  "http://localhost:3000",
  "https://qa.classic.flappypi.com",
  "https://classic.flappypi.com"
]);
function isAllowedOrigin(origin) {
  return origin && ORIGINS.has(origin);
}
__name(isAllowedOrigin, "isAllowedOrigin");
function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return {};
  if (!isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, X-CSRF",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Vary": "Origin"
  };
}
__name(corsHeaders, "corsHeaders");
function generateUsername() {
  const prefix = "flappypi";
  const digits = randomDigits(10);
  return `${prefix}_${digits}`;
}
__name(generateUsername, "generateUsername");
function ymdHmsUTC(ms = Date.now()) {
  const d = new Date(ms);
  const pad = /* @__PURE__ */ __name((n) => String(n).padStart(2, "0"), "pad");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
__name(ymdHmsUTC, "ymdHmsUTC");
async function audit(env, request, {
  user_id = null,
  action,
  outcome,
  reason = null,
  game_uid = null,
  nonce = null,
  score = null,
  delta_score = null,
  reward_json = null,
  meta = null
}) {
  try {
    const ts_ms = Date.now();
    const ts_ymd = ymdHmsUTC(ts_ms);
    const id = crypto.randomUUID();
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || null;
    const ua = request.headers.get("User-Agent") || null;
    const path = new URL(request.url).pathname;
    await env.DB.prepare(`
      INSERT INTO audit_events (
        id, ts_ms, ts_ymd,
        user_id, ip, ua, path,
        action, outcome, reason,
        game_uid, nonce,
        score, delta_score,
        reward_json, meta_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      ts_ms,
      ts_ymd,
      user_id,
      ip,
      ua,
      path,
      action,
      outcome,
      reason,
      game_uid,
      nonce,
      score,
      delta_score,
      reward_json ? typeof reward_json === "string" ? reward_json : JSON.stringify(reward_json) : null,
      meta ? JSON.stringify(meta).slice(0, 4e3) : null
    ).run();
  } catch (e) {
    console.warn("audit failed:", e?.message || e);
  }
}
__name(audit, "audit");
function calcDurationSec(payloadStartedAt) {
  return (Date.now() - Number(payloadStartedAt)) / 1e3;
}
__name(calcDurationSec, "calcDurationSec");
function validateCompleteGameAttempt({ payload, body }) {
  const { score, jumps, positions, complete_game } = body;
  if (complete_game !== true) {
    return { ok: true, forcedComplete: false, reason: null, meta: { complete_requested: false } };
  }
  const mode = payload.mode;
  const level_id = Number(payload.level_id);
  if (mode !== "levels") {
    return { ok: false, forcedComplete: false, reason: "COMPLETE_NOT_LEVELS_MODE", meta: { mode, level_id } };
  }
  if (!Number.isInteger(level_id) || level_id <= 0 || level_id === 99999) {
    return { ok: false, forcedComplete: false, reason: "COMPLETE_INVALID_LEVEL_ID", meta: { level_id } };
  }
  const target = getLevelTargetPipes(level_id);
  if (!Number.isInteger(target) || target <= 0) {
    return { ok: false, forcedComplete: false, reason: "COMPLETE_TARGET_NOT_DEFINED", meta: { level_id, target } };
  }
  if (!Number.isInteger(score) || score < target) {
    return { ok: false, forcedComplete: false, reason: "COMPLETE_SCORE_BELOW_TARGET", meta: { score, target, level_id } };
  }
  const durationSec = calcDurationSec(payload.startedAt);
  const minDurationSec = Math.max(MIN_BASE_SEC, target * MIN_SEC_PER_PIPE);
  if (durationSec < minDurationSec) {
    return {
      ok: false,
      forcedComplete: false,
      reason: "COMPLETE_TOO_FAST",
      meta: { durationSec, min: minDurationSec, target, level_id }
    };
  }
  const MAX_COMPLETE_SCORE_PER_SEC = 2;
  if (score > durationSec * MAX_COMPLETE_SCORE_PER_SEC) {
    return { ok: false, forcedComplete: false, reason: "COMPLETE_SCORE_TIME_ANOMALY", meta: { score, durationSec, maxSps: MAX_COMPLETE_SCORE_PER_SEC } };
  }
  if (Number.isInteger(jumps)) {
    const ratio = score > 0 ? jumps / score : jumps;
    if (ratio < 0.3) {
      return { ok: false, forcedComplete: false, reason: "COMPLETE_JUMPS_TOO_LOW", meta: { jumps, score, ratio } };
    }
    if (ratio > 30) {
      return { ok: false, forcedComplete: false, reason: "COMPLETE_JUMPS_TOO_HIGH", meta: { jumps, score, ratio } };
    }
  }
  return {
    ok: true,
    forcedComplete: true,
    reason: null,
    meta: { mode, level_id, target, durationSec }
  };
}
__name(validateCompleteGameAttempt, "validateCompleteGameAttempt");
function getLevelConfig(level_id) {
  return LEVEL_DEFINITION[level_id] || LEVEL_DEFINITION[String(level_id)] || null;
}
__name(getLevelConfig, "getLevelConfig");
function base64url(input) {
  return btoa(input).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
__name(base64url, "base64url");
function base64urlDecode(input) {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = input.length % 4;
  if (pad) input += "=".repeat(4 - pad);
  return atob(input);
}
__name(base64urlDecode, "base64urlDecode");
async function signJWT(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encHeader = base64url(JSON.stringify(header));
  const encPayload = base64url(JSON.stringify(payload));
  const data = `${encHeader}.${encPayload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return `${data}.${base64url(
    String.fromCharCode(...new Uint8Array(signature))
  )}`;
}
__name(signJWT, "signJWT");
async function requireUser(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const token = cookie.match(/session=([^;]+)/)?.[1];
  if (!token) {
    return null;
  }
  let payload;
  try {
    payload = await verifyJWT(token, env.JWT_SECRET);
  } catch {
    return null;
  }
  if (payload.exp < Math.floor(Date.now() / 1e3)) {
    return null;
  }
  const user = await env.DB.prepare(
    "SELECT id, email, user_name, total_score FROM users WHERE id = ?"
  ).bind(payload.sub).first();
  return user || null;
}
__name(requireUser, "requireUser");
async function verifyJWT(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("JWT_FORMAT");
  const [encHeader, encPayload, encSig] = parts;
  const data = `${encHeader}.${encPayload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sigBytes = Uint8Array.from(atob(encSig.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encSig.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(data)
  );
  if (!ok) throw new Error("JWT_BAD_SIGNATURE");
  const payload = JSON.parse(base64urlDecode(encPayload));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3)) throw new Error("JWT_EXPIRED");
  const header = JSON.parse(base64urlDecode(encHeader));
  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new Error("JWT_HEADER_INVALID");
  }
  return payload;
}
__name(verifyJWT, "verifyJWT");
var worker_default = {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(request)
        });
      }
      if (url.pathname === "/health") {
        return new Response("flappypi-auth OK");
      }
      if (url.pathname === "/auth/login") {
        const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        google.searchParams.set("client_id", env.CLIENT_ID);
        google.searchParams.set("redirect_uri", env.REDIRECT_URI);
        google.searchParams.set("response_type", "code");
        google.searchParams.set("scope", "openid email profile");
        google.searchParams.set("prompt", "select_account");
        return Response.redirect(google.toString(), 302);
      }
      if (url.pathname === "/eggs/claim-free" && request.method === "POST") {
        try {
          const user = await requireUser(request, env);
          if (!user) {
            return new Response("Unauthorized", {
              status: 401,
              headers: corsHeaders(request)
            });
          }
          const now = Date.now();
          const row = await env.DB.prepare(`
        SELECT eggs, last_free_egg_at
        FROM users
        WHERE id = ?
      `).bind(user.id).first();
          const lastClaim = row?.last_free_egg_at || 0;
          if (now - lastClaim < FREE_EGG_COOLDOWN) {
            return new Response(
              JSON.stringify({
                ok: false,
                reason: "cooldown",
                next_claim_at: lastClaim + FREE_EGG_COOLDOWN
              }),
              {
                status: 429,
                headers: {
                  ...corsHeaders(request),
                  "Content-Type": "application/json"
                }
              }
            );
          }
          await env.DB.batch([
            // sumar huevo
            env.DB.prepare(`
          UPDATE users
          SET
            eggs = eggs + 1,
            last_free_egg_at = ?
          WHERE id = ?
        `).bind(now, user.id),
            // registrar reward
            env.DB.prepare(`
          INSERT INTO egg_rewards (
            id,
            user_id,
            source,
            eggs,
            created_at
          ) VALUES (?, ?, ?, ?, ?)
        `).bind(
              crypto.randomUUID(),
              user.id,
              "free_8h",
              1,
              now
            )
          ]);
          return new Response(
            JSON.stringify({
              ok: true,
              eggs: row.eggs + 1,
              next_claim_at: now + FREE_EGG_COOLDOWN
            }),
            {
              headers: {
                ...corsHeaders(request),
                "Content-Type": "application/json"
              }
            }
          );
        } catch (err) {
          const errorInfo = {
            name: err?.name,
            message: err?.message,
            stack: err?.stack,
            cause: err?.cause
          };
          console.error(
            "[/game/finish] ERROR DETALLADO:",
            JSON.stringify(errorInfo, null, 2)
          );
          return new Response(
            JSON.stringify({
              error: "finish_failed",
              message: err?.message || "Unknown error",
              code: err?.name || "UNEXPECTED_ERROR"
            }),
            {
              status: 500,
              headers: {
                ...corsHeaders(request),
                "Content-Type": "application/json"
              }
            }
          );
        }
      }
      if (url.pathname === "/auth/callback") {
        const code = url.searchParams.get("code");
        if (!code) return new Response("Missing code", { status: 400 });
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: env.CLIENT_ID,
            client_secret: env.CLIENT_SECRET,
            redirect_uri: env.REDIRECT_URI,
            grant_type: "authorization_code"
          })
        });
        const token = await tokenRes.json();
        if (!token.access_token) {
          return new Response(JSON.stringify(token), { status: 500 });
        }
        const userRes = await fetch(
          "https://openidconnect.googleapis.com/v1/userinfo",
          {
            headers: {
              Authorization: `Bearer ${token.access_token}`
            }
          }
        );
        const user = await userRes.json();
        if (!user.sub || !user.email) {
          return new Response("Invalid user", { status: 500 });
        }
        const generatedUsername = await generateUniqueUsername(env, user.sub);
        await env.DB.prepare(
          `
        INSERT INTO users (id, email, name, picture, user_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name,
          picture = excluded.picture
        `
        ).bind(
          user.sub,
          user.email,
          user.name || null,
          user.picture || null,
          generatedUsername,
          Date.now()
        ).run();
        const jwt = await signJWT(
          {
            sub: user.sub,
            email: user.email,
            name: user.name,
            iat: Math.floor(Date.now() / 1e3),
            exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 24 * 30
          },
          env.JWT_SECRET
        );
        const isProd = env.ENV !== "dev";
        const cookieFlags = isProd ? "HttpOnly; SameSite=None; Secure; Path=/; Max-Age=2592000" : "HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000";
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders(request),
            //"Set-Cookie": `session=${jwt}; HttpOnly; SameSite=None; Secure; Path=/`,
            //"Set-Cookie": `session=${jwt}; HttpOnly; SameSite=None; Secure; Path=/; Max-Age=2592000`,
            "Set-Cookie": `session=${jwt}; ${cookieFlags}`,
            "Location": FRONTEND_ORIGIN
          }
        });
      }
      if (url.pathname === "/me") {
        const cookie = request.headers.get("Cookie") || "";
        const token = cookie.match(/session=([^;]+)/)?.[1];
        const lvlLoaded = url.searchParams.get("lvl_loaded") === "1";
        if (!token) {
          return new Response("Unauthorized", {
            status: 401,
            headers: corsHeaders(request)
          });
        }
        let payload;
        try {
          payload = await verifyJWT(token, env.JWT_SECRET);
        } catch {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        }
        if (payload.exp < Math.floor(Date.now() / 1e3)) {
          return new Response("Token expired", {
            status: 401,
            headers: corsHeaders(request)
          });
        }
        const user = await env.DB.prepare(`
        SELECT
          id,
          name,
          picture,
          eggs,
          last_free_egg_at,
          user_name,
          pi_wallet,
          twitter,
          COALESCE(max_score, 0) AS max_score,
          COALESCE(total_score, 0) AS total_score,
          COALESCE(max_level_unlocked, 1) AS max_level_unlocked,
          COALESCE(last_selected_level, 0) AS last_selected_level,
          created_at,
          auth_provider,
          welcome_claimed,
          bird_color,
          hearts,
          free_spins
        FROM users
        WHERE id = ?
      `).bind(payload.sub).first();
        if (!user) {
          return new Response("User not found", {
            status: 401,
            headers: corsHeaders(request)
          });
        }
        const rankRow = await env.DB.prepare(`
        SELECT COUNT(*) + 1 AS rank
        FROM users
        WHERE
          COALESCE(total_score, 0) > ?
          OR (
            COALESCE(total_score, 0) = ?
            AND created_at < ?
          )
      `).bind(
          user.total_score,
          user.total_score,
          user.created_at
        ).first();
        const birdColor = user.bird_color || "yellow";
        let maxShields = BIRD_SHIELDS[birdColor] || 1;
        let bird_maxShields = BIRD_SHIELDS[birdColor] || 1;
        let userShields = user.hearts || 0;
        if (userShields < maxShields)
          maxShields = userShields;
        const ownedDragonsRows = await env.DB.prepare(`
        SELECT skin_id
        FROM user_dragon_skins
        WHERE user_id = ?
      `).bind(user.id).all();
        const owned_dragons = (ownedDragonsRows.results || []).map((r) => r.skin_id);
        let data_return_LEVEL_DEFINITION = null;
        if (!lvlLoaded)
          data_return_LEVEL_DEFINITION = LEVEL_DEFINITION;
        return new Response(JSON.stringify({
          id: user.id,
          name: user.name,
          eggs: user.eggs,
          last_free_egg_at: user.last_free_egg_at,
          user_name: user.user_name,
          pi_wallet: user.pi_wallet,
          twitter: user.twitter,
          picture: user.picture,
          max_score: user.max_score,
          total_score: user.total_score,
          rank_total: rankRow.rank,
          max_level_unlocked: user.max_level_unlocked,
          last_selected_level: user.last_selected_level,
          auth_provider: user.auth_provider,
          welcome_claimed: user.welcome_claimed,
          bird_color: user.bird_color,
          hearts: user.hearts,
          bird_shields: maxShields,
          //Máximos escudos para utilizar por usuario
          bird_shields_max: bird_maxShields,
          //
          free_spins: user.free_spins,
          owned_dragons,
          LEVEL_DEFINITION: data_return_LEVEL_DEFINITION
        }), {
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        });
      }
      if (url.pathname === "/tops" && request.method === "GET") {
        const [topBest, topTotal] = await Promise.all([
          env.DB.prepare(`
          SELECT 
            name, 
            user_name, 
            max_score,
            bird_color
          FROM users
          /*WHERE max_score > 0*/
          ORDER BY max_score DESC, created_at ASC
          LIMIT 20
        `).all(),
          env.DB.prepare(`
          SELECT 
            name, 
            user_name, 
            total_score,
            bird_color
          FROM users
          /*WHERE total_score > 0*/
          ORDER BY total_score DESC, created_at ASC
          LIMIT 20
        `).all()
        ]);
        let me_best = null;
        let me_total = null;
        let var_audit = "";
        const user = await requireUser(request, env);
        if (user?.id) {
          const meRow = await env.DB.prepare(`
          SELECT id, name, user_name, bird_color, created_at,
                 COALESCE(max_score,0) AS max_score,
                 COALESCE(total_score,0) AS total_score
          FROM users
          WHERE id = ?
        `).bind(user.id).first();
          if (meRow) {
            const rBest = await env.DB.prepare(`
              SELECT COUNT(*) + 1 AS rank
              FROM users
              WHERE
                COALESCE(max_score, 0) > ?
                OR (
                  COALESCE(max_score, 0) = ?
                  AND created_at < ?
                )
            `).bind(meRow.max_score, meRow.max_score, meRow.created_at).first();
            me_best = {
              rank: Number(rBest?.rank || 1),
              name: meRow.name,
              user_name: meRow.user_name,
              max_score: Number(meRow.max_score),
              bird_color: meRow.bird_color || "yellow"
            };
            const rTotal = await env.DB.prepare(`
              SELECT COUNT(*) + 1 AS rank
              FROM users
              WHERE
                COALESCE(total_score, 0) > ?
                OR (
                  COALESCE(total_score, 0) = ?
                  AND created_at < ?
                )
            `).bind(meRow.total_score, meRow.total_score, meRow.created_at).first();
            me_total = {
              rank: Number(rTotal?.rank || 1),
              name: meRow.name,
              user_name: meRow.user_name,
              total_score: Number(meRow.total_score),
              bird_color: meRow.bird_color || "yellow"
            };
          }
        }
        return new Response(JSON.stringify({
          var_audit,
          best: topBest.results ?? [],
          total: topTotal.results ?? [],
          me_best,
          // null si no hay sesión o max_score=0
          me_total
          // null si no hay sesión o total_score=0
        }), {
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache"
          }
        });
      }
      if (url.pathname === "/game/state" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        }
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400, headers: corsHeaders(request) });
        }
        const requestedMax = Number(body.max_level_unlocked);
        const requestedLast = Number(body.last_selected_level);
        if (!Number.isInteger(requestedMax) || !Number.isInteger(requestedLast)) {
          return new Response("Invalid fields", { status: 400, headers: corsHeaders(request) });
        }
        if (requestedMax < 0 || requestedMax > MAX_LEVEL_CAP) {
          return new Response("Out of range", { status: 400, headers: corsHeaders(request) });
        }
        const row = await env.DB.prepare(`SELECT max_level_unlocked, last_selected_level FROM users WHERE id = ?`).bind(user.id).first();
        if (!row) {
          return new Response("User not found", { status: 404, headers: corsHeaders(request) });
        }
        const currentMax = Number(row.max_level_unlocked ?? 0);
        const currentLast = Number(row.last_selected_level ?? 0);
        const MAX_STEP = 1;
        if (requestedMax < currentMax) {
          return new Response("Cannot decrease max level", { status: 400, headers: corsHeaders(request) });
        }
        if (requestedMax > currentMax + MAX_STEP) {
          return new Response("Level jump too large", { status: 409, headers: corsHeaders(request) });
        }
        const safeLast = Math.min(Math.max(requestedLast, 0), requestedMax);
        await env.DB.prepare(`
        UPDATE users
        SET
          max_level_unlocked = ?,
          last_selected_level = ?
        WHERE id = ?
      `).bind(requestedMax, safeLast, user.id).run();
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/profile/update" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", {
            status: 401,
            headers: corsHeaders(request)
          });
        }
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", {
            status: 400,
            headers: corsHeaders(request)
          });
        }
        const { name, wallet, twitter, bird_color } = body;
        if (!name || !name.trim()) {
          return new Response("Name required", {
            status: 400,
            headers: corsHeaders(request)
          });
        }
        if (wallet && wallet.length > 120) {
          return new Response("Invalid wallet", {
            status: 400,
            headers: corsHeaders(request)
          });
        }
        let real_color = bird_color;
        if (!allowedColors.includes(real_color)) {
          real_color = "yellow";
        }
        if (!BASE_BIRDS.includes(real_color)) {
          const rows = await env.DB.prepare(`
          SELECT skin_id
          FROM user_dragon_skins
          WHERE user_id = ?
        `).bind(user.id).all();
          const ownedDragons = rows.results.map((r) => r.skin_id);
          if (!ownedDragons.includes(real_color)) {
            real_color = "yellow";
          }
        }
        let twitterClean = null;
        if (twitter) {
          twitterClean = twitter.replace(/^@/, "").trim();
          if (!/^[a-zA-Z0-9_]{1,15}$/.test(twitterClean)) {
            return new Response("Invalid Twitter username", {
              status: 400,
              headers: corsHeaders(request)
            });
          }
        }
        await env.DB.prepare(`
        UPDATE users
        SET
          name = ?,
          pi_wallet = ?,
          twitter = ?,
          bird_color = ?
        WHERE id = ?
      `).bind(
          name.trim(),
          wallet?.trim() || null,
          twitterClean,
          real_color,
          user.id
        ).run();
        return new Response(
          JSON.stringify({ ok: true, bird_color: real_color }),
          {
            status: 200,
            headers: {
              ...corsHeaders(request),
              "Content-Type": "application/json"
            }
          }
        );
      }
      const MAX_REVIVES = 3;
      if (url.pathname === "/game/revive" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        }
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400, headers: corsHeaders(request) });
        }
        if (env.ENV !== "dev") {
          const { turnstile_token } = body;
          const ts = await verifyTurnstileToken({
            token: turnstile_token,
            request,
            env
          });
          if (!ts.ok) {
            await audit(env, request, {
              user_id: user.id,
              action: "TURNSTILE_REJECT",
              outcome: "REJECT",
              reason: ts.code + ", game-revive not found turnstile_token",
              meta: { details: ts.details || null }
            });
          }
        }
        const { gameToken, method, ad_tid } = body;
        if (!gameToken) {
          return new Response("Missing game token", { status: 400, headers: corsHeaders(request) });
        }
        const reviveMethod = method === "ad" ? "ad" : "eggs";
        let payload;
        try {
          payload = await verifyJWT(gameToken, env.JWT_SECRET);
        } catch {
          return new Response("Invalid game token", { status: 401, headers: corsHeaders(request) });
        }
        if (payload.sub !== user.id || payload.type !== "game") {
          return new Response("Invalid game token", { status: 401, headers: corsHeaders(request) });
        }
        const { game_uid } = payload;
        if (!game_uid) {
          return new Response("Invalid game context", { status: 400, headers: corsHeaders(request) });
        }
        const reviveAgg = await env.DB.prepare(`
        SELECT COUNT(*) AS cnt
        FROM game_revives
        WHERE game_uid = ? AND user_id = ?
      `).bind(game_uid, user.id).first();
        const used = Number(reviveAgg?.cnt || 0);
        if (used >= MAX_REVIVES) {
          return new Response(
            JSON.stringify({ ok: false, message: "Revive limit reached", revives_used: used, max_revives: MAX_REVIVES }),
            { status: 400, headers: { ...corsHeaders(request), "Content-Type": "application/json" } }
          );
        }
        const reviveNo = used + 1;
        let eggsCost = 5;
        let dbUser2 = null;
        if (reviveMethod === "ad") {
          const tid = String(ad_tid || "").trim();
          if (!tid) {
            return new Response(JSON.stringify({ ok: false, message: "Missing ad_tid" }), {
              status: 400,
              headers: { ...corsHeaders(request), "Content-Type": "application/json" }
            });
          }
          const row = await env.DB.prepare(`
          SELECT status FROM ad_rewards
          WHERE provider='applixir' AND reward_type='revive' AND tid=? AND user_id=?
          LIMIT 1
        `).bind(tid, user.id).first();
          if (!row || row.status !== "rewarded") {
            await audit(env, request, {
              user_id: user.id,
              action: "GAME_REVIVE_REJECT",
              outcome: "REJECT",
              reason: "AD_NOT_REWARDED",
              meta: { tid, status: row?.status || null }
            });
            return new Response(JSON.stringify({ ok: false, message: "Ad not verified" }), {
              status: 409,
              headers: { ...corsHeaders(request), "Content-Type": "application/json" }
            });
          }
          await env.DB.prepare(`
          UPDATE ad_rewards
          SET status='consumed', consumed_at=?
          WHERE tid=? AND user_id=? AND status='rewarded'
        `).bind(Date.now(), tid, user.id).run();
          eggsCost = 0;
        } else {
          eggsCost = 5;
          const upd = await env.DB.prepare(`
          UPDATE users
          SET eggs = eggs - ?
          WHERE id = ? AND eggs >= ?
        `).bind(eggsCost, user.id, eggsCost).run();
          if (!upd?.meta || upd.meta.changes !== 1) {
            return new Response("Not enough coins", { status: 400, headers: corsHeaders(request) });
          }
          await env.DB.prepare(`
          INSERT INTO game_revives (
            id, game_uid, user_id, revive_no, eggs_used, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            game_uid,
            user.id,
            reviveNo,
            eggsCost,
            Date.now()
          ).run();
        }
        dbUser2 = await env.DB.prepare(
          "SELECT eggs FROM users WHERE id = ?"
        ).bind(user.id).first();
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_REVIVE_OK",
          outcome: "OK",
          game_uid,
          nonce: payload.nonce,
          meta: {
            reviveNo,
            eggsCost
          }
        });
        return new Response(
          JSON.stringify({
            ok: true,
            revive_no: reviveNo,
            revives_used: reviveNo,
            // para UI
            max_revives: MAX_REVIVES,
            eggs_left: Number(dbUser2?.eggs ?? 0)
          }),
          {
            status: 200,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          }
        );
      }
      if (url.pathname === "/logout") {
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders(request),
            // borrar cookie
            "Set-Cookie": "session=; HttpOnly; SameSite=None; Path=/; Max-Age=0",
            // volver al frontend
            "Location": FRONTEND_ORIGIN
          }
        });
      }
      if (url.pathname === "/auth/pi-login" && request.method === "POST") {
        try {
          let body;
          try {
            body = await request.json();
          } catch {
            return new Response("Invalid JSON", {
              status: 400,
              headers: corsHeaders(request)
            });
          }
          const { accessToken } = body;
          if (!accessToken) {
            return new Response("Missing accessToken", {
              status: 400,
              headers: corsHeaders(request)
            });
          }
          const piUser = await verifyPiAccessToken(accessToken, env);
          if (!piUser || !piUser.username) {
            return new Response("Invalid Pi token", {
              status: 401,
              headers: corsHeaders(request)
            });
          }
          const userId = piUser.uid;
          const generatedUsername_pi = await generateUniqueUsername(env, piUser.username);
          let user = await env.DB.prepare(
            "SELECT id FROM users WHERE id = ?"
          ).bind(userId).first();
          if (!user) {
            await env.DB.prepare(`
            INSERT INTO users (
              id,
              auth_provider,
              user_name,
              name,
              eggs,
              max_score,
              total_score,
              max_level_unlocked,
              last_selected_level,
              created_at
            ) VALUES (?, 'pi', ?, ?, 0, 0, 0, 1, 0, ?)
          `).bind(
              userId,
              generatedUsername_pi,
              piUser.username,
              Date.now()
            ).run();
          }
          const jwt = await signJWT({
            sub: userId,
            iat: Math.floor(Date.now() / 1e3),
            exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 24 * 30
          }, env.JWT_SECRET);
          const isProd = env.ENV !== "dev";
          const cookieFlags = isProd ? "HttpOnly; SameSite=None; Secure; Path=/; Max-Age=2592000" : "HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000";
          return new Response(
            JSON.stringify({ ok: true }),
            {
              status: 200,
              headers: {
                ...corsHeaders(request),
                //"Set-Cookie": `session=${jwt}; HttpOnly; SameSite=None; Secure; Path=/`,
                //"Set-Cookie": `session=${jwt}; HttpOnly; SameSite=None; Secure; Path=/; Max-Age=2592000`,
                "Set-Cookie": `session=${jwt}; ${cookieFlags}`,
                "Content-Type": "application/json"
              }
            }
          );
        } catch (err) {
          if (err instanceof Response) {
            return new Response(err.body, {
              status: err.status,
              headers: corsHeaders(request)
            });
          }
          const errorInfo = {
            name: err?.name,
            message: err?.message,
            stack: err?.stack,
            cause: err?.cause
          };
          return new Response("Internal Server Error" + JSON.stringify(errorInfo, null, 2), {
            status: 500,
            headers: corsHeaders(request)
          });
        }
      }
      if (url.pathname === "/game/finish" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400, headers: corsHeaders(request) });
        }
        if (env.ENV !== "dev") {
          const ts = await verifyTurnstileToken({
            token: body.turnstile_token,
            request,
            env
          });
          if (!ts.ok) {
            await audit(env, request, {
              user_id: user.id,
              action: "TURNSTILE_REJECT",
              outcome: "REJECT",
              reason: ts.code,
              meta: { details: ts.details || null }
            });
            return new Response(JSON.stringify({
              ok: false,
              code: ts.code,
              message: "Bot check failed. Please try again."
            }), {
              status: 403,
              headers: { ...corsHeaders(request), "Content-Type": "application/json" }
            });
          }
        }
        let { score, jumps, positions, gameToken, shieldsUsed, complete_game, isFinal } = body;
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_FINISH_ATTEMPT",
          outcome: "OK",
          meta: {
            score,
            complete_game_requested: complete_game === true,
            shieldsUsed,
            isFinal
            // solo para diagnosticar que viene siempre true
          }
        });
        if (!Number.isInteger(score) || score < 0) {
          await audit(env, request, {
            user_id: user.id,
            action: "GAME_FINISH_REJECTED",
            outcome: "REJECT",
            reason: "INVALID_SCORE",
            meta: { score }
          });
          return new Response("Invalid score", { status: 400, headers: corsHeaders(request) });
        }
        if (!gameToken) {
          await audit(env, request, {
            user_id: user.id,
            action: "GAME_FINISH_REJECTED",
            outcome: "REJECT",
            reason: "MISSING_GAME_TOKEN"
          });
          return new Response("Missing game token", { status: 401, headers: corsHeaders(request) });
        }
        let payload;
        try {
          payload = await verifyJWT(gameToken, env.JWT_SECRET);
        } catch (e) {
          await audit(env, request, {
            user_id: user.id,
            action: "GAME_FINISH_REJECTED",
            outcome: "REJECT",
            reason: "JWT_INVALID",
            meta: { msg: String(e?.message || "") }
          });
          return new Response("Invalid game token", { status: 401, headers: corsHeaders(request) });
        }
        if (payload.type !== "game" || payload.sub !== user.id) {
          await audit(env, request, {
            user_id: user.id,
            action: "GAME_FINISH_REJECTED",
            outcome: "REJECT",
            reason: "JWT_CONTEXT_INVALID",
            meta: { type: payload.type, sub: payload.sub }
          });
          return new Response("Invalid game token", { status: 401, headers: corsHeaders(request) });
        }
        const { nonce, game_uid } = payload;
        const startedAtServer = Number(payload.startedAt);
        if (!Number.isFinite(startedAtServer)) {
          await audit(env, request, {
            user_id: user.id,
            action: "GAME_FINISH_REJECTED",
            outcome: "REJECT",
            reason: "JWT_STARTEDAT_INVALID",
            game_uid,
            nonce
          });
          return new Response("Invalid game token (startedAt)", { status: 401, headers: corsHeaders(request) });
        }
        const durationSec = (Date.now() - startedAtServer) / 1e3;
        const MAX_GAME_DURATION_SEC = 60 * 60 * 3;
        if (durationSec > MAX_GAME_DURATION_SEC) {
          await audit(env, request, {
            user_id: user.id,
            action: "GAME_FINISH_REJECTED",
            outcome: "REJECT",
            reason: "GAME_EXPIRED",
            game_uid,
            nonce,
            meta: { durationSec, max: MAX_GAME_DURATION_SEC }
          });
          return new Response("Game expired", { status: 401, headers: corsHeaders(request) });
        }
        if (score > durationSec * MAX_SCORE_PER_SEC) {
          await audit(env, request, {
            user_id: user.id,
            action: "GAME_FINISH_REJECTED",
            outcome: "REJECT",
            reason: "SCORE_TIME_ANOMALY",
            game_uid,
            nonce,
            score,
            meta: { durationSec, maxSps: MAX_SCORE_PER_SEC }
          });
          return new Response("Score/time anomaly", { status: 403, headers: corsHeaders(request) });
        }
        let nonceKeyReq = null;
        let activeKeyReq = null;
        if (env.ENV !== "dev") {
          activeKeyReq = cacheKey(`game-active/${user.id}`);
          const active = await caches.default.match(activeKeyReq);
          if (!active || await active.text() !== nonce) {
            await audit(env, request, {
              user_id: user.id,
              action: "GAME_FINISH_REJECTED",
              outcome: "REJECT",
              reason: "NOT_ACTIVE_GAME",
              game_uid,
              nonce
            });
            return new Response("Not active game", { status: 401, headers: corsHeaders(request) });
          }
          nonceKeyReq = cacheKey(`game-nonce/${nonce}`);
          const nonceEntry = await caches.default.match(nonceKeyReq);
          if (!nonceEntry) {
            await audit(env, request, {
              user_id: user.id,
              action: "GAME_FINISH_REJECTED",
              outcome: "REJECT",
              reason: "NONCE_MISSING_OR_USED",
              game_uid,
              nonce
            });
            return new Response("Game already used", { status: 401, headers: corsHeaders(request) });
          }
        }
        let complete_game_safe = complete_game === true;
        if (complete_game_safe) {
          const completeCheck = validateCompleteGameAttempt({ payload, body });
          if (!completeCheck.ok) {
            await audit(env, request, {
              user_id: user.id,
              action: "GAME_COMPLETE_REJECTED",
              outcome: "REJECT",
              reason: completeCheck.reason,
              game_uid,
              nonce,
              score,
              meta: {
                ...completeCheck.meta,
                complete_game_requested: true,
                complete_game_forced: false,
                durationSec,
                jumps,
                shieldsUsed
              }
            });
            complete_game_safe = false;
          } else {
            await audit(env, request, {
              user_id: user.id,
              action: "GAME_COMPLETE_ACCEPTED",
              outcome: "OK",
              game_uid,
              nonce,
              score,
              meta: {
                ...completeCheck.meta,
                complete_game_requested: true,
                complete_game_forced: true,
                durationSec,
                jumps,
                shieldsUsed
              }
            });
          }
        }
        const lastGame = await env.DB.prepare(`
        SELECT id, score
        FROM games
        WHERE user_id = ? AND game_uid = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(user.id, game_uid).first();
        const lastScore = lastGame ? Number(lastGame.score) : 0;
        if (lastGame && score < lastScore) {
          await audit(env, request, {
            user_id: user.id,
            action: "GAME_FINISH_REJECTED",
            outcome: "REJECT",
            reason: "SCORE_REGRESSION",
            game_uid,
            nonce,
            score,
            meta: { lastScore }
          });
          return new Response("Invalid score regression", { status: 400, headers: corsHeaders(request) });
        }
        const deltaScore = score - lastScore;
        const parentId = lastGame ? lastGame.id : null;
        const isFirstInsert = !lastGame;
        await env.DB.batch([
          env.DB.prepare(`
          INSERT INTO games (user_id, score, id_parent, created_at, game_uid, shields_used)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(user.id, score, parentId, Date.now(), game_uid, shieldsUsed || 0),
          env.DB.prepare(`
          UPDATE users SET
            games_played = games_played + ?,
            total_score = total_score + ?,
            max_score = CASE WHEN ? > max_score THEN ? ELSE max_score END,
            hearts = CASE WHEN hearts >= ? THEN hearts - ? ELSE 0 END
          WHERE id = ?
        `).bind(
            isFirstInsert ? 1 : 0,
            deltaScore,
            score,
            score,
            shieldsUsed || 0,
            shieldsUsed || 0,
            user.id
          )
        ]);
        let spinCreated = false;
        if (complete_game_safe) {
          let source_level = "game";
          let level_id = payload?.level_id;
          if (level_id)
            source_level = "game_level_" + level_id;
          const spinId = crypto.randomUUID();
          const now = Date.now();
          try {
            await env.DB.prepare(`
            INSERT INTO spins (id, user_id, game_uid, status, reward_json, created_at, claimed_at, source)
            VALUES (?, ?, ?, 'PENDING', NULL, ?, NULL, ?)
          `).bind(spinId, user.id, game_uid, now, source_level).run();
            await env.DB.prepare(`UPDATE users SET free_spins = free_spins + 1 WHERE id = ?`).bind(user.id).run();
            spinCreated = true;
          } catch (e) {
            const msg = String(e?.message || "");
            if (!msg.includes("UNIQUE") && !msg.includes("constraint")) throw e;
            spinCreated = false;
          }
        }
        if (env.ENV !== "dev" && complete_game_safe) {
          await caches.default.delete(nonceKeyReq);
          await caches.default.delete(activeKeyReq);
        }
        const updatedUser = await env.DB.prepare(`
        SELECT total_score, max_score, games_played, free_spins
        FROM users
        WHERE id = ?
      `).bind(user.id).first();
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_FINISH_COMMITTED",
          outcome: "OK",
          game_uid,
          nonce,
          score,
          delta_score: deltaScore,
          meta: {
            durationSec,
            shieldsUsed,
            jumps,
            complete_game_requested: complete_game === true,
            complete_game_safe,
            spinCreated
          }
        });
        const isNewBest = score > (user.max_score || 0);
        return new Response(JSON.stringify({
          ok: true,
          total_score: updatedUser.total_score,
          max_score: updatedUser.max_score,
          games_played: updatedUser.games_played,
          delta_score: deltaScore,
          is_new_best: isNewBest,
          free_spins: updatedUser.free_spins
        }), {
          status: 200,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/spin/claim" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        }
        const now = Date.now();
        const spin = await env.DB.prepare(`
        SELECT id, game_uid
        FROM spins
        WHERE user_id = ? AND status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 1
      `).bind(user.id).first();
        if (!spin) {
          return new Response(JSON.stringify({
            ok: false,
            reason: "no_pending_spin"
          }), {
            status: 404,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        const rewardPayload = rollSpin(SPIN_TABLE_V1);
        const reward = rewardPayload.reward;
        const rewardJson = JSON.stringify({
          ...rewardPayload,
          claimed_at: now,
          source: "free_finish_spin"
        });
        let userUpdateStmt;
        if (reward.type === "eggs") {
          userUpdateStmt = env.DB.prepare(`
          UPDATE users
          SET eggs = eggs + ?,
          free_spins = free_spins - 1
          WHERE id = ? AND free_spins > 0
        `).bind(reward.amount, user.id);
        } else if (reward.type === "hearts") {
          userUpdateStmt = env.DB.prepare(`
          UPDATE users
          SET hearts = hearts + ?,
          free_spins = free_spins - 1
          WHERE id = ? AND free_spins > 0
        `).bind(reward.amount, user.id);
        } else {
          return new Response(JSON.stringify({
            ok: false,
            reason: "invalid_reward_type"
          }), {
            status: 500,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        const claimRes = await env.DB.prepare(`
        UPDATE spins
        SET status = 'CLAIMED',
            reward_json = ?,
            claimed_at = ?
        WHERE id = ? AND user_id = ? AND status = 'PENDING'
      `).bind(rewardJson, now, spin.id, user.id).run();
        if (!claimRes?.meta || claimRes.meta.changes !== 1) {
          await audit(env, request, {
            user_id: user.id,
            action: "SPIN_CLAIM_CONFLICT",
            outcome: "CONFLICT",
            reason: "ALREADY_CLAIMED",
            game_uid: spin.game_uid,
            meta: { spin_id: spin.id }
          });
          return new Response(JSON.stringify({ ok: false, reason: "already_claimed" }), {
            status: 409,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        await userUpdateStmt.run();
        const updated = await env.DB.prepare(`
        SELECT eggs, hearts, free_spins
        FROM users
        WHERE id = ?
      `).bind(user.id).first();
        await audit(env, request, {
          user_id: user.id,
          action: "SPIN_CLAIM_OK",
          outcome: "OK",
          game_uid: spin.game_uid,
          reward_json: rewardJson,
          meta: {
            spin_id: spin.id,
            reward
          }
        });
        return new Response(JSON.stringify({
          ok: true,
          spin_id: spin.id,
          game_uid: spin.game_uid,
          reward,
          // si quieres mostrar % al usuario, ya viene en rewardPayload.probabilities
          //probabilities: rewardPayload.probabilities,
          eggs: updated?.eggs ?? null,
          hearts: updated?.hearts ?? null,
          free_spins: updated?.free_spins ?? null
        }), {
          status: 200,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
      if (request.method === "POST" && url.pathname === "/welcome/claim") {
        try {
          const user = await requireUser(request, env);
          if (!user) {
            return new Response("Unauthorized", {
              status: 401,
              headers: corsHeaders(request)
            });
          }
          if (user.welcome_claimed) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "Welcome coins already claimed",
                eggs: user.eggs
              }),
              {
                status: 400,
                headers: {
                  ...corsHeaders(request),
                  "Content-Type": "application/json"
                }
              }
            );
          }
          const WELCOME_EGGS = 40;
          const WELCOME_SHIELD = 3;
          const WELCOME_SPIN = 5;
          await env.DB.prepare(`
          UPDATE users
          SET 
            eggs = eggs + ?,
            hearts = hearts + ?,
            free_spins = free_spins + ?,
            welcome_claimed = TRUE
          WHERE id = ?
        `).bind(
            WELCOME_EGGS,
            WELCOME_SHIELD,
            WELCOME_SPIN,
            user.id
          ).run();
          const updatedUser = await env.DB.prepare(`
          SELECT eggs, hearts FROM users WHERE id = ?
        `).bind(user.id).first();
          for (let i = 0; i < WELCOME_SPIN; i++) {
            await env.DB.prepare(`
            INSERT INTO spins (id, user_id, source, status, created_at, game_uid, reward_json)
            VALUES (?, ?, 'welcome', 'PENDING', ?, NULL, NULL)
          `).bind(crypto.randomUUID(), user.id, Date.now()).run();
          }
          return new Response(
            JSON.stringify({
              success: true,
              eggs: updatedUser.eggs,
              hearts: updatedUser.hearts,
              added: WELCOME_EGGS,
              added_hearts: WELCOME_SHIELD,
              added_spin: WELCOME_SPIN
            }),
            {
              status: 200,
              headers: {
                ...corsHeaders(request),
                "Content-Type": "application/json"
              }
            }
          );
        } catch (e) {
          console.error("claim-welcome-eggs error:", e);
          return new Response(
            JSON.stringify({
              success: false,
              message: "Internal server error " + e
            }),
            {
              status: 500,
              headers: {
                ...corsHeaders(request),
                "Content-Type": "application/json"
              }
            }
          );
        }
      }
      if (url.pathname === "/shop/dragons/buy" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        const body = await request.json().catch(() => ({}));
        const skinId = String(body?.dragon_id || body?.skin_id || "");
        if (!skinId) {
          return new Response(JSON.stringify({ ok: false, error: "Missing skin_id" }), {
            status: 400,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        const skin = await env.DB.prepare(`
        SELECT id, cost_eggs
        FROM dragon_skins
        WHERE id = ? AND COALESCE(active,1)=1
        LIMIT 1
      `).bind(skinId).first();
        if (!skin) {
          return new Response(JSON.stringify({ ok: false, error: "Skin not found" }), {
            status: 404,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        const cost = Number(skin.cost_eggs || 0);
        const now = Date.now();
        const ins = await env.DB.prepare(`
        INSERT OR IGNORE INTO user_dragon_skins (user_id, skin_id, purchased_at)
        VALUES (?, ?, ?)
      `).bind(user.id, skinId, now).run();
        if (!ins?.meta || ins.meta.changes !== 1) {
          const u = await env.DB.prepare(`SELECT eggs FROM users WHERE id=?`).bind(user.id).first();
          return new Response(JSON.stringify({
            ok: true,
            already_owned: true,
            skin_id: skinId,
            eggs: Number(u?.eggs || 0)
          }), {
            status: 200,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        const upd = await env.DB.prepare(`
        UPDATE users
        SET eggs = eggs - ?
        WHERE id = ? AND eggs >= ?
      `).bind(cost, user.id, cost).run();
        if (!upd?.meta || upd.meta.changes !== 1) {
          await env.DB.prepare(`
          DELETE FROM user_dragon_skins
          WHERE user_id = ? AND skin_id = ?
        `).bind(user.id, skinId).run();
          const u = await env.DB.prepare(`SELECT eggs FROM users WHERE id=?`).bind(user.id).first();
          return new Response(JSON.stringify({
            ok: false,
            error: "Not enough coins",
            code: "NO_EGGS",
            eggs: Number(u?.eggs || 0),
            cost
          }), {
            status: 400,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        const owned = await env.DB.prepare(`
        SELECT skin_id
        FROM user_dragon_skins
        WHERE user_id = ?
      `).bind(user.id).all();
        const ownedDragons = owned.results.map((r) => r.skin_id);
        const u2 = await env.DB.prepare(`SELECT eggs FROM users WHERE id=?`).bind(user.id).first();
        return new Response(JSON.stringify({
          ok: true,
          skin_id: skinId,
          cost,
          eggs: Number(u2?.eggs || 0),
          purchased_at: now,
          owned_dragons: ownedDragons
        }), {
          status: 200,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/game/start" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", {
            status: 401,
            headers: corsHeaders(request)
          });
        }
        const startedAt = Date.now();
        const nonce = crypto.randomUUID();
        const gameUid = crypto.randomUUID();
        let body = {};
        try {
          body = await request.json();
        } catch {
        }
        const mode = body?.mode === "levels" ? "levels" : "infinity";
        let level_id = Number(body?.level_id);
        if (!Number.isInteger(level_id)) level_id = 0;
        if (level_id !== 0 && level_id !== 99999 && (level_id < 1 || level_id > MAX_LEVEL_CAP)) {
          level_id = 0;
        }
        const gameToken = await signJWT(
          {
            sub: user.id,
            nonce,
            game_uid: gameUid,
            // 🎯 lo que nos interesa ahora
            type: "game",
            startedAt,
            iat: Math.floor(Date.now() / 1e3),
            exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 3,
            // 3h
            level_id,
            mode
          },
          env.JWT_SECRET
        );
        if (env.ENV !== "dev") {
          try {
            const activeKey = cacheKey(`game-active/${user.id}`);
            await caches.default.put(
              activeKey,
              new Response(nonce, {
                headers: { "Cache-Control": "max-age=86400" }
              })
            );
            const nonceKey = cacheKey(`game-nonce/${nonce}`);
            await caches.default.put(
              nonceKey,
              new Response("valid", {
                headers: { "Cache-Control": "max-age=86400" }
              })
            );
          } catch (e) {
            console.warn("Cache not available:", e);
          }
        }
        await caches.default.put(
          cacheKey(`revive-count/${user.id}`),
          new Response("0", {
            headers: { "Cache-Control": "max-age=86400" }
          })
        );
        await audit(env, request, {
          user_id: user.id,
          action: "GAME_START",
          outcome: "OK",
          game_uid: gameUid,
          nonce,
          meta: {
            exp: "3h",
            mode,
            // "levels" | "infinity"
            level_id
            // 0 / 1..50 / 99999
          }
        });
        return new Response(
          JSON.stringify({ gameToken }),
          {
            status: 200,
            headers: {
              ...corsHeaders(request),
              "Content-Type": "application/json"
            }
          }
        );
      }
      if (url.pathname === "/ads/revive/consume" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        }
        const body = await readJsonSafe(request);
        const tid = String(body?.tid || "").trim();
        if (!tid) {
          return new Response(JSON.stringify({ ok: false, error: "tid_required" }), {
            status: 400,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        const row = await env.DB.prepare(`
        SELECT status
        FROM ad_rewards
        WHERE provider='applixir' AND reward_type='revive' AND tid=? AND user_id=?
        LIMIT 1
      `).bind(tid, user.id).first();
        if (!row) {
          return new Response(JSON.stringify({ ok: false, error: "tid_not_found" }), {
            status: 404,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        if (row.status !== "rewarded") {
          return new Response(JSON.stringify({ ok: false, error: "not_rewarded_yet", status: row.status }), {
            status: 409,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        const now = Date.now();
        const upd = await env.DB.prepare(`
        UPDATE ad_rewards
        SET status='consumed', consumed_at=?
        WHERE tid=? AND user_id=? AND status='rewarded'
      `).bind(now, tid, user.id).run();
        await audit(env, request, {
          user_id: user.id,
          action: "AD_REVIVE_CONSUME",
          outcome: upd?.meta?.changes === 1 ? "OK" : "CONFLICT",
          meta: { tid }
        });
        return new Response(JSON.stringify({ ok: true, consumed: (upd?.meta?.changes || 0) === 1 }), {
          status: 200,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/ads/applixir/callback") {
        const now = Date.now();
        const q = new URL(request.url).searchParams;
        const body = request.method === "POST" ? await readJsonSafe(request) || {} : {};
        const payload = {
          method: request.method,
          query: Object.fromEntries(q.entries()),
          body,
          ip: request.headers.get("CF-Connecting-IP") || null,
          ua: request.headers.get("User-Agent") || null,
          ts: now
        };
        const tid = body?.tid || body?.transaction_id || body?.transactionId || q.get("tid") || q.get("transaction_id") || q.get("transactionId");
        if (!tid) {
          return new Response(JSON.stringify({ ok: false, error: "tid_missing" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        const res = await env.DB.prepare(`
        UPDATE ad_rewards
        SET status='rewarded', payload_json=?, rewarded_at=?
        WHERE provider='applixir' AND reward_type='revive' AND tid=? AND status='pending'
      `).bind(
          JSON.stringify(payload).slice(0, 4e3),
          now,
          tid
        ).run();
        await audit(env, request, {
          user_id: null,
          action: "APPLIXIR_CALLBACK",
          outcome: "OK",
          reason: res?.meta?.changes === 1 ? "UPDATED" : "NO_CHANGE",
          meta: { tid }
        });
        return new Response(JSON.stringify({ ok: true, tid, updated: res?.meta?.changes || 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/ads/revive/start" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        }
        const tid = makeTid("adrevive");
        const now = Date.now();
        await env.DB.prepare(`
        INSERT INTO ad_rewards (
          id, provider, reward_type, tid, user_id, status, created_at
        ) VALUES (?, 'applixir', 'revive', ?, ?, 'pending', ?)
      `).bind(
          crypto.randomUUID(),
          tid,
          user.id,
          now
        ).run();
        await audit(env, request, {
          user_id: user.id,
          action: "AD_REVIVE_START",
          outcome: "OK",
          meta: { tid }
        });
        return new Response(JSON.stringify({ ok: true, tid }), {
          status: 200,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
      if (request.method === "POST" && url.pathname === "/api/buy-heart") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response(
            JSON.stringify({ error: true, message: "Unauthorized" }),
            {
              status: 401,
              headers: {
                ...corsHeaders(request),
                "Content-Type": "application/json"
              }
            }
          );
        }
        const body = await request.json();
        const heartsToBuy = Number(body.hearts || 0);
        if (heartsToBuy <= 0) {
          return new Response(
            JSON.stringify({ error: true, message: "Invalid hearts amount" }),
            {
              status: 400,
              headers: {
                ...corsHeaders(request),
                "Content-Type": "application/json"
              }
            }
          );
        }
        const HEART_COST = 3;
        const totalCost = HEART_COST * heartsToBuy;
        const current = await env.DB.prepare(`
        SELECT eggs, hearts FROM users WHERE id = ?
      `).bind(user.id).first();
        if (!current) {
          return new Response(
            JSON.stringify({ error: true, message: "User not found" }),
            {
              status: 400,
              headers: {
                ...corsHeaders(request),
                "Content-Type": "application/json"
              }
            }
          );
        }
        if (current.eggs < totalCost) {
          return new Response(
            JSON.stringify({
              error: true,
              message: "Not enough coins",
              eggs: current.eggs,
              hearts: current.hearts,
              required: totalCost
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders(request),
                "Content-Type": "application/json"
              }
            }
          );
        }
        const newEggs = current.eggs - totalCost;
        const newHearts = current.hearts + heartsToBuy;
        await env.DB.prepare(`
        UPDATE users
        SET eggs = ?, hearts = ?
        WHERE id = ?
      `).bind(newEggs, newHearts, user.id).run();
        return new Response(
          JSON.stringify({
            success: true,
            eggs: newEggs,
            hearts: newHearts,
            spent: totalCost,
            gained: heartsToBuy
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders(request),
              "Content-Type": "application/json"
            }
          }
        );
      }
      if (url.pathname === "/duels/create-draft" && request.method === "POST") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", {
            status: 401,
            headers: corsHeaders(request)
          });
        }
        const body = await readJsonSafe(request);
        const entryTier = Number(body?.entry_tier || 0);
        const arenaSetup = body?.arena_setup || null;
        if (!isValidNominalDuelEntryTier(entryTier)) {
          console.error("invalid_entry_tier");
          return new Response(JSON.stringify({
            ok: false,
            error: "invalid_entry_tier"
          }), {
            status: 400,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        if (!isValidArenaSetup(arenaSetup)) {
          console.error("invalid_arena_setup");
          return new Response(JSON.stringify({
            ok: false,
            error: "invalid_arena_setup"
          }), {
            status: 400,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        const cooldown = await assertDuelCreateCooldown(env, user.id);
        if (!cooldown.ok) {
          console.error("duel_create_cooldown");
          return new Response(JSON.stringify({
            ok: false,
            error: "duel_create_cooldown",
            retry_after_ms: cooldown.retry_after_ms
          }), {
            status: 429,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        const economy = buildDuelEconomy(entryTier, env);
        const publicId = makeDuelPublicId();
        const expiresAt = new Date(Date.now() + DUEL_EXPIRE_HOURS * 60 * 60 * 1e3).toISOString();
        const creatorSetupJson = {
          defense: {
            chicks: arenaSetup.chicks || []
          },
          attack_plan: arenaSetup.rockets || [],
          board_meta: {
            radius: 2,
            tile_count: Array.isArray(arenaSetup.rockets) ? arenaSetup.rockets.length : 0
          }
        };
        const insertRes = await env.DB.prepare(`
        INSERT INTO duels (
          public_id,
          status,
          creator_user_id,
          entry_tier_pi,
          nominal_entry_tier_pi,
          effective_entry_tier_pi,
          total_pot_pi,
          platform_fee_rate,
          platform_fee_pi,
          winner_reward_pi,
          creator_payment_status,
          creator_setup_json,
          expires_at
        ) VALUES (?, 'payment_pending', ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).bind(
          publicId,
          user.id,
          economy.nominal_entry_tier_pi,
          // entry_tier_pi viejo
          economy.nominal_entry_tier_pi,
          // nominal_entry_tier_pi nuevo
          economy.effective_entry_tier_pi,
          economy.total_pot_pi,
          economy.platform_fee_rate,
          economy.platform_fee_pi,
          economy.winner_reward_pi,
          JSON.stringify(creatorSetupJson),
          expiresAt
        ).run();
        const duelId = insertRes?.meta?.last_row_id;
        if (!duelId) {
          return new Response(JSON.stringify({
            ok: false,
            error: "duel_insert_failed"
          }), {
            status: 500,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        await insertDuelEvent(env, duelId, "duel_created", user.id, {
          public_id: publicId,
          entry_tier: economy.nominal_entry_tier_pi,
          effective_entry_tier_pi: economy.effective_entry_tier_pi
        });
        await audit(env, request, {
          user_id: user.id,
          action: "DUEL_CREATE_DRAFT",
          outcome: "OK",
          meta: {
            duel_id: duelId,
            public_id: publicId,
            nominal_entry_tier_pi: economy.nominal_entry_tier_pi,
            effective_entry_tier_pi: economy.effective_entry_tier_pi
          }
        });
        console.error("all ok");
        return new Response(JSON.stringify({
          ok: true,
          duel: {
            id: duelId,
            public_id: publicId,
            status: "payment_pending",
            nominal_entry_tier_pi: economy.nominal_entry_tier_pi,
            effective_entry_tier_pi: economy.effective_entry_tier_pi,
            total_pot_pi: economy.total_pot_pi,
            winner_reward_pi: economy.winner_reward_pi,
            expires_at: expiresAt
          },
          payment: {
            amount_pi: economy.effective_entry_tier_pi,
            currency_code: "PI",
            note: env.ENV === "dev" ? "DEV payment mapping applied" : "Production payment amount"
          }
        }), {
          status: 200,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/duels/open" && request.method === "GET") {
        const page = Math.max(1, Number(url.searchParams.get("page") || 1));
        const pageSize = Math.min(20, Number(url.searchParams.get("pageSize") || 10));
        const offset = (page - 1) * pageSize;
        const rows = await env.DB.prepare(`
        SELECT
          d.id,
          d.public_id,
          d.nominal_entry_tier_pi,
          d.winner_reward_pi,
          d.created_at,
          u.user_name,
          u.name,
          u.bird_color
        FROM duels d
        JOIN users u ON u.id = d.creator_user_id
        WHERE d.status = 'open'
          AND (d.reserve_expires_at IS NULL OR d.reserve_expires_at < datetime('now'))
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(pageSize, offset).all();
        return new Response(JSON.stringify({
          ok: true,
          items: rows.results || [],
          page,
          pageSize
        }), {
          status: 200,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/duels/finished" && request.method === "GET") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", {
            status: 401,
            headers: corsHeaders(request)
          });
        }
        const page = Math.max(1, Number(url.searchParams.get("page") || 1));
        const pageSize = Math.min(20, Number(url.searchParams.get("pageSize") || 10));
        const offset = (page - 1) * pageSize;
        const rows = await env.DB.prepare(`
        SELECT
          d.id,
          d.public_id,
          d.creator_user_id,
          d.challenger_user_id,
          d.winner_user_id,
          d.entry_tier_pi,
          d.nominal_entry_tier_pi,
          d.winner_reward_pi,
          d.resolved_at,
          d.created_at,
    
          CASE
            WHEN d.creator_user_id = ? THEN 
              uc.user_name
            ELSE 
              uu.user_name
          END AS opponent_name,
          CASE
            WHEN d.creator_user_id = ? THEN 
              uc.name
            ELSE 
              uu.name
          END AS opponent_name_real,
          CASE
            WHEN d.creator_user_id = ? THEN 
              uc.bird_color
            ELSE 
              uu.bird_color
          END AS opponent_bird_color,
    
          CASE
            WHEN d.winner_user_id = ? THEN 'win'
            ELSE 'loss'
          END AS result,
          uu.name AS creator_name,
          uc.name AS challenger_name,
          d.creator_setup_json,
          d.challenger_setup_json
        FROM duels d
        LEFT JOIN users uc
          ON uc.id = d.challenger_user_id
        LEFT JOIN users uu
          ON uu.id = d.creator_user_id
        WHERE d.status = 'resolved'
          AND (d.creator_user_id = ? OR d.challenger_user_id = ?)
        ORDER BY COALESCE(d.resolved_at, d.created_at) DESC
        LIMIT ? OFFSET ?
      `).bind(
          user.id,
          user.id,
          user.id,
          user.id,
          user.id,
          user.id,
          pageSize,
          offset
        ).all();
        return new Response(JSON.stringify({
          ok: true,
          items: rows.results || [],
          page,
          pageSize
        }), {
          status: 200,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json"
          }
        });
      }
      if (url.pathname.startsWith("/duels/") && url.pathname.endsWith("/reserve") && request.method === "POST") {
        const duelId = Number(url.pathname.split("/")[2]);
        const user = await requireUser(request, env);
        if (!user) return unauthorized();
        const reserveMinutes = 2;
        const result = await env.DB.prepare(`
        UPDATE duels
        SET
          status = 'reserved',
          challenger_user_id = ?,
          reserved_at = datetime('now'),
          reserve_expires_at = datetime('now', '+${reserveMinutes} minutes')
        WHERE id = ?
          AND status = 'open'
          AND challenger_user_id IS NULL
      `).bind(user.id, duelId).run();
        if (result.changes === 0) {
          return new Response(JSON.stringify({
            ok: false,
            error: "duel_not_available"
          }), {
            status: 200,
            headers: { ...corsHeaders(request), "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({
          ok: true,
          message: "Duel reserved"
        }), {
          status: 200,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" }
        });
      }
      if (request.method === "GET" && url.pathname === "/attack/targets") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        }
        return handleAttackTargets(request, env, user.id);
      }
      if (request.method === "POST" && url.pathname === "/attack/execute") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        }
        return handleAttackExecute(request, env, user.id);
      }
      if (request.method === "POST" && url.pathname === "/attack/buy-extra") {
        const user = await requireUser(request, env);
        if (!user) {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });
        }
        return handleBuyExtraAttacks(request, env, user.id);
      }
      return new Response("Not Found", { status: 404 });
    } catch (err) {
      if (err instanceof Response) {
        return new Response(err.body, {
          status: err.status,
          headers: corsHeaders(request)
        });
      }
      const errorInfo = {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        cause: err?.cause
      };
      return new Response("Internal Server Error" + JSON.stringify(errorInfo, null, 2), {
        status: 500,
        headers: corsHeaders(request)
      });
    }
  }
};
async function verifyPiAccessToken(accessToken, env) {
  const res = await fetch("https://api.minepi.com/v2/me", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "X-API-Key": env.PI_API_KEY
    }
  });
  if (!res.ok) {
    return null;
  }
  return await res.json();
}
__name(verifyPiAccessToken, "verifyPiAccessToken");
async function verifyTurnstileToken({ token, request, env }) {
  if (!token) return { ok: false, code: "TS_MISSING" };
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || void 0;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form
  });
  const data = await resp.json().catch(() => null);
  if (!data?.success) {
    return { ok: false, code: "TS_INVALID", details: data?.["error-codes"] || [] };
  }
  return { ok: true, data };
}
__name(verifyTurnstileToken, "verifyTurnstileToken");
function getUtcDate() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
__name(getUtcDate, "getUtcDate");
function errorResponse(request, error, status = 400, extra = {}) {
  return new Response(JSON.stringify({
    ok: false,
    error,
    ...extra
  }), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json"
    }
  });
}
__name(errorResponse, "errorResponse");
function calcStealPreview(targetFlames, targetRank) {
  const flames = Number(targetFlames || 0);
  const rank = Number(targetRank || 999999);
  if (flames < MIN_FLAMES_TO_BE_ATTACKABLE) return 0;
  let pct = 8e-3;
  if (rank <= 10) pct = 8e-3;
  else if (rank > 100) pct = 8e-3;
  const raw = Math.floor(flames * pct);
  return Math.max(1, Math.min(MAX_STEAL, raw));
}
__name(calcStealPreview, "calcStealPreview");
function getAttackSuccessRate(targetRank) {
  const rank = Number(targetRank || 999999);
  if (rank <= 10) return 0.5;
  if (rank <= 100) return 0.6;
  return 0.8;
}
__name(getAttackSuccessRate, "getAttackSuccessRate");
function rollAttackSuccess(targetRank) {
  const successRate = getAttackSuccessRate(targetRank);
  return Math.random() < successRate;
}
__name(rollAttackSuccess, "rollAttackSuccess");
async function getDailyAttackRow(db, userId, attackDateUtc) {
  try {
    return await db.prepare(`
      SELECT *
      FROM user_attack_daily
      WHERE user_id = ? AND attack_date_utc = ?
    `).bind(userId, attackDateUtc).first();
  } catch (err) {
    console.error("getDailyAttackRow error", err);
    throw err;
  }
}
__name(getDailyAttackRow, "getDailyAttackRow");
async function getDailyReceiveRow(db, userId, attackDateUtc) {
  try {
    return await db.prepare(`
      SELECT *
      FROM user_attack_received_daily
      WHERE user_id = ? AND attack_date_utc = ?
    `).bind(userId, attackDateUtc).first();
  } catch (err) {
    console.error("getDailyReceiveRow error", err);
    throw err;
  }
}
__name(getDailyReceiveRow, "getDailyReceiveRow");
async function ensureDailyAttackRow(db, userId, attackDateUtc) {
  try {
    await db.prepare(`
      INSERT OR IGNORE INTO user_attack_daily (
        user_id, attack_date_utc, attacks_done, base_attack_limit, extra_attacks_purchased, created_at, updated_at
      )
      VALUES (?, ?, 0, 10, 0, datetime('now'), datetime('now'))
    `).bind(userId, attackDateUtc).run();
  } catch (err) {
    console.error("ensureDailyAttackRow error", err);
    throw err;
  }
}
__name(ensureDailyAttackRow, "ensureDailyAttackRow");
async function ensureDailyReceiveRow(db, userId, attackDateUtc) {
  try {
    await db.prepare(`
      INSERT OR IGNORE INTO user_attack_received_daily (
        user_id, attack_date_utc, attacks_received, receive_attack_limit, created_at, updated_at
      )
      VALUES (?, ?, 0, 10, datetime('now'), datetime('now'))
    `).bind(userId, attackDateUtc).run();
  } catch (err) {
    console.error("ensureDailyReceiveRow error", err);
    throw err;
  }
}
__name(ensureDailyReceiveRow, "ensureDailyReceiveRow");
async function handleAttackTargets(request, env, userId) {
  try {
    const db = env.DB;
    const attackDateUtc = getUtcDate();
    const user = await requireUser(request, env);
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("page_size") || 10)));
    const offset = (page - 1) * pageSize;
    await ensureDailyAttackRow(db, userId, attackDateUtc);
    const myDailyRow = await getDailyAttackRow(db, userId, attackDateUtc);
    const attacksLeftToday = Number(myDailyRow?.base_attack_limit || 10) + Number(myDailyRow?.extra_attacks_purchased || 0) - Number(myDailyRow?.attacks_done || 0);
    const totalRow = await db.prepare(`
      SELECT COUNT(*) AS total
      FROM users
      WHERE total_score >= ?
    `).bind(50).first();
    const playersResult = await db.prepare(`
      SELECT
        users.id,
        users.name,
        users.bird_color,
        users.total_score AS flames,
        users.max_score AS best_score,
        user_attack_received_daily.attacks_received as attacks_received,
        user_attack_received_daily.receive_attack_limit as receive_attack_limit
      FROM users
      LEFT JOIN user_attack_received_daily ON user_attack_received_daily.user_id = users.id AND attack_date_utc = ?
      WHERE users.total_score >= ?
      ORDER BY users.total_score DESC, users.created_at ASC
      LIMIT ? OFFSET ?
    `).bind(attackDateUtc, 50, pageSize, offset).all();
    const rows = playersResult?.results || [];
    const items = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rank = offset + i + 1;
      const attacksReceivedToday = Number(row.attacks_received || 0);
      const receiveLimit = Number(row.receive_attack_limit || 10);
      const stealPreview = calcStealPreview(row.flames, rank);
      const canAttack = attacksLeftToday > 0 && attacksReceivedToday < receiveLimit && row.flames >= MIN_FLAMES_TO_BE_ATTACKABLE && stealPreview > 0 && user.total_score >= MIN_FLAMES_TO_BE_ATTACKABLE;
      items.push({
        user_id: row.id,
        name: row.name,
        bird_color: row.bird_color || "yellow",
        rank,
        flames: Number(row.flames),
        best_score: Number(row.best_score),
        steal_preview: stealPreview,
        attacks_received_today: attacksReceivedToday,
        can_attack: canAttack
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      page,
      page_size: pageSize,
      total: Number(totalRow?.total || 0),
      attacks_left_today: Math.max(0, attacksLeftToday),
      extra_attacks_purchased: myDailyRow?.extra_attacks_purchased,
      items
    }), {
      status: 200,
      headers: { ...corsHeaders(request), "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("handleAttackTargets error", err);
    return errorResponse(request, "ATTACK_TARGETS_FAILED", 500, {
      message: String(err?.message || err)
    });
  }
}
__name(handleAttackTargets, "handleAttackTargets");
async function handleAttackExecute(request, env, userId) {
  try {
    const db = env.DB;
    const attackDateUtc = getUtcDate();
    const body = await request.json();
    const targetUserId = body?.target_user_id;
    if (!targetUserId || targetUserId === userId) {
      return errorResponse(request, "INVALID_TARGET", 400, {
        message: "\u274C Invalid target selected."
      });
    }
    await ensureDailyAttackRow(db, userId, attackDateUtc);
    await ensureDailyAttackRow(db, targetUserId, attackDateUtc);
    await ensureDailyReceiveRow(db, targetUserId, attackDateUtc);
    const myDailyRow = await getDailyAttackRow(db, userId, attackDateUtc);
    const targetReceiveRow = await getDailyReceiveRow(db, targetUserId, attackDateUtc);
    const myLimit = Number(myDailyRow?.base_attack_limit || 10) + Number(myDailyRow?.extra_attacks_purchased || 0);
    const myDone = Number(myDailyRow?.attacks_done || 0);
    if (myDone >= myLimit) {
      return errorResponse(request, "DAILY_ATTACK_LIMIT_REACHED", 400, {
        message: "\u{1F6D1} You have used all your attacks for today."
      });
    }
    const targetReceived = Number(targetReceiveRow?.attacks_received || 0);
    const targetReceiveLimit = Number(targetReceiveRow?.receive_attack_limit || 10);
    if (targetReceived >= targetReceiveLimit) {
      return errorResponse(request, "TARGET_DAILY_RECEIVE_LIMIT_REACHED", 400, {
        message: "\u{1F6E1}\uFE0F This player cannot receive more attacks today."
      });
    }
    const attacker = await db.prepare(`
      SELECT id, name, total_score
      FROM users
      WHERE id = ?
    `).bind(userId).first();
    const target = await db.prepare(`
      SELECT
        id,
        name,
        bird_color,
        total_score,
        ROW_NUMBER() OVER (ORDER BY total_score DESC, created_at ASC) AS rank
      FROM users
      WHERE id = ?
    `).bind(targetUserId).first();
    if (!attacker || !target) {
      return errorResponse(request, "USER_NOT_FOUND", 404, {
        message: "\u{1F464} Target not found."
      });
    }
    const targetFlamesBefore = Number(target.total_score || 0);
    const attackerFlamesBefore = Number(attacker.total_score || 0);
    if (targetFlamesBefore < MIN_FLAMES_TO_BE_ATTACKABLE) {
      return errorResponse(request, "TARGET_TOO_LOW", 400, {
        message: "\u{1F331} This player does not have enough flames to be attacked."
      });
    }
    const stolenPreview = calcStealPreview(targetFlamesBefore, target.rank);
    if (stolenPreview <= 0) {
      return errorResponse(request, "NOTHING_TO_STEAL", 400, {
        message: "\u{1FAB9} There is nothing to steal from this target."
      });
    }
    const success = rollAttackSuccess(target.rank);
    if (!success) {
      await db.prepare(`
        UPDATE user_attack_daily
        SET attacks_done = attacks_done + 1,
            updated_at = datetime('now')
        WHERE user_id = ? AND attack_date_utc = ?
      `).bind(userId, attackDateUtc).run();
      await db.prepare(`
        UPDATE user_attack_received_daily
        SET attacks_received = attacks_received + 1,
            updated_at = datetime('now')
        WHERE user_id = ? AND attack_date_utc = ?
      `).bind(targetUserId, attackDateUtc).run();
      await db.prepare(`
        INSERT INTO attack_logs (
          attacker_user_id,
          target_user_id,
          attack_date_utc,
          result,
          stolen_preview,
          stolen_final,
          target_flames_before,
          target_flames_after,
          attacker_flames_before,
          attacker_flames_after,
          created_at
        )
        VALUES (?, ?, ?, 'miss', ?, 0, ?, ?, ?, ?, datetime('now'))
      `).bind(
        userId,
        targetUserId,
        attackDateUtc,
        stolenPreview,
        targetFlamesBefore,
        targetFlamesBefore,
        attackerFlamesBefore,
        attackerFlamesBefore
      ).run();
      return new Response(JSON.stringify({
        ok: true,
        result: "miss",
        stolen: 0,
        attacker_flames_after: attackerFlamesBefore,
        target_flames_after: targetFlamesBefore,
        attacks_left_today: Math.max(0, myLimit - (myDone + 1)),
        target_name: target.name,
        message: `\u{1F4A8} Your attack failed! ${target.name} escaped this time.`
      }), {
        status: 200,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" }
      });
    }
    const stolenFinal = Math.min(stolenPreview, targetFlamesBefore);
    if (stolenFinal <= 0) {
      return errorResponse(request, "NOTHING_TO_STEAL", 400, {
        message: "\u{1FAB9} There is nothing to steal from this target."
      });
    }
    const targetFlamesAfter = targetFlamesBefore - stolenFinal;
    const attackerFlamesAfter = attackerFlamesBefore + stolenFinal;
    await db.prepare(`
      UPDATE users
      SET total_score = ?
      WHERE id = ?
    `).bind(targetFlamesAfter, targetUserId).run();
    await db.prepare(`
      UPDATE users
      SET total_score = ?
      WHERE id = ?
    `).bind(attackerFlamesAfter, userId).run();
    await db.prepare(`
      UPDATE user_attack_daily
      SET attacks_done = attacks_done + 1,
          updated_at = datetime('now')
      WHERE user_id = ? AND attack_date_utc = ?
    `).bind(userId, attackDateUtc).run();
    await db.prepare(`
      UPDATE user_attack_received_daily
      SET attacks_received = attacks_received + 1,
          updated_at = datetime('now')
      WHERE user_id = ? AND attack_date_utc = ?
    `).bind(targetUserId, attackDateUtc).run();
    await db.prepare(`
      INSERT INTO attack_logs (
        attacker_user_id,
        target_user_id,
        attack_date_utc,
        result,
        stolen_preview,
        stolen_final,
        target_flames_before,
        target_flames_after,
        attacker_flames_before,
        attacker_flames_after,
        created_at
      )
      VALUES (?, ?, ?, 'hit', ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      userId,
      targetUserId,
      attackDateUtc,
      stolenPreview,
      stolenFinal,
      targetFlamesBefore,
      targetFlamesAfter,
      attackerFlamesBefore,
      attackerFlamesAfter
    ).run();
    return new Response(JSON.stringify({
      ok: true,
      result: "hit",
      attacker_flames_after: attackerFlamesAfter,
      target_flames_after: targetFlamesAfter,
      attacks_left_today: Math.max(0, myLimit - (myDone + 1)),
      target_name: target.name,
      stolen: stolenFinal,
      message: `\u{1F525} Successful attack! You stole ${stolenFinal} flames from ${target.name}.`
    }), {
      status: 200,
      headers: { ...corsHeaders(request), "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("handleAttackExecute error", err);
    return errorResponse(request, "ATTACK_EXECUTION_FAILED", 500, {
      message: String(err?.message || err)
    });
  }
}
__name(handleAttackExecute, "handleAttackExecute");
async function handleBuyExtraAttacks(request, env, userId) {
  try {
    const db = env.DB;
    const attackDateUtc = getUtcDate();
    const body = await request.json();
    const quantity = Number(body?.quantity || 5);
    const coinCost = Number(body?.coin_cost || 5);
    if (quantity <= 0 || coinCost <= 0) {
      return errorResponse(request, "INVALID_PURCHASE", 400);
    }
    await ensureDailyAttackRow(db, userId, attackDateUtc);
    const user = await db.prepare(`
      SELECT id, COALESCE(eggs, 0) AS eggs
      FROM users
      WHERE id = ?
    `).bind(userId).first();
    if (!user) {
      return errorResponse(request, "USER_NOT_FOUND", 404);
    }
    const currentCoins = Number(user.eggs || 0);
    if (currentCoins < coinCost) {
      return errorResponse(request, "NOT_ENOUGH_COINS", 400, {
        coins: currentCoins
      });
    }
    const dailyRowTMP = await getDailyAttackRow(db, userId, attackDateUtc);
    const purchased = Number(dailyRowTMP?.extra_attacks_purchased || 0);
    if (purchased > 0) {
      return errorResponse(request, "EXTRA_ALREADY_PURCHASED_TODAY", 400, {
        message: "\u{1F6D1} Extra attacks already purchased today."
      });
    }
    if (currentCoins < EXTRA_ATTACK_COST) {
      return errorResponse(request, "NOT_ENOUGH_COINS", 400, {
        message: "\u{1F4B0} Not enough coins."
      });
    }
    await db.prepare(`
      UPDATE users
      SET eggs = eggs - ?
      WHERE id = ?
    `).bind(coinCost, userId).run();
    await db.prepare(`
      UPDATE user_attack_daily
      SET extra_attacks_purchased = extra_attacks_purchased + ?,
          updated_at = datetime('now')
      WHERE user_id = ? AND attack_date_utc = ?
    `).bind(quantity, userId, attackDateUtc).run();
    const dailyRow = await getDailyAttackRow(db, userId, attackDateUtc);
    const totalLimit = Number(dailyRow?.base_attack_limit || 10) + Number(dailyRow?.extra_attacks_purchased || 0);
    const attacksDone = Number(dailyRow?.attacks_done || 0);
    return new Response(JSON.stringify({
      ok: true,
      bought: quantity,
      cost: coinCost,
      attacks_left_today: Math.max(0, totalLimit - attacksDone)
    }), {
      status: 200,
      headers: { ...corsHeaders(request), "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("handleBuyExtraAttacks error", err);
    return errorResponse(request, "BUY_EXTRA_ATTACKS_FAILED", 500, {
      message: String(err?.message || err)
    });
  }
}
__name(handleBuyExtraAttacks, "handleBuyExtraAttacks");

// ../../../../Users/mverg/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../Users/mverg/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-D8avqh/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../../Users/mverg/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-D8avqh/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
