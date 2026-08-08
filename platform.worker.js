import { getRankBundle } from "./levels.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const PRO_PRICE_USD_CENTS = 499;
const PI_PRICE_FALLBACK_USD = 0.07499;
const COLLABORATOR_POOL_RATE = 0.10;

/*
  Season dates are explicit and server-authoritative.
  The gap between S6 and S7 is an intentional intermission:
  S6 unclaimed rewards remain claimable until S7 starts.
*/
const SEASONS = Object.freeze([
  Object.freeze({
    id: "S6",
    name: "SKYFORGE",
    starts_at: Date.parse("2026-08-10T04:00:00.000Z"),
    ends_at: Date.parse("2026-09-09T04:00:00.000Z"),
    pro_usd_cents: PRO_PRICE_USD_CENTS,
    rules_pdf_url: null
  }),
  Object.freeze({
    id: "S7",
    name: "NEON ORBIT",
    starts_at: Date.parse("2026-09-16T04:00:00.000Z"),
    ends_at: Date.parse("2026-10-16T04:00:00.000Z"),
    pro_usd_cents: PRO_PRICE_USD_CENTS,
    rules_pdf_url: null
  })
]);

let schemaPromise = null;
let piPriceCache = null;

function json(data, status, request, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function safeText(value, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeCode(value) {
  return safeText(value, 32).toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

function buildSeasonRewards() {
  const rewards = [];

  for (let day = 1; day <= 30; day++) {
    let freeCoins = 250;
    let freeSpins = 0;
    let proCoins = 8000;
    let proSpins = day % 5 === 0 ? 1 : 0;

    if (day % 7 === 0) {
      freeCoins = 750;
      freeSpins = 1;
      proCoins = 17000;
      proSpins = 2;
    }

    if (day === 30) {
      freeCoins = 1500;
      freeSpins = 2;
      proCoins = 35000;
      proSpins = 5;
    }

    rewards.push(Object.freeze({
      day,
      free: Object.freeze({ coins: freeCoins, spins: freeSpins }),
      pro: Object.freeze({ coins: proCoins, spins: proSpins })
    }));
  }

  return Object.freeze(rewards);
}

const SEASON_REWARDS = buildSeasonRewards();
const SEASON_TOTALS = Object.freeze(SEASON_REWARDS.reduce((acc, row) => {
  acc.free.coins += row.free.coins;
  acc.free.spins += row.free.spins;
  acc.pro.coins += row.pro.coins;
  acc.pro.spins += row.pro.spins;
  return acc;
}, { free: { coins: 0, spins: 0 }, pro: { coins: 0, spins: 0 } }));

function getSeasonById(id) {
  return SEASONS.find(season => season.id === String(id || "")) || null;
}

function getSeasonContext(now = Date.now()) {
  const active = SEASONS.find(season => season.starts_at <= now && now < season.ends_at) || null;
  if (active) {
    const index = SEASONS.indexOf(active);
    const next = SEASONS[index + 1] || null;
    return { state: "active", season: active, next, claim_deadline: next?.starts_at || null };
  }

  const next = SEASONS.find(season => season.starts_at > now) || null;
  const previous = [...SEASONS].reverse().find(season => season.ends_at <= now) || null;

  if (previous && next) {
    return { state: "intermission", season: previous, next, claim_deadline: next.starts_at };
  }

  if (next) {
    return { state: "upcoming", season: next, next, claim_deadline: null };
  }

  return { state: "ended", season: previous || SEASONS[SEASONS.length - 1], next: null, claim_deadline: null };
}

function getUnlockedDay(season, now = Date.now()) {
  if (!season || now < season.starts_at) return 0;
  if (now >= season.ends_at) return 30;
  return Math.max(1, Math.min(30, Math.floor((now - season.starts_at) / DAY_MS) + 1));
}

function getRankReward(rankValue) {
  const rank = Math.max(2, Math.min(999, Number(rankValue) || 2));
  const base = 250 + Math.min(4750, Math.floor(rank / 25) * 250);

  if (rank % 100 === 0) return { rank, coins: base * 5, spins: 5, milestone: "CENTURY" };
  if (rank % 50 === 0) return { rank, coins: base * 3, spins: 3, milestone: "MAJOR" };
  if (rank % 10 === 0) return { rank, coins: base * 2, spins: 2, milestone: "TEN" };
  if (rank % 5 === 0) return { rank, coins: base, spins: 1, milestone: "FIVE" };
  return { rank, coins: base, spins: 0, milestone: null };
}

function spinStatements(env, { userId, count, source, now }) {
  const statements = [];
  for (let index = 0; index < Math.max(0, Number(count || 0)); index++) {
    statements.push(env.DB.prepare(`
      INSERT INTO spins (id,user_id,game_uid,status,reward_json,created_at,claimed_at,source)
      VALUES (?, ?, NULL, 'PENDING', NULL, ?, NULL, ?)
    `).bind(crypto.randomUUID(), userId, now + index, source));
  }
  return statements;
}

function ensureSchema(env) {
  if (schemaPromise) return schemaPromise;

  schemaPromise = env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS season_passes (
      user_id TEXT NOT NULL,
      season_id TEXT NOT NULL,
      status TEXT NOT NULL,
      payment_id TEXT,
      txid TEXT,
      paid_pi REAL,
      paid_usd_cents INTEGER NOT NULL DEFAULT 499,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, season_id)
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS season_payment_intents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      season_id TEXT NOT NULL,
      expected_pi REAL NOT NULL,
      pi_usd_price REAL NOT NULL,
      status TEXT NOT NULL,
      payment_id TEXT,
      txid TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS season_reward_claims (
      user_id TEXT NOT NULL,
      season_id TEXT NOT NULL,
      reward_day INTEGER NOT NULL,
      track TEXT NOT NULL,
      coins INTEGER NOT NULL,
      spins INTEGER NOT NULL,
      claimed_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, season_id, reward_day, track)
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS rank_reward_claims (
      user_id TEXT NOT NULL,
      rank_no INTEGER NOT NULL,
      coins INTEGER NOT NULL,
      spins INTEGER NOT NULL,
      claimed_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, rank_no)
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS collaborators (
      user_id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      joined_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS collaborator_supports (
      user_id TEXT PRIMARY KEY,
      collaborator_user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS game_photos (
      photo_id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      game_type TEXT NOT NULL,
      stage INTEGER NOT NULL DEFAULT 0,
      total_points INTEGER NOT NULL DEFAULT 0,
      storage_key TEXT NOT NULL UNIQUE,
      content_type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS game_photo_likes (
      photo_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (photo_id, user_id)
    )`)
  ]).catch(error => {
    schemaPromise = null;
    throw error;
  });

  return schemaPromise;
}

async function getPiUsdPrice() {
  const now = Date.now();
  if (piPriceCache && now - piPriceCache.at < 5 * 60 * 1000) return piPriceCache.value;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=usd", { signal: controller.signal });
    clearTimeout(timeout);
    const data = await response.json();
    const value = Number(data?.["pi-network"]?.usd || 0);
    if (response.ok && Number.isFinite(value) && value > 0) {
      piPriceCache = { value, at: now };
      return value;
    }
  } catch (_) {}

  return PI_PRICE_FALLBACK_USD;
}

async function piApi(env, path, options = {}) {
  const apiKey = safeText(env.PI_API_KEY, 300);
  if (!apiKey) throw new Error("PI_API_KEY_NOT_CONFIGURED");

  const response = await fetch(`https://api.minepi.com/v2${path}`, {
    method: options.method || "GET",
    headers: {
      "Authorization": `Key ${apiKey}`,
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error || data?.message || `PI_HTTP_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function seasonPublicPayload(context, passActive, claimedRows, now = Date.now()) {
  const season = context.season;
  const unlockedDay = context.state === "upcoming" ? 0 : getUnlockedDay(season, now);
  const claimed = new Set((claimedRows || []).map(row => `${row.reward_day}:${row.track}`));

  return {
    id: season?.id || null,
    name: season?.name || null,
    state: context.state,
    starts_at: season?.starts_at || null,
    ends_at: season?.ends_at || null,
    claim_deadline: context.claim_deadline,
    next_season: context.next ? { id: context.next.id, name: context.next.name, starts_at: context.next.starts_at } : null,
    unlocked_day: unlockedDay,
    pro_active: !!passActive,
    pro_game_access_active: !!passActive && context.state === "active",
    price_usd: (season?.pro_usd_cents || PRO_PRICE_USD_CENTS) / 100,
    rewards: SEASON_REWARDS.map(row => ({
      ...row,
      unlocked: row.day <= unlockedDay,
      free_claimed: claimed.has(`${row.day}:free`),
      pro_claimed: claimed.has(`${row.day}:pro`)
    })),
    totals: SEASON_TOTALS,
    pro_benefits: ["PRO GAME CONTENT", "NO ADS", "PRO COSMETICS", "PRO REWARD TRACK"],
    rules_pdf_url: season?.rules_pdf_url || null
  };
}

async function seasonStatus(env, userId, now = Date.now()) {
  await ensureSchema(env);
  const context = getSeasonContext(now);
  const season = context.season;
  if (!season) return { ok: true, season: null };

  const [pass, claims] = await Promise.all([
    env.DB.prepare(`SELECT status FROM season_passes WHERE user_id = ? AND season_id = ? LIMIT 1`).bind(userId, season.id).first(),
    env.DB.prepare(`SELECT reward_day, track FROM season_reward_claims WHERE user_id = ? AND season_id = ?`).bind(userId, season.id).all()
  ]);

  return { ok: true, server_time: now, season: seasonPublicPayload(context, pass?.status === "ACTIVE", claims?.results || [], now) };
}

async function claimSeasonRows(env, userId, season, rows) {
  if (!rows.length) return { claimed: [], coins: 0, spins: 0 };
  const now = Date.now();
  const statements = [];
  let coins = 0;
  let spins = 0;

  for (const item of rows) {
    coins += Number(item.reward.coins || 0);
    spins += Number(item.reward.spins || 0);
    statements.push(env.DB.prepare(`
      INSERT INTO season_reward_claims (user_id,season_id,reward_day,track,coins,spins,claimed_at)
      VALUES (?,?,?,?,?,?,?)
    `).bind(userId, season.id, item.day, item.track, item.reward.coins, item.reward.spins, now));
    statements.push(...spinStatements(env, {
      userId,
      count: item.reward.spins,
      source: `season_${season.id}_${item.track}_day_${item.day}`,
      now: now + item.day * 10
    }));
  }

  statements.push(env.DB.prepare(`
    UPDATE users SET eggs = COALESCE(eggs,0) + ?, free_spins = COALESCE(free_spins,0) + ? WHERE id = ?
  `).bind(coins, spins, userId));

  await env.DB.batch(statements);
  return { claimed: rows.map(row => ({ day: row.day, track: row.track, ...row.reward })), coins, spins };
}

async function routeSeason(request, env, helpers, url, user) {
  const { corsHeaders } = helpers;

  if (request.method === "GET" && url.pathname === "/season/status") {
    return json(await seasonStatus(env, user.id), 200, request, corsHeaders);
  }

  if (request.method === "POST" && (url.pathname === "/season/claim" || url.pathname === "/season/claim-all")) {
    await ensureSchema(env);
    const now = Date.now();
    const context = getSeasonContext(now);
    const season = context.season;
    if (!season || context.state === "upcoming" || (context.claim_deadline && now >= context.claim_deadline)) {
      return json({ ok: false, code: "SEASON_REWARDS_EXPIRED" }, 409, request, corsHeaders);
    }

    const unlockedDay = getUnlockedDay(season, now);
    const [pass, claims] = await Promise.all([
      env.DB.prepare(`SELECT status FROM season_passes WHERE user_id = ? AND season_id = ? LIMIT 1`).bind(user.id, season.id).first(),
      env.DB.prepare(`SELECT reward_day,track FROM season_reward_claims WHERE user_id = ? AND season_id = ?`).bind(user.id, season.id).all()
    ]);
    const proActive = pass?.status === "ACTIVE";
    const claimed = new Set((claims?.results || []).map(row => `${row.reward_day}:${row.track}`));
    let requested = {};
    try { requested = await request.json(); } catch (_) {}

    const rows = [];
    if (url.pathname === "/season/claim-all") {
      for (const row of SEASON_REWARDS) {
        if (row.day > unlockedDay) continue;
        if (!claimed.has(`${row.day}:free`)) rows.push({ day: row.day, track: "free", reward: row.free });
        if (proActive && !claimed.has(`${row.day}:pro`)) rows.push({ day: row.day, track: "pro", reward: row.pro });
      }
    } else {
      const day = Number(requested?.day || 0);
      const track = requested?.track === "pro" ? "pro" : "free";
      const row = SEASON_REWARDS[day - 1];
      if (!row || day > unlockedDay) return json({ ok: false, code: "REWARD_NOT_UNLOCKED" }, 409, request, corsHeaders);
      if (track === "pro" && !proActive) return json({ ok: false, code: "PRO_PASS_REQUIRED" }, 403, request, corsHeaders);
      if (claimed.has(`${day}:${track}`)) return json({ ok: false, code: "REWARD_ALREADY_CLAIMED" }, 409, request, corsHeaders);
      rows.push({ day, track, reward: row[track] });
    }

    if (!rows.length) return json({ ok: true, claimed: [], coins: 0, spins: 0, status: await seasonStatus(env, user.id) }, 200, request, corsHeaders);

    try {
      const result = await claimSeasonRows(env, user.id, season, rows);
      return json({ ok: true, ...result, status: await seasonStatus(env, user.id) }, 200, request, corsHeaders);
    } catch (error) {
      if (String(error?.message || "").toLowerCase().includes("unique")) {
        return json({ ok: false, code: "REWARD_ALREADY_CLAIMED", status: await seasonStatus(env, user.id) }, 409, request, corsHeaders);
      }
      throw error;
    }
  }

  if (request.method === "POST" && url.pathname === "/season/pass/pi-create") {
    await ensureSchema(env);
    const context = getSeasonContext();
    const season = context.state === "upcoming" ? context.season : context.season;
    if (!season) return json({ ok: false, code: "NO_SEASON" }, 404, request, corsHeaders);

    const existing = await env.DB.prepare(`SELECT status FROM season_passes WHERE user_id = ? AND season_id = ? LIMIT 1`).bind(user.id, season.id).first();
    if (existing?.status === "ACTIVE") return json({ ok: false, code: "PRO_ALREADY_ACTIVE" }, 409, request, corsHeaders);

    const piUsdPrice = await getPiUsdPrice();
    const amount = Number(((season.pro_usd_cents / 100) / piUsdPrice).toFixed(7));
    const internalId = crypto.randomUUID();
    const now = Date.now();

    await env.DB.prepare(`
      INSERT INTO season_payment_intents (id,user_id,season_id,expected_pi,pi_usd_price,status,expires_at,created_at,updated_at)
      VALUES (?,?,?,?,?,'CREATED',?,?,?)
    `).bind(internalId, user.id, season.id, amount, piUsdPrice, now + 20 * 60 * 1000, now, now).run();

    return json({
      ok: true,
      internal_id: internalId,
      amount,
      real_usd: season.pro_usd_cents / 100,
      pi_usd_price: piUsdPrice,
      memo: `FlappyPi ${season.id} PRO Pass`,
      metadata: {
        type: "SEASON_PASS",
        product_code: `FLAPPYPI_${season.id}_PRO`,
        internal_id: internalId,
        season_id: season.id,
        user_id: user.id
      }
    }, 200, request, corsHeaders);
  }

  if (request.method === "POST" && (url.pathname === "/season/pass/pi-approve" || url.pathname === "/season/pass/pi-complete")) {
    await ensureSchema(env);
    let body = {};
    try { body = await request.json(); } catch (_) { return json({ ok: false, code: "INVALID_JSON" }, 400, request, corsHeaders); }

    const internalId = safeText(body?.internal_id, 80);
    const paymentId = safeText(body?.payment_id, 140);
    const txid = safeText(body?.txid, 160);
    const intent = await env.DB.prepare(`
      SELECT * FROM season_payment_intents WHERE id = ? AND user_id = ? LIMIT 1
    `).bind(internalId, user.id).first();

    if (!intent || !paymentId) return json({ ok: false, code: "PAYMENT_INTENT_NOT_FOUND" }, 404, request, corsHeaders);
    if (Date.now() > Number(intent.expires_at || 0) && intent.status !== "APPROVED") return json({ ok: false, code: "PAYMENT_INTENT_EXPIRED" }, 409, request, corsHeaders);

    const payment = await piApi(env, `/payments/${encodeURIComponent(paymentId)}`);
    const meta = payment?.metadata || {};
    const amount = Number(payment?.amount || 0);
    const amountOk = Math.abs(amount - Number(intent.expected_pi || 0)) <= 0.0000002;
    const metaOk = String(meta.internal_id || meta.internalId || "") === internalId && String(meta.season_id || "") === String(intent.season_id);
    const ownerOk = !payment?.user_uid || String(payment.user_uid) === String(user.id);

    if (!amountOk || !metaOk || !ownerOk) {
      return json({ ok: false, code: "PI_PAYMENT_CONTEXT_MISMATCH" }, 409, request, corsHeaders);
    }

    if (url.pathname.endsWith("pi-approve")) {
      await piApi(env, `/payments/${encodeURIComponent(paymentId)}/approve`, { method: "POST", body: {} });
      await env.DB.prepare(`UPDATE season_payment_intents SET status='APPROVED', payment_id=?, updated_at=? WHERE id=?`).bind(paymentId, Date.now(), internalId).run();
      return json({ ok: true, approved: true }, 200, request, corsHeaders);
    }

    if (!txid) return json({ ok: false, code: "TXID_REQUIRED" }, 400, request, corsHeaders);
    await piApi(env, `/payments/${encodeURIComponent(paymentId)}/complete`, { method: "POST", body: { txid } });
    const verified = await piApi(env, `/payments/${encodeURIComponent(paymentId)}`);
    const completed = verified?.status?.developer_completed === true;
    const verifiedTxid = String(verified?.transaction?.txid || "");
    if (!completed || (verifiedTxid && verifiedTxid !== txid)) return json({ ok: false, code: "PI_PAYMENT_NOT_COMPLETED" }, 409, request, corsHeaders);

    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO season_passes (user_id,season_id,status,payment_id,txid,paid_pi,paid_usd_cents,created_at,updated_at)
        VALUES (?,?,'ACTIVE',?,?,?,?,?,?)
        ON CONFLICT(user_id,season_id) DO UPDATE SET status='ACTIVE',payment_id=excluded.payment_id,txid=excluded.txid,paid_pi=excluded.paid_pi,updated_at=excluded.updated_at
      `).bind(user.id, intent.season_id, paymentId, txid, Number(intent.expected_pi || 0), PRO_PRICE_USD_CENTS, now, now),
      env.DB.prepare(`UPDATE season_payment_intents SET status='COMPLETED',payment_id=?,txid=?,updated_at=? WHERE id=?`).bind(paymentId, txid, now, internalId)
    ]);

    return json({ ok: true, completed: true, season_id: intent.season_id, status: await seasonStatus(env, user.id) }, 200, request, corsHeaders);
  }

  return null;
}

async function routeRankRewards(request, env, helpers, url, user) {
  const { corsHeaders } = helpers;
  if (!url.pathname.startsWith("/rank/rewards")) return null;
  await ensureSchema(env);

  const userRow = await env.DB.prepare(`SELECT COALESCE(total_score,0) AS total_score FROM users WHERE id = ? LIMIT 1`).bind(user.id).first();
  const currentRank = Number(getRankBundle(Number(userRow?.total_score || 0))?.current?.rank || 1);
  const claimedRows = await env.DB.prepare(`SELECT rank_no FROM rank_reward_claims WHERE user_id = ? AND rank_no <= ?`).bind(user.id, currentRank).all();
  const claimedSet = new Set((claimedRows?.results || []).map(row => Number(row.rank_no)));
  const claimable = [];
  for (let rank = 2; rank <= currentRank; rank++) if (!claimedSet.has(rank)) claimable.push(getRankReward(rank));
  const future = [];
  for (let rank = currentRank + 1; rank <= Math.min(999, currentRank + 10); rank++) future.push(getRankReward(rank));

  if (request.method === "GET" && url.pathname === "/rank/rewards") {
    return json({ ok: true, current_rank: currentRank, claimable, future }, 200, request, corsHeaders);
  }

  if (request.method === "POST" && url.pathname === "/rank/rewards/claim-all") {
    if (!claimable.length) return json({ ok: true, claimed: [], coins: 0, spins: 0, future }, 200, request, corsHeaders);
    const now = Date.now();
    const coins = claimable.reduce((sum, reward) => sum + reward.coins, 0);
    const spins = claimable.reduce((sum, reward) => sum + reward.spins, 0);
    const statements = [];

    for (const reward of claimable) {
      statements.push(env.DB.prepare(`INSERT INTO rank_reward_claims (user_id,rank_no,coins,spins,claimed_at) VALUES (?,?,?,?,?)`).bind(user.id, reward.rank, reward.coins, reward.spins, now));
      statements.push(...spinStatements(env, { userId: user.id, count: reward.spins, source: `rank_reward_${reward.rank}`, now: now + reward.rank * 10 }));
    }
    statements.push(env.DB.prepare(`UPDATE users SET eggs=COALESCE(eggs,0)+?, free_spins=COALESCE(free_spins,0)+? WHERE id=?`).bind(coins, spins, user.id));

    try { await env.DB.batch(statements); }
    catch (error) {
      if (!String(error?.message || "").toLowerCase().includes("unique")) throw error;
    }

    return json({ ok: true, claimed: claimable, coins, spins, status: { current_rank: currentRank, claimable: [], future } }, 200, request, corsHeaders);
  }

  return null;
}

async function makeCollaboratorCode(env) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `FP-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const row = await env.DB.prepare(`SELECT user_id FROM collaborators WHERE code = ? LIMIT 1`).bind(code).first();
    if (!row) return code;
  }
  throw new Error("COLLABORATOR_CODE_EXHAUSTED");
}

async function collaboratorStatus(env, userId) {
  await ensureSchema(env);
  const [me, support, supporterCount, topRows] = await Promise.all([
    env.DB.prepare(`SELECT code,status,joined_at FROM collaborators WHERE user_id=? LIMIT 1`).bind(userId).first(),
    env.DB.prepare(`
      SELECT s.code,c.status,u.user_name,u.name
      FROM collaborator_supports s
      LEFT JOIN collaborators c ON c.user_id=s.collaborator_user_id
      LEFT JOIN users u ON u.id=s.collaborator_user_id
      WHERE s.user_id=? LIMIT 1
    `).bind(userId).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM collaborator_supports WHERE collaborator_user_id=?`).bind(userId).first(),
    env.DB.prepare(`
      SELECT c.user_id,c.code,u.user_name,u.name,COUNT(s.user_id) AS supporters
      FROM collaborators c
      LEFT JOIN collaborator_supports s ON s.collaborator_user_id=c.user_id
      LEFT JOIN users u ON u.id=c.user_id
      WHERE c.status='ACTIVE'
      GROUP BY c.user_id,c.code,u.user_name,u.name
      ORDER BY supporters DESC,c.joined_at ASC
      LIMIT 20
    `).all()
  ]);

  const top = (topRows?.results || []).map(row => ({ ...row, supporters: Number(row.supporters || 0) }));
  const totalSupport = top.reduce((sum, row) => sum + row.supporters, 0);

  return {
    ok: true,
    collaborator: me ? { code: me.code, status: me.status, joined_at: Number(me.joined_at || 0), supporters: Number(supporterCount?.count || 0) } : null,
    supporting: support ? { code: support.code, status: support.status, user_name: support.user_name, name: support.name } : null,
    payout: {
      pool_rate: COLLABORATOR_POOL_RATE,
      top_limit: 20,
      rule: "10% of recognized monthly net revenue is distributed to the active Top 20, weighted by active supporters.",
      automatic_pi_transfer: false
    },
    top: top.map((row, index) => ({
      rank: index + 1,
      code: row.code,
      user_name: row.user_name,
      name: row.name,
      supporters: row.supporters,
      share_ratio: totalSupport > 0 ? row.supporters / totalSupport : 0
    }))
  };
}

