import { getRankBundle } from "./levels.js";

const PRO_PRICE_USD_CENTS = 350;
const FACE_PRICE_USD_CENTS = 50;
const FLAPPYCOINS_PER_USD = 30000;
const DEFAULT_PRO_PRICE_FLAPPYCOINS = (PRO_PRICE_USD_CENTS / 100) * FLAPPYCOINS_PER_USD;
const SEASON_REWARD_COUNT = 15;
const PI_PRICE_FALLBACK_USD = 0.07499;
const COLLABORATOR_POOL_RATE = 0.10;
const PLATFORM_CONFIG_CACHE_MS = 60000;
const COLLABORATOR_TOP_CACHE_MS = 30000;
const FREE_FACE_IDS = Object.freeze([
  "face_bird",
  "happy_chick",
  "cute_chick",
  "awesome_face",
  "cute_cat_face"
]);
const FACE_CATALOG_IDS = new Set([
  "slick_hero","professor_chick","curly_star","cyber_chick","artist_chick","golden_boss","golden_diva","smart_chick",
  "cr7tiano_pollaldo","don_plumpo","tom_clucks","messi_pio","keanu_wings","rock_a_doodle","brad_peep","taylor_swiftchick",
  "shah_cluck_khan","deepi_ka_pio","salman_cluck","amitabawk","rajini_cluck","allu_a_pollo","prabhens","mahesh_beakbu",
  "vijay_pio","diva_masala","face_bird","happy_chick","cute_chick","space_chick","astronaut_chick","zombie_chick",
  "robot_bird","ninja_bird","stealth_ninja_bird","gold_robot_bird","gold_helmet_bird","gold_mecha_bird","face_calabera",
  "angry_skull","skull_face","face_zombie","devil","awesome_face","cute_cat_face","cat_mask","kiwi_cat_eyes","cute_cry",
  "me_gusta","fem_face_meme","rage_face","face_astronauta","face_ninja","gamer_boy","face_user_1","face_user_2","pi_girl",
  "headset_boy","face_robot","face_robot_2"
]);

/*
  Season dates are explicit and server-authoritative.
  The gap between S6 and S7 is an intentional intermission:
  S6 unclaimed rewards remain claimable until S7 starts.
*/
const DEFAULT_SEASONS = Object.freeze([
  Object.freeze({
    id: "S6",
    name: "SKYFORGE",
    starts_at: Date.parse("2026-08-10T04:00:00.000Z"),
    ends_at: Date.parse("2026-09-09T04:00:00.000Z"),
    pro_usd_cents: PRO_PRICE_USD_CENTS,
    pro_price_flappycoins: DEFAULT_PRO_PRICE_FLAPPYCOINS,
    stars_per_tier: 6,
    status: "ACTIVE",
    rules_pdf_url: null
  }),
  Object.freeze({
    id: "S7",
    name: "NEON ORBIT",
    starts_at: Date.parse("2026-09-16T04:00:00.000Z"),
    ends_at: Date.parse("2026-10-16T04:00:00.000Z"),
    pro_usd_cents: PRO_PRICE_USD_CENTS,
    pro_price_flappycoins: DEFAULT_PRO_PRICE_FLAPPYCOINS,
    stars_per_tier: 6,
    status: "SCHEDULED",
    rules_pdf_url: null
  })
]);

let schemaPromise = null;
let piPriceCache = null;
let seasonConfigCache = null;
let seasonRewardCache = new Map();
let economyConfigCache = null;
let collaboratorTopCache = null;
let collaboratorCycleCache = null;

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
  const values = [
    [6,500,0,1000,0],[12,650,0,1300,1],[18,800,1,1600,2],
    [24,950,0,1900,1],[30,1200,1,2400,2],[36,1400,0,2800,1],
    [42,1600,1,3200,2],[48,1850,1,3700,2],[54,2100,1,4200,2],
    [60,2500,2,5000,4],[66,2800,1,5600,2],[72,3200,2,6400,4],
    [78,3800,2,7600,4],[84,4500,3,9000,6],[90,10000,5,25000,12]
  ];
  return Object.freeze(values.map((value, index) => Object.freeze({
    day: index + 1,
    tier: index + 1,
    target_stars: value[0],
    is_jackpot: index + 1 === SEASON_REWARD_COUNT,
    free: Object.freeze({ coins: value[1], spins: value[2] }),
    pro: Object.freeze({ coins: value[3], spins: value[4] })
  })));
}

const DEFAULT_SEASON_REWARDS = buildSeasonRewards();

function seasonRewardTotals(rewards) {
  return rewards.reduce((acc, row) => {
  acc.free.coins += row.free.coins;
  acc.free.spins += row.free.spins;
  acc.pro.coins += row.pro.coins;
  acc.pro.spins += row.pro.spins;
  return acc;
  }, { free: { coins: 0, spins: 0 }, pro: { coins: 0, spins: 0 } });
}

function normalizeSeasonRow(row) {
  return {
    id: String(row.id),
    name: String(row.name),
    starts_at: Number(row.starts_at),
    ends_at: Number(row.ends_at),
    pro_usd_cents: Number(row.pro_usd_cents || PRO_PRICE_USD_CENTS),
    pro_price_flappycoins: Number(row.pro_price_flappycoins || DEFAULT_PRO_PRICE_FLAPPYCOINS),
    stars_per_tier: Math.max(1, Number(row.stars_per_tier || 6)),
    status: String(row.status || "ACTIVE"),
    rules_pdf_url: row.rules_pdf_url || null
  };
}