async function routeCollaborators(request, env, helpers, url, user) {
  const { corsHeaders } = helpers;
  if (!url.pathname.startsWith("/collaborators")) return null;
  await ensureSchema(env);

  if (request.method === "GET" && url.pathname === "/collaborators/status") {
    return json(await collaboratorStatus(env, user.id), 200, request, corsHeaders);
  }

  if (request.method === "POST" && url.pathname === "/collaborators/join") {
    const existing = await env.DB.prepare(`SELECT code,status FROM collaborators WHERE user_id=? LIMIT 1`).bind(user.id).first();
    if (!existing) {
      const code = await makeCollaboratorCode(env);
      const now = Date.now();
      await env.DB.prepare(`INSERT INTO collaborators (user_id,code,status,joined_at,updated_at) VALUES (?,?,'ACTIVE',?,?)`).bind(user.id, code, now, now).run();
    }
    return json(await collaboratorStatus(env, user.id), 200, request, corsHeaders);
  }

  if (request.method === "POST" && url.pathname === "/collaborators/toggle") {
    const row = await env.DB.prepare(`SELECT status FROM collaborators WHERE user_id=? LIMIT 1`).bind(user.id).first();
    if (!row) return json({ ok: false, code: "NOT_A_COLLABORATOR" }, 409, request, corsHeaders);
    const next = row.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    await env.DB.prepare(`UPDATE collaborators SET status=?,updated_at=? WHERE user_id=?`).bind(next, Date.now(), user.id).run();
    return json(await collaboratorStatus(env, user.id), 200, request, corsHeaders);
  }

  if (request.method === "POST" && url.pathname === "/collaborators/support") {
    let body = {};
    try { body = await request.json(); } catch (_) {}
    const code = normalizeCode(body?.code);
    if (!code) return json({ ok: false, code: "CODE_REQUIRED" }, 400, request, corsHeaders);

    const collaborator = await env.DB.prepare(`SELECT user_id,status FROM collaborators WHERE code=? LIMIT 1`).bind(code).first();
    if (!collaborator || collaborator.status !== "ACTIVE") return json({ ok: false, code: "COLLABORATOR_NOT_ACTIVE" }, 404, request, corsHeaders);
    if (String(collaborator.user_id) === String(user.id)) return json({ ok: false, code: "CANNOT_SUPPORT_YOURSELF" }, 409, request, corsHeaders);

    const now = Date.now();
    await env.DB.prepare(`
      INSERT INTO collaborator_supports (user_id,collaborator_user_id,code,created_at,updated_at)
      VALUES (?,?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET collaborator_user_id=excluded.collaborator_user_id,code=excluded.code,updated_at=excluded.updated_at
    `).bind(user.id, collaborator.user_id, code, now, now).run();
    return json(await collaboratorStatus(env, user.id), 200, request, corsHeaders);
  }

  if (request.method === "POST" && url.pathname === "/collaborators/unsupport") {
    await env.DB.prepare(`DELETE FROM collaborator_supports WHERE user_id=?`).bind(user.id).run();
    return json(await collaboratorStatus(env, user.id), 200, request, corsHeaders);
  }

  return null;
}

export async function registerGamePhoto(env, photo) {
  await ensureSchema(env);
  await env.DB.prepare(`
    INSERT OR REPLACE INTO game_photos (photo_id,owner_user_id,game_type,stage,total_points,storage_key,content_type,created_at,views,likes)
    VALUES (?,?,?,?,?,?,?,?,COALESCE((SELECT views FROM game_photos WHERE photo_id=?),0),COALESCE((SELECT likes FROM game_photos WHERE photo_id=?),0))
  `).bind(
    photo.photo_id,
    photo.owner_user_id,
    photo.game_type,
    Number(photo.stage || 0),
    Number(photo.total_points || 0),
    photo.storage_key,
    photo.content_type,
    Number(photo.created_at || Date.now()),
    photo.photo_id,
    photo.photo_id
  ).run();
}

async function routePhotos(request, env, helpers, url, user) {
  const { corsHeaders, normalizeGameId } = helpers;
  if (!url.pathname.startsWith("/game/photos") && !/^\/game\/photo\/[0-9a-f-]{36}\/(?:view|like)$/i.test(url.pathname)) return null;
  await ensureSchema(env);

  if (request.method === "GET" && url.pathname === "/game/photos") {
    const gameType = normalizeGameId(url.searchParams.get("game_type") || "flappy_classic") || "flappy_classic";
    const limit = Math.max(1, Math.min(30, Number(url.searchParams.get("limit") || 6)));
    const rows = await env.DB.prepare(`
      SELECT p.photo_id,p.owner_user_id,p.game_type,p.stage,p.total_points,p.storage_key,p.created_at,p.views,p.likes,
             u.user_name,u.name,
             EXISTS(SELECT 1 FROM game_photo_likes l WHERE l.photo_id=p.photo_id AND l.user_id=?) AS liked
      FROM game_photos p
      LEFT JOIN users u ON u.id=p.owner_user_id
      WHERE p.game_type=?
      ORDER BY p.created_at DESC
      LIMIT ?
    `).bind(user?.id || "", gameType, limit).all();

    return json({
      ok: true,
      game_type: gameType,
      photos: (rows?.results || []).map(row => ({
        photo_id: row.photo_id,
        game_type: row.game_type,
        stage: Number(row.stage || 0),
        total_points: Number(row.total_points || 0),
        created_at: Number(row.created_at || 0),
        views: Number(row.views || 0),
        likes: Number(row.likes || 0),
        liked: Number(row.liked || 0) === 1,
        user_name: row.user_name,
        name: row.name,
        url: `${url.origin}/game/photo/${String(row.storage_key).replace(/^shared\//, "")}`
      }))
    }, 200, request, corsHeaders);
  }

  const match = url.pathname.match(/^\/game\/photo\/([0-9a-f-]{36})\/(view|like)$/i);
  if (!match || request.method !== "POST") return null;
  const photoId = match[1].toLowerCase();
  const action = match[2].toLowerCase();

  if (action === "view") {
    await env.DB.prepare(`UPDATE game_photos SET views=views+1 WHERE photo_id=?`).bind(photoId).run();
    const row = await env.DB.prepare(`SELECT views,likes FROM game_photos WHERE photo_id=? LIMIT 1`).bind(photoId).first();
    if (!row) return json({ ok: false, code: "PHOTO_NOT_FOUND" }, 404, request, corsHeaders);
    return json({ ok: true, views: Number(row.views || 0), likes: Number(row.likes || 0) }, 200, request, corsHeaders);
  }

  if (!user) return json({ ok: false, code: "UNAUTHORIZED" }, 401, request, corsHeaders);
  const existing = await env.DB.prepare(`SELECT 1 AS yes FROM game_photo_likes WHERE photo_id=? AND user_id=? LIMIT 1`).bind(photoId, user.id).first();
  if (existing) {
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM game_photo_likes WHERE photo_id=? AND user_id=?`).bind(photoId, user.id),
      env.DB.prepare(`UPDATE game_photos SET likes=CASE WHEN likes>0 THEN likes-1 ELSE 0 END WHERE photo_id=?`).bind(photoId)
    ]);
  } else {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO game_photo_likes (photo_id,user_id,created_at) VALUES (?,?,?)`).bind(photoId, user.id, Date.now()),
      env.DB.prepare(`UPDATE game_photos SET likes=likes+1 WHERE photo_id=?`).bind(photoId)
    ]);
  }
  const row = await env.DB.prepare(`SELECT views,likes FROM game_photos WHERE photo_id=? LIMIT 1`).bind(photoId).first();
  return json({ ok: true, liked: !existing, views: Number(row?.views || 0), likes: Number(row?.likes || 0) }, 200, request, corsHeaders);
}