function currentMonthCycle(now = Date.now()) {
  const date = new Date(now);
  const startsAt = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const endsAt = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  return {
    id: new Date(startsAt).toISOString().slice(0, 7),
    starts_at: startsAt,
    ends_at: endsAt
  };
}

async function loadSeasonConfigs(env, force = false) {
  const now = Date.now();
  if (!force && seasonConfigCache && seasonConfigCache.expires_at > now) return seasonConfigCache.rows;
  await ensureSchema(env);
  const result = await env.DB.prepare(`
    SELECT id,name,starts_at,ends_at,pro_usd_cents,pro_price_flappycoins,stars_per_tier,status,rules_pdf_url
    FROM platform_seasons
    WHERE status IN ('ACTIVE','SCHEDULED')
    ORDER BY starts_at ASC
  `).all();
  const rows = (result?.results || []).map(normalizeSeasonRow);
  seasonConfigCache = { rows, expires_at: now + PLATFORM_CONFIG_CACHE_MS };
  return rows;
}

async function loadSeasonRewards(env, seasonId, force = false) {
  const key = String(seasonId || "");
  const now = Date.now();
  const cached = seasonRewardCache.get(key);
  if (!force && cached && cached.expires_at > now) return cached.rows;
  const result = await env.DB.prepare(`
    SELECT tier_no,target_stars,free_coins,free_spins,premium_coins,premium_spins,is_jackpot
    FROM season_reward_tiers
    WHERE season_id=? AND enabled=1
    ORDER BY tier_no ASC
  `).bind(key).all();
  const configured = (result?.results || []).map(row => ({
    day: Number(row.tier_no),
    tier: Number(row.tier_no),
    target_stars: Number(row.target_stars),
    is_jackpot: Number(row.is_jackpot || 0) === 1,
    free: { coins: Number(row.free_coins || 0), spins: Number(row.free_spins || 0) },
    pro: { coins: Number(row.premium_coins || 0), spins: Number(row.premium_spins || 0) }
  }));
  const rows = configured.length ? configured : DEFAULT_SEASON_REWARDS.map(row => ({ ...row }));
  seasonRewardCache.set(key, { rows, expires_at: now + PLATFORM_CONFIG_CACHE_MS });
  return rows;
}

async function loadFlappycoinsPerUsd(env, force = false) {
  const now = Date.now();
  if (!force && economyConfigCache && economyConfigCache.expires_at > now) return economyConfigCache.value;
  const row = await env.DB.prepare(`
    SELECT numeric_value,updated_at
    FROM platform_economy_config
    WHERE config_key='flappycoins_per_usd'
    LIMIT 1
  `).first();
  const rate = Math.max(1, Number(row?.numeric_value || FLAPPYCOINS_PER_USD));
  economyConfigCache = {
    value: { rate, updated_at: Number(row?.updated_at || now) },
    expires_at: now + PLATFORM_CONFIG_CACHE_MS
  };
  return economyConfigCache.value;
}

async function quoteSeasonPass(env, season, force = false) {
  const rate = await loadFlappycoinsPerUsd(env, force);
  const usdCents = Number(season?.pro_usd_cents || PRO_PRICE_USD_CENTS);
  return {
    usd_cents: usdCents,
    usd_price: usdCents / 100,
    flappycoins_per_usd: rate.rate,
    price_flappycoins: Math.ceil((usdCents / 100) * rate.rate),
    rate_updated_at: rate.updated_at,
    calculated_at: Date.now()
  };
}

async function quoteFacePrice(env, force = false) {
  const rate = await loadFlappycoinsPerUsd(env, force);
  return {
    usd_cents: FACE_PRICE_USD_CENTS,
    flappycoins_per_usd: rate.rate,
    price_flappycoins: Math.ceil((FACE_PRICE_USD_CENTS / 100) * rate.rate),
    rate_updated_at: rate.updated_at,
    calculated_at: Date.now()
  };
}

async function getSeasonContext(env, now = Date.now()) {
  const seasons = await loadSeasonConfigs(env);
  const active = seasons.find(season => season.starts_at <= now && now < season.ends_at) || null;
  if (active) {
    const index = seasons.indexOf(active);
    const next = seasons[index + 1] || null;
    return { state: "active", season: active, next, claim_deadline: next?.starts_at || null };
  }

  const next = seasons.find(season => season.starts_at > now) || null;
  const previous = [...seasons].reverse().find(season => season.ends_at <= now) || null;

  if (previous && next) {
    return { state: "intermission", season: previous, next, claim_deadline: next.starts_at };
  }

  if (next) {
    return { state: "upcoming", season: next, next, claim_deadline: null };
  }

  return { state: "ended", season: previous || seasons[seasons.length - 1] || null, next: null, claim_deadline: null };
}