export async function routePlatform(request, env, helpers = {}) {
  const url = new URL(request.url);
  const { requireUser, corsHeaders, normalizeGameId = value => safeText(value,64) } = helpers;
  if (typeof requireUser !== "function" || typeof corsHeaders !== "function") return null;

  const platformPath =
    url.pathname.startsWith("/season/") ||
    url.pathname.startsWith("/rank/rewards") ||
    url.pathname.startsWith("/collaborators") ||
    url.pathname === "/game/photos" ||
    /^\/game\/photo\/[0-9a-f-]{36}\/(?:view|like)$/i.test(url.pathname);
  if (!platformPath) return null;

  let user = null;
  try { user = await requireUser(request, env); } catch (_) {}

  /* Photo listing/views may be public; all economy/social mutations require session. */
  const publicPhotoRead = request.method === "GET" && url.pathname === "/game/photos";
  const publicPhotoView = request.method === "POST" && /\/view$/i.test(url.pathname);
  if (!user && !publicPhotoRead && !publicPhotoView) return new Response("Unauthorized", { status: 401, headers: corsHeaders(request) });

  if (user) {
    const season = await routeSeason(request, env, { corsHeaders }, url, user);
    if (season) return season;
    const rank = await routeRankRewards(request, env, { corsHeaders }, url, user);
    if (rank) return rank;
    const collaborators = await routeCollaborators(request, env, { corsHeaders }, url, user);
    if (collaborators) return collaborators;
  }

  return routePhotos(request, env, { corsHeaders, normalizeGameId }, url, user);
}