function getUnlockedTier(season, rewards, stars, now = Date.now()) {
  if (!season || now < season.starts_at) return 0;
  const earned = Math.max(0, Number(stars || 0));
  return rewards.reduce((count, reward) => count + (earned >= Number(reward.target_stars || 0) ? 1 : 0), 0);
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
  const collaboratorCycle = currentMonthCycle();
  const seasonRewardSeedStatements = [];
  for (const season of DEFAULT_SEASONS) {
    for (const reward of DEFAULT_SEASON_REWARDS) {
      seasonRewardSeedStatements.push(env.DB.prepare(`
        INSERT OR IGNORE INTO season_reward_tiers
        (season_id,tier_no,target_stars,free_coins,free_spins,premium_coins,premium_spins,is_jackpot,enabled,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,1,?,?)
      `).bind(
        season.id, reward.tier, reward.target_stars,
        reward.free.coins, reward.free.spins, reward.pro.coins, reward.pro.spins,
        reward.is_jackpot ? 1 : 0, Date.now(), Date.now()
      ));
    }
  }

  schemaPromise = env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS platform_seasons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      starts_at INTEGER NOT NULL,
      ends_at INTEGER NOT NULL,
      pro_usd_cents INTEGER NOT NULL DEFAULT 350,
      pro_price_flappycoins INTEGER NOT NULL DEFAULT 105000,
      stars_per_tier INTEGER NOT NULL DEFAULT 6,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      rules_pdf_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    ...DEFAULT_SEASONS.map(season => env.DB.prepare(`
      INSERT OR IGNORE INTO platform_seasons
      (id,name,starts_at,ends_at,pro_usd_cents,pro_price_flappycoins,stars_per_tier,status,rules_pdf_url,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      season.id, season.name, season.starts_at, season.ends_at,
      season.pro_usd_cents, season.pro_price_flappycoins, season.stars_per_tier,
      season.status, season.rules_pdf_url, Date.now(), Date.now()
    )),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS season_reward_tiers (
      season_id TEXT NOT NULL,
      tier_no INTEGER NOT NULL,
      target_stars INTEGER NOT NULL,
      free_coins INTEGER NOT NULL DEFAULT 0,
      free_spins INTEGER NOT NULL DEFAULT 0,
      premium_coins INTEGER NOT NULL DEFAULT 0,
      premium_spins INTEGER NOT NULL DEFAULT 0,
      is_jackpot INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (season_id,tier_no)
    )`),
    ...seasonRewardSeedStatements,
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS platform_economy_config (
      config_key TEXT PRIMARY KEY,
      numeric_value REAL NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`
      INSERT OR IGNORE INTO platform_economy_config (config_key,numeric_value,updated_at)
      VALUES ('flappycoins_per_usd',?,?)
    `).bind(FLAPPYCOINS_PER_USD, Date.now()),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS season_passes (
      user_id TEXT NOT NULL,
      season_id TEXT NOT NULL,
      status TEXT NOT NULL,
      payment_id TEXT,
      txid TEXT,
      paid_pi REAL,
      paid_usd_cents INTEGER NOT NULL DEFAULT 350,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, season_id)
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS season_pass_flappycoin_purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      season_id TEXT NOT NULL,
      usd_cents INTEGER NOT NULL,
      flappycoins_per_usd REAL NOT NULL,
      flappycoins_spent INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (user_id,season_id)
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
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_face_unlocks (
      user_id TEXT NOT NULL,
      face_id TEXT NOT NULL,
      purchase_id TEXT NOT NULL UNIQUE,
      usd_cents INTEGER NOT NULL,
      flappycoins_per_usd REAL NOT NULL,
      flappycoins_spent INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, face_id)
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_user_face_unlocks_user ON user_face_unlocks(user_id,created_at DESC)`),
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
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_collaborator_supports_target ON collaborator_supports(collaborator_user_id)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS collaborator_cycles (
      id TEXT PRIMARY KEY,
      starts_at INTEGER NOT NULL,
      ends_at INTEGER NOT NULL,
      recognized_revenue_usd_cents INTEGER NOT NULL DEFAULT 0,
      reward_pool_bps INTEGER NOT NULL DEFAULT 1000,
      reward_pool_usd_cents INTEGER,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      finalized_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS collaborator_monthly_rewards (
      cycle_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rank_no INTEGER NOT NULL,
      supporters INTEGER NOT NULL,
      share_ratio REAL NOT NULL,
      reward_usd_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      payment_reference TEXT,
      created_at INTEGER NOT NULL,
      paid_at INTEGER,
      PRIMARY KEY (cycle_id,user_id)
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_collaborator_rewards_user_cycle ON collaborator_monthly_rewards(user_id,cycle_id)`),
    env.DB.prepare(`
      INSERT OR IGNORE INTO collaborator_cycles
      (id,starts_at,ends_at,recognized_revenue_usd_cents,reward_pool_bps,reward_pool_usd_cents,status,created_at,updated_at)
      VALUES (?,?,?,0,1000,NULL,'ACTIVE',?,?)
    `).bind(
      collaboratorCycle.id,
      collaboratorCycle.starts_at,
      collaboratorCycle.ends_at,
      Date.now(),
      Date.now()
    ),
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
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS game_stage_star_rewards (
      game_uid TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      game_type TEXT NOT NULL,
      level_id INTEGER NOT NULL,
      stars INTEGER NOT NULL,
      performance TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      applied_at INTEGER
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

  piPriceCache = { value: PI_PRICE_FALLBACK_USD, at: now };
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

function seasonPublicPayload(context, rewards, quote, passActive, claimedRows, currentStars, walletCoins, now = Date.now()) {
  const season = context.season;
  const unlockedDay = context.state === "upcoming" ? 0 : getUnlockedTier(season, rewards, currentStars, now);
  const claimed = new Set((claimedRows || []).map(row => `${row.reward_day}:${row.track}`));
  const maxStars = Number(rewards[rewards.length - 1]?.target_stars || 90);

  return {
    id: season?.id || null,
    name: season?.name || null,
    state: context.state,
    starts_at: season?.starts_at || null,
    ends_at: season?.ends_at || null,
    claim_deadline: context.claim_deadline,
    next_season: context.next ? { id: context.next.id, name: context.next.name, starts_at: context.next.starts_at } : null,
    unlocked_day: unlockedDay,
    current_stars: Number(currentStars || 0),
    stars_per_tier: Number(season?.stars_per_tier || 6),
    reward_count: rewards.length,
    max_stars: maxStars,
    pro_active: !!passActive,
    pro_game_access_active: !!passActive && context.state === "active",
    price_usd: quote.usd_price,
    price_flappycoins: quote.price_flappycoins,
    flappycoins_per_usd: quote.flappycoins_per_usd,
    price_calculated_at: quote.calculated_at,
    price_is_estimate: true,
    wallet_flappycoins: Number(walletCoins || 0),
    rewards: rewards.map(row => ({
      ...row,
      unlocked: row.day <= unlockedDay,
      free_claimed: claimed.has(`${row.day}:free`),
      pro_claimed: claimed.has(`${row.day}:pro`)
    })),
    totals: seasonRewardTotals(rewards),
    pro_benefits: ["2X REWARD TRACK", "PRO GAME CONTENT", "NO ADS", "PRO COSMETICS"],
    rules_pdf_url: season?.rules_pdf_url || null
  };
}

async function seasonStatus(env, userId, now = Date.now()) {
  await ensureSchema(env);
  const context = await getSeasonContext(env, now);
  const season = context.season;
  if (!season) return { ok: true, season: null };

  const [pass, claims, starRow, wallet, rewards, quote] = await Promise.all([
    env.DB.prepare(`SELECT status FROM season_passes WHERE user_id = ? AND season_id = ? LIMIT 1`).bind(userId, season.id).first(),
    env.DB.prepare(`SELECT reward_day, track FROM season_reward_claims WHERE user_id = ? AND season_id = ?`).bind(userId, season.id).all(),
    env.DB.prepare(`
      SELECT COALESCE(SUM(stars),0) AS stars
      FROM game_stage_star_rewards
      WHERE user_id=? AND applied_at IS NOT NULL AND created_at>=? AND created_at<?
    `).bind(userId, season.starts_at, season.ends_at).first(),
    env.DB.prepare(`SELECT COALESCE(eggs,0) AS coins FROM users WHERE id=? LIMIT 1`).bind(userId).first(),
    loadSeasonRewards(env, season.id),
    quoteSeasonPass(env, season)
  ]);

  return {
    ok: true,
    server_time: now,
    season: seasonPublicPayload(
      context,
      rewards,
      quote,
      pass?.status === "ACTIVE",
      claims?.results || [],
      Number(starRow?.stars || 0),
      Number(wallet?.coins || 0),
      now
    )
  };
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

  if (url.pathname === "/season/pass/flappycoin-quote" || url.pathname === "/season/pass/flappycoin-buy") {
    return json({ ok: false, code: "PAYMENT_METHOD_DISABLED", payment_method: "PI" }, 410, request, corsHeaders);
  }

  if (request.method === "GET" && url.pathname === "/season/status") {
    return json(await seasonStatus(env, user.id), 200, request, corsHeaders);
  }

  if (request.method === "GET" && url.pathname === "/season/pass/flappycoin-quote") {
    await ensureSchema(env);
    const context = await getSeasonContext(env);
    const season = context.season;
    if (!season || context.state === "ended" || context.state === "intermission") {
      return json({ ok: false, code: "SEASON_PASS_NOT_AVAILABLE" }, 409, request, corsHeaders);
    }
    const [quote, wallet] = await Promise.all([
      quoteSeasonPass(env, season, true),
      env.DB.prepare(`SELECT COALESCE(eggs,0) AS coins FROM users WHERE id=? LIMIT 1`).bind(user.id).first()
    ]);
    return json({
      ok: true,
      season_id: season.id,
      ...quote,
      wallet_flappycoins: Number(wallet?.coins || 0)
    }, 200, request, corsHeaders);
  }

  if (request.method === "GET" && url.pathname === "/season/pass/pi-quote") {
    await ensureSchema(env);
    const context = await getSeasonContext(env);
    const season = context.season;
    if (!season || context.state === "ended" || context.state === "intermission") {
      return json({ ok: false, code: "SEASON_PASS_NOT_AVAILABLE" }, 409, request, corsHeaders);
    }

    const piUsdPrice = await getPiUsdPrice();
    const amount = Number(((Number(season.pro_usd_cents || PRO_PRICE_USD_CENTS) / 100) / piUsdPrice).toFixed(7));
    return json({
      ok: true,
      season_id: season.id,
      amount,
      currency: "PI",
      quoted_at: Date.now(),
      refresh_after_ms: 5 * 60 * 1000
    }, 200, request, corsHeaders);
  }

  if (request.method === "POST" && (url.pathname === "/season/claim" || url.pathname === "/season/claim-all")) {
    await ensureSchema(env);
    const now = Date.now();
    const context = await getSeasonContext(env, now);
    const season = context.season;
    if (!season || context.state === "upcoming" || (context.claim_deadline && now >= context.claim_deadline)) {
      return json({ ok: false, code: "SEASON_REWARDS_EXPIRED" }, 409, request, corsHeaders);
    }

    const [pass, claims, starRow, rewards] = await Promise.all([
      env.DB.prepare(`SELECT status FROM season_passes WHERE user_id = ? AND season_id = ? LIMIT 1`).bind(user.id, season.id).first(),
      env.DB.prepare(`SELECT reward_day,track FROM season_reward_claims WHERE user_id = ? AND season_id = ?`).bind(user.id, season.id).all(),
      env.DB.prepare(`
        SELECT COALESCE(SUM(stars),0) AS stars FROM game_stage_star_rewards
        WHERE user_id=? AND applied_at IS NOT NULL AND created_at>=? AND created_at<?
      `).bind(user.id, season.starts_at, season.ends_at).first(),
      loadSeasonRewards(env, season.id)
    ]);
    const unlockedDay = getUnlockedTier(season, rewards, Number(starRow?.stars || 0), now);
    const proActive = pass?.status === "ACTIVE";
    const claimed = new Set((claims?.results || []).map(row => `${row.reward_day}:${row.track}`));
    let requested = {};
    try { requested = await request.json(); } catch (_) {}

    const rows = [];
    if (url.pathname === "/season/claim-all") {
      for (const row of rewards) {
        if (row.day > unlockedDay) continue;
        if (!claimed.has(`${row.day}:free`)) rows.push({ day: row.day, track: "free", reward: row.free });
        if (proActive && !claimed.has(`${row.day}:pro`)) rows.push({ day: row.day, track: "pro", reward: row.pro });
      }
    } else {
      const day = Number(requested?.day || 0);
      const track = requested?.track === "pro" ? "pro" : "free";
      const row = rewards.find(reward => reward.day === day);
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

  if (request.method === "POST" && url.pathname === "/season/pass/flappycoin-buy") {
    await ensureSchema(env);
    const now = Date.now();
    const context = await getSeasonContext(env, now);
    const season = context.season;
    if (!season || context.state === "ended" || context.state === "intermission") {
      return json({ ok: false, code: "SEASON_PASS_NOT_AVAILABLE" }, 409, request, corsHeaders);
    }

    const quote = await quoteSeasonPass(env, season, true);
    const price = quote.price_flappycoins;
    const existing = await env.DB.prepare(`
      SELECT status FROM season_passes WHERE user_id=? AND season_id=? LIMIT 1
    `).bind(user.id, season.id).first();
    if (existing?.status === "ACTIVE") {
      return json({ ok: false, code: "PRO_ALREADY_ACTIVE", status: await seasonStatus(env, user.id) }, 409, request, corsHeaders);
    }

    const purchaseId = `FLAPPYCOIN:${crypto.randomUUID()}`;
    await env.DB.batch([
      env.DB.prepare(`
        INSERT OR IGNORE INTO season_passes
        (user_id,season_id,status,payment_id,txid,paid_pi,paid_usd_cents,created_at,updated_at)
        SELECT ?,?,'ACTIVE',?,NULL,NULL,?,?,?
        WHERE COALESCE((SELECT eggs FROM users WHERE id=?),0)>=?
      `).bind(user.id, season.id, purchaseId, season.pro_usd_cents, now, now, user.id, price),
      env.DB.prepare(`
        UPDATE users SET eggs=COALESCE(eggs,0)-?
        WHERE id=? AND EXISTS (
          SELECT 1 FROM season_passes WHERE user_id=? AND season_id=? AND payment_id=?
        )
      `).bind(price, user.id, user.id, season.id, purchaseId),
      env.DB.prepare(`
        INSERT OR IGNORE INTO season_pass_flappycoin_purchases
        (id,user_id,season_id,usd_cents,flappycoins_per_usd,flappycoins_spent,created_at)
        SELECT ?,?,?,?,?,?,?
        WHERE EXISTS (
          SELECT 1 FROM season_passes WHERE user_id=? AND season_id=? AND payment_id=?
        )
      `).bind(
        purchaseId, user.id, season.id, quote.usd_cents, quote.flappycoins_per_usd, price, now,
        user.id, season.id, purchaseId
      )
    ]);

    const bought = await env.DB.prepare(`
      SELECT status FROM season_passes WHERE user_id=? AND season_id=? AND payment_id=? LIMIT 1
    `).bind(user.id, season.id, purchaseId).first();
    if (!bought) {
      const wallet = await env.DB.prepare(`SELECT COALESCE(eggs,0) AS coins FROM users WHERE id=? LIMIT 1`).bind(user.id).first();
      return json({
        ok: false,
        code: "INSUFFICIENT_FLAPPYCOINS",
        required_flappycoins: price,
        available_flappycoins: Number(wallet?.coins || 0)
      }, 409, request, corsHeaders);
    }

    return json({
      ok: true,
      completed: true,
      season_id: season.id,
      flappycoins_spent: price,
      quote,
      status: await seasonStatus(env, user.id)
    }, 200, request, corsHeaders);
  }

  if (request.method === "POST" && url.pathname === "/season/pass/pi-create") {
    await ensureSchema(env);
    const context = await getSeasonContext(env);
    const season = context.state === "upcoming" ? context.season : context.season;
    if (!season) return json({ ok: false, code: "NO_SEASON" }, 404, request, corsHeaders);
    if (context.state === "ended" || context.state === "intermission") {
      return json({ ok: false, code: "SEASON_PASS_NOT_AVAILABLE" }, 409, request, corsHeaders);
    }

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
  return json({
    ok:false,
    code:"RANK_REWARDS_MOVED_TO_ARENA",
    claim_endpoint:"/arena-reward/claim"
  }, 410, request, corsHeaders);
}

async function makeCollaboratorCode(env) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `FP-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const row = await env.DB.prepare(`SELECT user_id FROM collaborators WHERE code = ? LIMIT 1`).bind(code).first();
    if (!row) return code;
  }
  throw new Error("COLLABORATOR_CODE_EXHAUSTED");
}

async function ensureUserCollaborator(env, userId) {
  let row = await env.DB.prepare(`SELECT code,status,joined_at FROM collaborators WHERE user_id=? LIMIT 1`).bind(userId).first();
  if (!row) {
    const code = await makeCollaboratorCode(env);
    const now = Date.now();
    await env.DB.prepare(`
      INSERT OR IGNORE INTO collaborators (user_id,code,status,joined_at,updated_at)
      VALUES (?,?,'ACTIVE',?,?)
    `).bind(userId, code, now, now).run();
    row = await env.DB.prepare(`SELECT code,status,joined_at FROM collaborators WHERE user_id=? LIMIT 1`).bind(userId).first();
    collaboratorTopCache = null;
  } else if (row.status !== "ACTIVE") {
    await env.DB.prepare(`UPDATE collaborators SET status='ACTIVE',updated_at=? WHERE user_id=?`).bind(Date.now(), userId).run();
    row.status = "ACTIVE";
    collaboratorTopCache = null;
  }
  return row;
}

async function getUserCollaborator(env, userId) {
  return env.DB.prepare(`
    SELECT code,status,joined_at
    FROM collaborators
    WHERE user_id=?
    LIMIT 1
  `).bind(userId).first();
}

async function loadCollaboratorCycle(env, force = false) {
  const now = Date.now();
  if (!force && collaboratorCycleCache && collaboratorCycleCache.expires_at > now) return collaboratorCycleCache.row;
  const row = await env.DB.prepare(`
    SELECT id,starts_at,ends_at,recognized_revenue_usd_cents,reward_pool_bps,reward_pool_usd_cents,status
    FROM collaborator_cycles
    WHERE starts_at<=? AND ends_at>?
    ORDER BY starts_at DESC LIMIT 1
  `).bind(now, now).first();
  collaboratorCycleCache = { row: row || null, expires_at: now + PLATFORM_CONFIG_CACHE_MS };
  return collaboratorCycleCache.row;
}

async function loadCollaboratorTop(env, force = false) {
  const now = Date.now();
  if (!force && collaboratorTopCache && collaboratorTopCache.expires_at > now) return collaboratorTopCache.rows;
  const result = await env.DB.prepare(`
    SELECT c.user_id,c.code,c.joined_at,u.user_name,u.name,COUNT(s.user_id) AS supporters
    FROM collaborators c
    LEFT JOIN collaborator_supports s ON s.collaborator_user_id=c.user_id
    LEFT JOIN users u ON u.id=c.user_id
    WHERE c.status='ACTIVE'
    GROUP BY c.user_id,c.code,c.joined_at,u.user_name,u.name
    ORDER BY supporters DESC,c.joined_at ASC
    LIMIT 20
  `).all();
  const rows = (result?.results || []).map((row, index) => ({
    ...row,
    rank: index + 1,
    supporters: Number(row.supporters || 0)
  }));
  collaboratorTopCache = { rows, expires_at: now + COLLABORATOR_TOP_CACHE_MS };
  return rows;
}

async function collaboratorStatus(env, userId) {
  await ensureSchema(env);
  const me = await getUserCollaborator(env, userId);
  const [support, supporterCount, top, cycle, rewardHistory] = await Promise.all([
    env.DB.prepare(`
      SELECT s.code,c.status,u.user_name,u.name
      FROM collaborator_supports s
      LEFT JOIN collaborators c ON c.user_id=s.collaborator_user_id
      LEFT JOIN users u ON u.id=s.collaborator_user_id
      WHERE s.user_id=? LIMIT 1
    `).bind(userId).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM collaborator_supports WHERE collaborator_user_id=?`).bind(userId).first(),
    loadCollaboratorTop(env),
    loadCollaboratorCycle(env),
    env.DB.prepare(`
      SELECT cycle_id,rank_no,supporters,share_ratio,reward_usd_cents,status,paid_at
      FROM collaborator_monthly_rewards WHERE user_id=? ORDER BY cycle_id DESC LIMIT 6
    `).bind(userId).all()
  ]);

  const totalSupport = top.reduce((sum, row) => sum + row.supporters, 0);
  const rewardPoolUsdCents = cycle
    ? Number(cycle.reward_pool_usd_cents ?? Math.floor(Number(cycle.recognized_revenue_usd_cents || 0) * Number(cycle.reward_pool_bps || 0) / 10000))
    : 0;
  let myPosition = null;
  if (me?.status === "ACTIVE") {
    const inTop = top.find(row => String(row.user_id) === String(userId));
    if (inTop) {
      myPosition = { rank: inTop.rank, supporters: inTop.supporters, in_top_20: true };
    } else {
      const mySupporters = Number(supporterCount?.count || 0);
      const position = await env.DB.prepare(`
        WITH counts AS (
          SELECT c.user_id,c.joined_at,COUNT(s.user_id) AS supporters
          FROM collaborators c
          LEFT JOIN collaborator_supports s ON s.collaborator_user_id=c.user_id
          WHERE c.status='ACTIVE'
          GROUP BY c.user_id,c.joined_at
        )
        SELECT 1+COALESCE(SUM(CASE
          WHEN supporters>? OR (supporters=? AND joined_at<?) THEN 1 ELSE 0 END),0) AS rank,
          COUNT(*) AS total_collaborators
        FROM counts
      `).bind(mySupporters, mySupporters, Number(me.joined_at || 0)).first();
      myPosition = {
        rank: Number(position?.rank || 1),
        supporters: mySupporters,
        in_top_20: Number(position?.rank || 1) <= 20,
        total_collaborators: Number(position?.total_collaborators || 0)
      };
    }
  }

  return {
    ok: true,
    collaborator: me ? {
      code: me.code,
      status: me.status,
      joined_at: Number(me.joined_at || 0),
      supporters: Number(supporterCount?.count || 0),
      position: myPosition
    } : null,
    supporting: support ? { code: support.code, status: support.status, user_name: support.user_name, name: support.name } : null,
    payout: {
      pool_rate: cycle ? Number(cycle.reward_pool_bps || 0) / 10000 : COLLABORATOR_POOL_RATE,
      top_limit: 20,
      rule: "The configured monthly reward pool is distributed to the Top 20, weighted by unique active supporters.",
      automatic_pi_transfer: false,
      cycle: cycle ? {
        id: cycle.id,
        starts_at: Number(cycle.starts_at),
        ends_at: Number(cycle.ends_at),
        status: cycle.status,
        recognized_revenue_usd_cents: Number(cycle.recognized_revenue_usd_cents || 0),
        reward_pool_bps: Number(cycle.reward_pool_bps || 0),
        reward_pool_usd_cents: rewardPoolUsdCents
      } : null,
      history: rewardHistory?.results || []
    },
    top: top.map(row => ({
      rank: row.rank,
      code: row.code,
      user_name: row.user_name,
      name: row.name,
      supporters: row.supporters,
      share_ratio: totalSupport > 0 ? row.supporters / totalSupport : 0,
      estimated_reward_usd_cents: totalSupport > 0 ? Math.floor(rewardPoolUsdCents * row.supporters / totalSupport) : 0,
      is_current_user: String(row.user_id) === String(userId)
    }))
  };
}

async function routeCollaborators(request, env, helpers, url, user) {
  const { corsHeaders } = helpers;
  if (!url.pathname.startsWith("/collaborators")) return null;
  await ensureSchema(env);

  if (request.method === "POST" && url.pathname === "/collaborators/admin/finalize") {
    const expectedToken = safeText(env.COLLAB_ADMIN_TOKEN, 300);
    const suppliedToken = safeText(request.headers.get("Authorization"), 320).replace(/^Bearer\s+/i, "");
    if (!expectedToken || suppliedToken !== expectedToken) {
      return json({ ok: false, code: "COLLAB_ADMIN_UNAUTHORIZED" }, 403, request, corsHeaders);
    }

    let body = {};
    try { body = await request.json(); } catch (_) {}
    const cycleId = safeText(body?.cycle_id, 20);
    const cycle = cycleId
      ? await env.DB.prepare(`SELECT * FROM collaborator_cycles WHERE id=? LIMIT 1`).bind(cycleId).first()
      : await env.DB.prepare(`SELECT * FROM collaborator_cycles WHERE ends_at<=? ORDER BY ends_at DESC LIMIT 1`).bind(Date.now()).first();
    if (!cycle) return json({ ok: false, code: "COLLAB_CYCLE_NOT_FOUND" }, 404, request, corsHeaders);
    if (Number(cycle.ends_at || 0) > Date.now()) return json({ ok: false, code: "COLLAB_CYCLE_NOT_ENDED" }, 409, request, corsHeaders);
    if (cycle.status === "FINALIZED" || cycle.status === "PAID") {
      return json({ ok: false, code: "COLLAB_CYCLE_ALREADY_FINALIZED" }, 409, request, corsHeaders);
    }

    const top = await loadCollaboratorTop(env, true);
    const totalSupporters = top.reduce((sum, row) => sum + Number(row.supporters || 0), 0);
    const pool = Number(cycle.reward_pool_usd_cents ?? Math.floor(Number(cycle.recognized_revenue_usd_cents || 0) * Number(cycle.reward_pool_bps || 0) / 10000));
    const rewards = top.map(row => {
      const reward = totalSupporters > 0 ? Math.floor(pool * Number(row.supporters || 0) / totalSupporters) : 0;
      return { ...row, reward_usd_cents: reward, share_ratio: totalSupporters > 0 ? Number(row.supporters || 0) / totalSupporters : 0 };
    });
    const allocated = rewards.reduce((sum, row) => sum + row.reward_usd_cents, 0);
    if (totalSupporters > 0 && rewards.length) rewards[0].reward_usd_cents += Math.max(0, pool - allocated);
    const now = Date.now();
    const statements = rewards.map(row => env.DB.prepare(`
      INSERT INTO collaborator_monthly_rewards
      (cycle_id,user_id,rank_no,supporters,share_ratio,reward_usd_cents,status,created_at)
      VALUES (?,?,?,?,?,?,'PENDING',?)
      ON CONFLICT(cycle_id,user_id) DO UPDATE SET
        rank_no=excluded.rank_no,supporters=excluded.supporters,share_ratio=excluded.share_ratio,reward_usd_cents=excluded.reward_usd_cents
    `).bind(cycle.id, row.user_id, row.rank, row.supporters, row.share_ratio, row.reward_usd_cents, now));
    statements.push(env.DB.prepare(`UPDATE collaborator_cycles SET status='FINALIZED',reward_pool_usd_cents=?,finalized_at=?,updated_at=? WHERE id=?`).bind(pool, now, now, cycle.id));
    await env.DB.batch(statements);
    collaboratorCycleCache = null;
    return json({
      ok: true,
      cycle_id: cycle.id,
      reward_pool_usd_cents: pool,
      total_supporters: totalSupporters,
      rewards: rewards.map(row => ({ rank: row.rank, user_id: row.user_id, supporters: row.supporters, reward_usd_cents: row.reward_usd_cents }))
    }, 200, request, corsHeaders);
  }

  if (request.method === "GET" && url.pathname === "/collaborators/status") {
    return json(await collaboratorStatus(env, user.id), 200, request, corsHeaders);
  }

  if (request.method === "POST" && url.pathname === "/collaborators/join") {
    await ensureUserCollaborator(env, user.id);
    return json(await collaboratorStatus(env, user.id), 200, request, corsHeaders);
  }

  if (request.method === "POST" && url.pathname === "/collaborators/toggle") {
    await ensureUserCollaborator(env, user.id);
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
    collaboratorTopCache = null;
    return json(await collaboratorStatus(env, user.id), 200, request, corsHeaders);
  }

  if (request.method === "POST" && url.pathname === "/collaborators/unsupport") {
    await env.DB.prepare(`DELETE FROM collaborator_supports WHERE user_id=?`).bind(user.id).run();
    collaboratorTopCache = null;
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

async function routeFaces(request, env, helpers, url, user) {
  const { corsHeaders } = helpers;
  if (!url.pathname.startsWith("/camera/faces/")) return null;
  await ensureSchema(env);

  if (request.method === "GET" && url.pathname === "/camera/faces/catalog") {
    const [unlocks, wallet, quote] = await Promise.all([
      env.DB.prepare(`SELECT face_id FROM user_face_unlocks WHERE user_id=? ORDER BY created_at ASC`).bind(user.id).all(),
      env.DB.prepare(`SELECT COALESCE(eggs,0) AS coins FROM users WHERE id=? LIMIT 1`).bind(user.id).first(),
      quoteFacePrice(env)
    ]);

    return json({
      ok: true,
      free_face_ids: FREE_FACE_IDS,
      owned_face_ids: (unlocks?.results || []).map(row => String(row.face_id)),
      price_flappycoins: quote.price_flappycoins,
      wallet_flappycoins: Number(wallet?.coins || 0),
      rate_updated_at: quote.rate_updated_at,
      calculated_at: quote.calculated_at
    }, 200, request, corsHeaders);
  }

  if (request.method === "POST" && url.pathname === "/camera/faces/buy") {
    let body = {};
    try { body = await request.json(); } catch (_) {}
    const faceId = safeText(body?.face_id, 64).toLowerCase();
    if (!FACE_CATALOG_IDS.has(faceId)) {
      return json({ ok: false, code: "FACE_NOT_FOUND" }, 404, request, corsHeaders);
    }

    const quote = await quoteFacePrice(env, true);
    const walletRow = await env.DB.prepare(`SELECT COALESCE(eggs,0) AS coins FROM users WHERE id=? LIMIT 1`).bind(user.id).first();
    const walletCoins = Number(walletRow?.coins || 0);

    if (FREE_FACE_IDS.includes(faceId)) {
      return json({
        ok: true,
        face_id: faceId,
        already_owned: true,
        flappycoins_spent: 0,
        wallet_flappycoins: walletCoins
      }, 200, request, corsHeaders);
    }

    const existing = await env.DB.prepare(`SELECT 1 AS owned FROM user_face_unlocks WHERE user_id=? AND face_id=? LIMIT 1`).bind(user.id, faceId).first();
    if (existing) {
      return json({
        ok: true,
        face_id: faceId,
        already_owned: true,
        flappycoins_spent: 0,
        wallet_flappycoins: walletCoins
      }, 200, request, corsHeaders);
    }

    const price = quote.price_flappycoins;
    const purchaseId = `FACE:${crypto.randomUUID()}`;
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare(`
        INSERT OR IGNORE INTO user_face_unlocks
        (user_id,face_id,purchase_id,usd_cents,flappycoins_per_usd,flappycoins_spent,created_at)
        SELECT ?,?,?,?,?,?,?
        WHERE COALESCE((SELECT eggs FROM users WHERE id=?),0)>=?
      `).bind(user.id, faceId, purchaseId, quote.usd_cents, quote.flappycoins_per_usd, price, now, user.id, price),
      env.DB.prepare(`
        UPDATE users SET eggs=COALESCE(eggs,0)-?
        WHERE id=? AND EXISTS (
          SELECT 1 FROM user_face_unlocks WHERE user_id=? AND face_id=? AND purchase_id=?
        )
      `).bind(price, user.id, user.id, faceId, purchaseId)
    ]);

    const bought = await env.DB.prepare(`SELECT 1 AS bought FROM user_face_unlocks WHERE purchase_id=? LIMIT 1`).bind(purchaseId).first();
    if (!bought) {
      const concurrent = await env.DB.prepare(`SELECT 1 AS owned FROM user_face_unlocks WHERE user_id=? AND face_id=? LIMIT 1`).bind(user.id, faceId).first();
      const currentWallet = await env.DB.prepare(`SELECT COALESCE(eggs,0) AS coins FROM users WHERE id=? LIMIT 1`).bind(user.id).first();
      if (concurrent) {
        return json({
          ok: true,
          face_id: faceId,
          already_owned: true,
          flappycoins_spent: 0,
          wallet_flappycoins: Number(currentWallet?.coins || 0)
        }, 200, request, corsHeaders);
      }
      return json({
        ok: false,
        code: "INSUFFICIENT_FLAPPYCOINS",
        required_flappycoins: price,
        available_flappycoins: Number(currentWallet?.coins || 0)
      }, 409, request, corsHeaders);
    }

    const currentWallet = await env.DB.prepare(`SELECT COALESCE(eggs,0) AS coins FROM users WHERE id=? LIMIT 1`).bind(user.id).first();
    return json({
      ok: true,
      face_id: faceId,
      already_owned: false,
      flappycoins_spent: price,
      wallet_flappycoins: Number(currentWallet?.coins || 0)
    }, 200, request, corsHeaders);
  }

  return null;
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
    url.pathname.startsWith("/camera/faces/") ||
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
    const faces = await routeFaces(request, env, { corsHeaders }, url, user);
    if (faces) return faces;
  }

  return routePhotos(request, env, { corsHeaders, normalizeGameId }, url, user);
}
